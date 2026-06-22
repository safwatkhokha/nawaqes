// ─── Wallet & Transactions Routes ────────────────────────────────────
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../database/index.js';
import { authMiddleware, adminMiddleware, JwtPayload } from '../middleware/auth.js';

const router = Router();

// Maximum charge request amount (EGP)
const MAX_CHARGE_AMOUNT = 50000;
// Maximum withdrawal amount (EGP)
const MAX_WITHDRAW_AMOUNT = 50000;
// Minimum withdrawal amount (EGP)
const MIN_WITHDRAW_AMOUNT = 50;

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

// GET /api/wallet/transactions (with pagination)
router.get('/transactions', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(payload.userId, limit, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?').get(payload.userId) as any;
    res.json({ transactions, total: total.count, limit, offset });
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
    if (amount > MAX_CHARGE_AMOUNT) { res.status(400).json({ error: `الحد الأقصى للشحن ${MAX_CHARGE_AMOUNT.toLocaleString()} ج.م` }); return; }
    if (!receiptImage || receiptImage.trim() === '') { res.status(400).json({ error: 'صورة الإيصال مطلوبة - يرجى رفع صورة إيصال التحويل' }); return; }

    const user = db.prepare('SELECT name, avatar, phone FROM users WHERE id = ?').get(payload.userId) as any;

    // Require phone number for wallet charging
    if (!user.phone || user.phone.trim() === '') {
      res.status(400).json({ error: 'يجب إضافة رقم هاتف لحسابك أولاً لشحن المحفظة' });
      return;
    }

    // Create charging request first to get the ID
    const crId = crypto.randomBytes(16).toString('hex');
    const crResult = db.prepare('INSERT INTO charging_requests (id, user_id, user_name, user_avatar, user_phone, additional_phone, amount, method, receipt_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(crId, payload.userId, user.name, user.avatar, user.phone, additionalPhone || '', amount, method, receiptImage || '');

    // Create transaction linked to this specific charging request
    db.prepare('INSERT INTO transactions (user_id, type, amount, method, status, reference_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(payload.userId, 'charge_request', amount, method, 'pending', crId);

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

    res.status(201).json({ message: 'تم إرسال طلب الشحن بنجاح', requestId: crId });
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

    // ✅ FIX: Find the transaction linked to THIS specific charging request via reference_id
    // Falls back to most recent pending if reference_id not set (backward compatibility)
    let pendingTx = db.prepare("SELECT id FROM transactions WHERE user_id = ? AND type = 'charge_request' AND status = 'pending' AND reference_id = ?").get(cr.user_id, req.params.id) as any;
    if (!pendingTx) {
      // Backward compatibility: if no reference_id match, find most recent pending
      pendingTx = db.prepare("SELECT id FROM transactions WHERE user_id = ? AND type = 'charge_request' AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(cr.user_id) as any;
    }
    if (pendingTx) {
      db.prepare("UPDATE transactions SET status = 'approved' WHERE id = ?").run(pendingTx.id);
    }

    // Add to wallet balance
    db.prepare("UPDATE users SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?")
      .run(cr.amount, cr.user_id);

    // Create deposit transaction linked to this charging request
    db.prepare('INSERT INTO transactions (user_id, type, amount, method, status, reference_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(cr.user_id, 'deposit', cr.amount, cr.method, 'completed', req.params.id);

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

    // ✅ FIX: Find the transaction linked to THIS specific charging request via reference_id
    let pendingTx = db.prepare("SELECT id FROM transactions WHERE user_id = ? AND type = 'charge_request' AND status = 'pending' AND reference_id = ?").get(cr.user_id, req.params.id) as any;
    if (!pendingTx) {
      // Backward compatibility: if no reference_id match, find most recent pending
      pendingTx = db.prepare("SELECT id FROM transactions WHERE user_id = ? AND type = 'charge_request' AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(cr.user_id) as any;
    }
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

// ─── Withdrawal Routes (DISABLED — charge-only wallet policy) ──────
// Per product decision (2026-06-22): the wallet is for internal use only
// (charging for promotions, savings goals, gifts). Users cannot withdraw
// funds back to their bank/wallet. Any existing pending withdrawal
// requests can still be processed by admins via the admin endpoints below.

// POST /api/wallet/withdraw — DISABLED (returns 403)
router.post('/withdraw', authMiddleware, (req: Request, res: Response) => {
  res.status(403).json({
    error: 'ميزة السحب غير متاحة حالياً. المحفظة مخصصة للاستخدام الداخلي فقط (الترويج، أهداف التوفير، الهدايا).',
    code: 'WITHDRAWAL_DISABLED'
  });
});

// GET /api/wallet/withdrawals
router.get('/withdrawals', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const userId = payload.userId;
    const withdrawals = db.prepare(`
      SELECT w.*, u.name as user_name, u.avatar as user_avatar, u.phone as user_phone
      FROM withdrawal_requests w
      JOIN users u ON u.id = w.user_id
      WHERE w.user_id = ? OR ? = 1
      ORDER BY w.created_at DESC
    `).all(userId, payload.isAdmin ? 1 : 0) as any[];
    res.json(withdrawals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/withdrawals/:id/:action (approve/reject)
router.post('/withdrawals/:id/:action', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const action = req.params.action; // 'approve' or 'reject'
    const { adminNote } = req.body;
    const withdrawal = db.prepare('SELECT * FROM withdrawal_requests WHERE id = ?').get(id) as any;
    if (!withdrawal) { res.status(404).json({ error: 'طلب السحب غير موجود' }); return; }
    if (withdrawal.status !== 'pending') { res.status(400).json({ error: 'تم معالجة هذا الطلب بالفعل' }); return; }

    if (action === 'approve') {
      db.prepare('UPDATE withdrawal_requests SET status = ?, admin_note = ?, processed_at = datetime(\'now\') WHERE id = ?').run('approved', adminNote || '', id);
      // Update the specific transaction linked to this withdrawal via reference_id
      const tx = db.prepare("SELECT id FROM transactions WHERE user_id = ? AND type = 'withdrawal' AND status = 'pending' AND reference_id = ?").get(withdrawal.user_id, id) as any;
      if (tx) {
        db.prepare("UPDATE transactions SET status = 'completed' WHERE id = ?").run(tx.id);
      } else {
        // Backward compatibility
        db.prepare("UPDATE transactions SET status = 'completed' WHERE user_id = ? AND type = 'withdrawal' AND method = ? AND status = 'pending'").run(withdrawal.user_id, withdrawal.method);
      }
    } else if (action === 'reject') {
      db.prepare('UPDATE withdrawal_requests SET status = ?, admin_note = ?, processed_at = datetime(\'now\') WHERE id = ?').run('rejected', adminNote || '', id);
      // Refund the balance
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ?, updated_at = datetime(\'now\') WHERE id = ?').run(withdrawal.amount, withdrawal.user_id);
      // Update the transaction status
      const tx = db.prepare("SELECT id FROM transactions WHERE user_id = ? AND type = 'withdrawal' AND status = 'pending' AND reference_id = ?").get(withdrawal.user_id, id) as any;
      if (tx) {
        db.prepare("UPDATE transactions SET status = 'failed' WHERE id = ?").run(tx.id);
      } else {
        db.prepare("UPDATE transactions SET status = 'failed' WHERE user_id = ? AND type = 'withdrawal' AND method = ? AND status = 'pending'").run(withdrawal.user_id, withdrawal.method);
      }
    } else {
      res.status(400).json({ error: 'إجراء غير صالح' }); return;
    }

    // Notify user
    const msg = action === 'approve'
      ? `تم الموافقة على طلب السحب بقيمة ${withdrawal.amount.toLocaleString()} ج.م`
      : `تم رفض طلب السحب بقيمة ${withdrawal.amount.toLocaleString()} ج.م${adminNote ? ': ' + adminNote : ''}`;
    db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)').run(
      withdrawal.user_id, 'payment', msg, '/wallet'
    );

    // Broadcast wallet update to user
    try {
      const wsManager = (req.app as any).locals?.wsManager;
      if (wsManager) {
        wsManager.sendToUser(withdrawal.user_id, { type: "wallet:updated", data: { userId: withdrawal.user_id } });
      }
    } catch {}

    res.json({ success: true, action });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Savings Goals API ──────────────────────────────────────────────

// GET /api/wallet/savings-goals
router.get('/savings-goals', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const goals = db.prepare('SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC').all(payload.userId);
    res.json(goals);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب أهداف التوفير', details: err.message });
  }
});

// POST /api/wallet/savings-goals
router.post('/savings-goals', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { name, target, deadline } = req.body;
    if (!name || !target || target <= 0) {
      res.status(400).json({ error: 'اسم الهدف والمبلغ المستهدف مطلوبان' }); return;
    }
    const id = crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, payload.userId, name.trim(), target, 0, deadline || null
    );
    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id);
    res.status(201).json(goal);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إنشاء هدف التوفير', details: err.message });
  }
});

// PUT /api/wallet/savings-goals/:id
router.put('/savings-goals/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { name, target, current, deadline } = req.body;
    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(req.params.id, payload.userId) as any;
    if (!goal) { res.status(404).json({ error: 'الهدف غير موجود' }); return; }

    const newName = name !== undefined ? name : goal.name;
    const newTarget = target !== undefined ? target : goal.target_amount;
    const newCurrent = current !== undefined ? current : goal.current_amount;
    const newDeadline = deadline !== undefined ? deadline : goal.deadline;

    db.prepare('UPDATE savings_goals SET name = ?, target_amount = ?, current_amount = ?, deadline = ? WHERE id = ?').run(
      newName, newTarget, newCurrent, newDeadline, req.params.id
    );
    const updated = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحديث هدف التوفير', details: err.message });
  }
});

// POST /api/wallet/savings-goals/:id/add
router.post('/savings-goals/:id/add', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { amount } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر' }); return; }

    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(req.params.id, payload.userId) as any;
    if (!goal) { res.status(404).json({ error: 'الهدف غير موجود' }); return; }

    // ─── Check wallet balance ──────────────────────────────────────
    const user = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(payload.userId) as any;
    if (!user || user.wallet_balance < amount) {
      res.status(400).json({ error: 'رصيد المحفظة غير كافٍ لإضافة هذا المبلغ للهدف' });
      return;
    }

    // ─── Deduct from wallet balance ────────────────────────────────
    db.prepare("UPDATE users SET wallet_balance = wallet_balance - ?, updated_at = datetime('now') WHERE id = ?")
      .run(amount, payload.userId);

    // ─── Add to savings goal (capped at target) ────────────────────
    const newCurrent = Math.min(goal.current_amount + amount, goal.target_amount);
    db.prepare('UPDATE savings_goals SET current_amount = ? WHERE id = ?').run(newCurrent, req.params.id);

    // ─── Create transaction record ─────────────────────────────────
    const txId = crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO transactions (id, user_id, type, amount, method, status, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      txId, payload.userId, 'savings_debit', amount, 'wallet', 'completed', req.params.id
    );

    // ─── Notify user ───────────────────────────────────────────────
    db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)').run(
      payload.userId, 'payment', `تم إضافة ${Number(amount).toLocaleString()} ج.م لهدف "${goal.name}"`, '/wallet'
    );

    // ─── Broadcast wallet update ───────────────────────────────────
    try {
      const wsManager = (req.app as any).locals?.wsManager;
      if (wsManager) {
        wsManager.sendToUser(payload.userId, { type: "wallet:updated", data: { userId: payload.userId, amount: -amount } });
      }
    } catch {}

    const updated = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إضافة المبلغ لهدف التوفير', details: err.message });
  }
});

// POST /api/wallet/savings-goals/:id/withdraw — Move money from goal back to wallet
router.post('/savings-goals/:id/withdraw', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { amount } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ error: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر' }); return; }

    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(req.params.id, payload.userId) as any;
    if (!goal) { res.status(404).json({ error: 'الهدف غير موجود' }); return; }

    if (amount > goal.current_amount) {
      res.status(400).json({ error: `لا يمكن سحب أكثر من المبلغ المُدَّخر (${goal.current_amount.toLocaleString()} ج.م)` });
      return;
    }

    // ─── Deduct from goal ──────────────────────────────────────────
    const newCurrent = goal.current_amount - amount;
    db.prepare('UPDATE savings_goals SET current_amount = ? WHERE id = ?').run(newCurrent, req.params.id);

    // ─── Add to wallet balance ─────────────────────────────────────
    db.prepare("UPDATE users SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?")
      .run(amount, payload.userId);

    // ─── Create transaction record ─────────────────────────────────
    const txId = crypto.randomBytes(16).toString('hex');
    db.prepare('INSERT INTO transactions (id, user_id, type, amount, method, status, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      txId, payload.userId, 'savings_refund', amount, 'wallet', 'completed', req.params.id
    );

    // ─── Notify user ───────────────────────────────────────────────
    db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)').run(
      payload.userId, 'payment', `تم سحب ${Number(amount).toLocaleString()} ج.م من هدف "${goal.name}" إلى محفظتك`, '/wallet'
    );

    // ─── Broadcast wallet update ───────────────────────────────────
    try {
      const wsManager = (req.app as any).locals?.wsManager;
      if (wsManager) {
        wsManager.sendToUser(payload.userId, { type: "wallet:updated", data: { userId: payload.userId, amount } });
      }
    } catch {}

    const updated = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل سحب المبلغ من هدف التوفير', details: err.message });
  }
});

// DELETE /api/wallet/savings-goals/:id — Refund remaining balance to wallet
router.delete('/savings-goals/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(req.params.id, payload.userId) as any;
    if (!goal) { res.status(404).json({ error: 'الهدف غير موجود' }); return; }

    // ─── Refund remaining balance to wallet ────────────────────────
    if (goal.current_amount > 0) {
      db.prepare("UPDATE users SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?")
        .run(goal.current_amount, payload.userId);

      const txId = crypto.randomBytes(16).toString('hex');
      db.prepare('INSERT INTO transactions (id, user_id, type, amount, method, status, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        txId, payload.userId, 'savings_refund', goal.current_amount, 'wallet', 'completed', req.params.id
      );

      db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)').run(
        payload.userId, 'payment', `تم استرداد ${goal.current_amount.toLocaleString()} ج.م من حذف هدف "${goal.name}"`, '/wallet'
      );

      try {
        const wsManager = (req.app as any).locals?.wsManager;
        if (wsManager) {
          wsManager.sendToUser(payload.userId, { type: "wallet:updated", data: { userId: payload.userId, amount: goal.current_amount } });
        }
      } catch {}
    }

    const result = db.prepare('DELETE FROM savings_goals WHERE id = ? AND user_id = ?').run(req.params.id, payload.userId);
    if (result.changes === 0) { res.status(404).json({ error: 'الهدف غير موجود' }); return; }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل حذف هدف التوفير', details: err.message });
  }
});

export default router;
