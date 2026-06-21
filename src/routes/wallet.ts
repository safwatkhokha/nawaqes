// ─── Wallet & Transactions Routes ────────────────────────────────────
import { Router, Request, Response } from 'express';
import db from '../database/index.js';
import { authMiddleware, adminMiddleware, JwtPayload } from '../middleware/auth.js';

const router = Router();

// GET /api/wallet/balance
router.get('/balance', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const user = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(payload.userId) as any;
    res.json({ balance: user?.wallet_balance || 0 });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب الرصيد', details: err.message });
  }
});

// GET /api/wallet/transactions
router.get('/transactions', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC').all(payload.userId);
    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب المعاملات', details: err.message });
  }
});

// POST /api/wallet/charge-request
router.post('/charge-request', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { amount, method, receiptImage, additionalPhone } = req.body;
    if (!amount || !method) { res.status(400).json({ error: 'المبلغ وطريقة الدفع مطلوبان' }); return; }
    if (amount <= 0) { res.status(400).json({ error: 'المبلغ يجب أن يكون أكبر من صفر' }); return; }
    if (!receiptImage || receiptImage.trim() === '') { res.status(400).json({ error: 'صورة الإيصال مطلوبة - يرجى رفع صورة إيصال التحويل' }); return; }

    const user = db.prepare('SELECT name, avatar, phone FROM users WHERE id = ?').get(payload.userId) as any;

    // Require phone number for wallet charging
    if (!user.phone || user.phone.trim() === '') {
      res.status(400).json({ error: 'يجب إضافة رقم هاتف لحسابك أولاً لشحن المحفظة' });
      return;
    }

    db.prepare('INSERT INTO transactions (user_id, type, amount, method, status) VALUES (?, ?, ?, ?, ?)')
      .run(payload.userId, 'charge_request', amount, method, 'pending');

    const result = db.prepare('INSERT INTO charging_requests (user_id, user_name, user_avatar, user_phone, additional_phone, amount, method, receipt_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(payload.userId, user.name, user.avatar, user.phone, additionalPhone || '', amount, method, receiptImage || '');

    // ─── Notify the user that their charge request was submitted ───
    db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)')
      .run(payload.userId, 'payment', `تم إرسال طلب شحن ${Number(amount).toLocaleString()} ج.م وسيتم مراجعته من الإدارة`, '/wallet');

    // ─── Notify all admins about the new charge request ───
    const hasReceipt = receiptImage && receiptImage.trim() !== '';
    const phoneInfo = additionalPhone && additionalPhone.trim() !== ''
      ? `${user.phone} / رقم آخر: ${additionalPhone}`
      : user.phone;
    const adminMessage = hasReceipt
      ? `طلب شحن جديد من ${user.name} (${phoneInfo}) بمبلغ ${Number(amount).toLocaleString()} ج.م عبر ${method} مع صورة إيصال`
      : `طلب شحن جديد من ${user.name} (${phoneInfo}) بمبلغ ${Number(amount).toLocaleString()} ج.م عبر ${method} بدون صورة إيصال`;

    const admins = db.prepare('SELECT id FROM users WHERE is_admin = 1').all() as any[];
    const insertNotif = db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)');
    for (const admin of admins) {
      insertNotif.run(admin.id, 'payment', adminMessage, '/admin/charging');
    }

    res.status(201).json({ message: 'تم إرسال طلب الشحن بنجاح', requestId: result.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إرسال طلب الشحن', details: err.message });
  }
});

// ─── Admin: Charging Requests ────────────────────────────────────────

// GET /api/wallet/admin/charging-requests
router.get('/admin/charging-requests', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  try {
    const requests = db.prepare('SELECT * FROM charging_requests ORDER BY created_at DESC').all();
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب طلبات الشحن', details: err.message });
  }
});

// POST /api/wallet/admin/charging-requests/:id/approve
router.post('/admin/charging-requests/:id/approve', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  try {
    const cr = db.prepare('SELECT * FROM charging_requests WHERE id = ?').get(req.params.id) as any;
    if (!cr) { res.status(404).json({ error: 'الطلب غير موجود' }); return; }
    if (cr.status !== 'pending') { res.status(400).json({ error: 'تم معالجة هذا الطلب بالفعل' }); return; }

    // Update charging request status
    db.prepare("UPDATE charging_requests SET status = 'approved' WHERE id = ?").run(req.params.id);

    // Update the most recent pending charge_request transaction
    // SQLite doesn't support ORDER BY + LIMIT in UPDATE, so we find the ID first
    const pendingTx = db.prepare("SELECT id FROM transactions WHERE user_id = ? AND type = 'charge_request' AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(cr.user_id) as any;
    if (pendingTx) {
      db.prepare("UPDATE transactions SET status = 'approved' WHERE id = ?").run(pendingTx.id);
    }

    // Add to wallet balance
    db.prepare("UPDATE users SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?")
      .run(cr.amount, cr.user_id);

    // Create deposit transaction
    db.prepare('INSERT INTO transactions (user_id, type, amount, method, status) VALUES (?, ?, ?, ?, ?)')
      .run(cr.user_id, 'deposit', cr.amount, cr.method, 'completed');

    // Create notification
    db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)')
      .run(cr.user_id, 'payment', `تم شحن ${cr.amount.toLocaleString()} ج.م في محفظتك بنجاح`, '/wallet');

    // 🔧 BROADCAST to user to refresh wallet
    try {
      const wsManager = (req.app as any).locals?.wsManager;
      if (wsManager) {
        wsManager.sendToUser(cr.user_id, { type: "wallet:updated", data: { userId: cr.user_id, amount: cr.amount } });
      }
    } catch {}

    res.json({ message: "تم الموافقة على طلب الشحن" });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل الموافقة على الطلب', details: err.message });
  }
});

// POST /api/wallet/admin/charging-requests/:id/reject
router.post('/admin/charging-requests/:id/reject', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  try {
    const cr = db.prepare('SELECT * FROM charging_requests WHERE id = ?').get(req.params.id) as any;
    if (!cr) { res.status(404).json({ error: 'الطلب غير موجود' }); return; }

    db.prepare("UPDATE charging_requests SET status = 'rejected' WHERE id = ?").run(req.params.id);
    // Update the most recent pending charge_request transaction
    // SQLite doesn't support ORDER BY + LIMIT in UPDATE, so we find the ID first
    const pendingTx = db.prepare("SELECT id FROM transactions WHERE user_id = ? AND type = 'charge_request' AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(cr.user_id) as any;
    if (pendingTx) {
      db.prepare("UPDATE transactions SET status = 'rejected' WHERE id = ?").run(pendingTx.id);
    }

    db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)')
      .run(cr.user_id, 'payment', `تم رفض طلب شحن ${cr.amount.toLocaleString()} ج.م`, '/wallet');

    res.json({ message: 'تم رفض طلب الشحن' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل رفض الطلب', details: err.message });
  }
});

export default router;
