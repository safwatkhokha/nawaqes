// --- Auth Routes ---
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../database/index.js';
import { generateToken, authMiddleware, JwtPayload } from '../middleware/auth.js';
import { getDefaultAvatar } from '../utils/serverAvatar.js';

const router = Router();

// In-memory reset tokens (expires after use or 15 minutes)
const resetTokens = new Map<string, { userId: string; expiresAt: number }>();

// Helper: parse JSON fields from user row
function parseUser(row: any) {
  if (!row) return null;
  let interests: any[] = [];
  try { interests = JSON.parse(row.interests || '[]'); } catch { interests = []; }
  let paymentMethods: any[] = [];
  try { paymentMethods = JSON.parse(row.payment_methods || '[]'); } catch { paymentMethods = []; }
  return {
    ...row,
    interests: Array.isArray(interests) ? interests : [],
    payment_methods: Array.isArray(paymentMethods) ? paymentMethods : [],
    is_verified: !!row.is_verified,
    is_admin: !!row.is_admin,
    is_trusted: !!row.is_trusted,
    is_deactivated: !!row.is_deactivated,
    show_phone: !!row.show_phone,
    show_location: !!row.show_location,
    gender: row.gender || 'male',
    password_hash: undefined as any, // excluded from response
    avatar_base64: row.avatar_base64 || undefined,
  };
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, interests, gender, dateOfBirth } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'الاسم والبريد وكلمة المرور مطلوبون' });
      return;
    }
    if (!phone || phone.trim().length < 11) {
      res.status(400).json({ error: 'رقم الهاتف مطلوب ويجب أن يكون 11 رقماً على الأقل' });
      return;
    }
    if (!dateOfBirth) {
      res.status(400).json({ error: 'تاريخ الميلاد مطلوب' });
      return;
    }
    // Validate age (must be at least 13 years old)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 13 || age > 120) {
      res.status(400).json({ error: 'يجب أن يكون عمرك 13 سنة على الأقل' });
      return;
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'صيغة البريد الإلكتروني غير صحيحة' });
      return;
    }
    if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم' });
      return;
    }
    if (name.trim().length < 2) {
      res.status(400).json({ error: 'الاسم يجب أن يكون حرفين على الأقل' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const normalizedPhone = phone.trim();

    // Validate Egyptian phone number format
    const phoneRegex = /^01[0-2,5]{1}[0-9]{8}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      res.status(400).json({ error: 'رقم الهاتف يجب أن يكون رقم مصري صحيح (01xxxxxxxxx)' });
      return;
    }

    // Check if email is already registered
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existingEmail) {
      res.status(409).json({ error: 'هذا البريد مسجل بالفعل' });
      return;
    }

    // Check if phone is already registered by another user
    const existingPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(normalizedPhone);
    if (existingPhone) {
      res.status(409).json({ error: 'رقم الهاتف مسجل بالفعل لمستخدم آخر' });
      return;
    }

    // Note: No need to check email+phone combination separately since we already
    // verified each individually above - if both are unique, the combo is also unique

    const passwordHash = bcrypt.hashSync(password, 12);
    // Generate gender-appropriate avatar using DiceBear
    const avatarSeed = name.trim();
    const userGenderValue = (gender === 'male' || gender === 'female') ? gender : 'male';
    const avatar = getDefaultAvatar(avatarSeed, userGenderValue);

    const userGender = (gender === 'male' || gender === 'female') ? gender : 'male';

    // Add columns if not exists
    try { db.prepare('ALTER TABLE users ADD COLUMN gender TEXT DEFAULT \'male\'').run(); } catch { /* column already exists */ }
    try { db.prepare("ALTER TABLE users ADD COLUMN date_of_birth TEXT DEFAULT ''").run(); } catch { /* column already exists */ }

    db.prepare(`
      INSERT INTO users (name, email, password_hash, avatar, phone, interests, gender, date_of_birth)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name.trim(), normalizedEmail, passwordHash, avatar, normalizedPhone, JSON.stringify(interests || []), userGender, dateOfBirth);

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;
    const token = generateToken({ userId: user.id, email: user.email, isAdmin: !!user.is_admin });

    // ─── Trigger an event backup so new users are saved to HF Datasets ───
    // This prevents user loss if the container is rebuilt before the next periodic backup
    try {
      const { createEventBackup } = await import('../database/backup-system.js');
      createEventBackup('user_registered');
    } catch {}

    res.status(201).json({ user: parseUser(user), token });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إنشاء الحساب', details: err.message });
  }
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
      return;
    }

    if (user.is_deactivated) {
      res.status(403).json({ error: 'هذا الحساب معطل' });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email, isAdmin: !!user.is_admin });
    res.json({ user: parseUser(user), token });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تسجيل الدخول', details: err.message });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'البريد الإلكتروني مطلوب' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(normalizedEmail) as any;

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ message: 'إذا كان البريد مسجلاً، سيتم إرسال رمز إعادة التعيين' });
      return;
    }

    // Generate a 6-digit reset code
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    resetTokens.set(resetCode, { userId: user.id, expiresAt });

    // In production, send this code via email
    // For now, we return it in the response (for development)
    console.log(`[RESET] Password reset code for ${normalizedEmail}: ${resetCode}`);

    res.json({
      message: 'تم إرسال رمز إعادة تعيين كلمة المرور',
      // Only include reset code in development mode (no email infrastructure yet)
      ...(process.env.NODE_ENV !== 'production' && { resetCode }),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إرسال رمز إعادة التعيين', details: err.message });
  }
});

// POST /api/auth/reset-password - Reset password with code
router.post('/reset-password', (req: Request, res: Response) => {
  try {
    const { code, newPassword } = req.body;
    if (!code || !newPassword) {
      res.status(400).json({ error: 'رمز إعادة التعيين وكلمة المرور الجديدة مطلوبان' });
      return;
    }
    if (newPassword.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم' });
      return;
    }

    const tokenData = resetTokens.get(code);
    if (!tokenData || Date.now() > tokenData.expiresAt) {
      resetTokens.delete(code);
      res.status(400).json({ error: 'رمز إعادة التعيين غير صالح أو منتهي الصلاحية' });
      return;
    }

    const newHash = bcrypt.hashSync(newPassword, 12);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, tokenData.userId);

    // Remove used token
    resetTokens.delete(code);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(tokenData.userId) as any;
    const token = generateToken({ userId: user.id, email: user.email, isAdmin: !!user.is_admin });

    res.json({ message: 'تم إعادة تعيين كلمة المرور بنجاح', user: parseUser(user), token });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إعادة تعيين كلمة المرور', details: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
    if (!user) { res.status(404).json({ error: 'المستخدم غير موجود' }); return; }
    res.json(parseUser(user));
  } catch (err: any) {
    // Log the error for debugging but return a proper error response
    console.error('[API] /auth/me error:', err.message);
    res.status(500).json({ error: 'فشل جلب البيانات', details: err.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;

    // Map camelCase frontend keys to snake_case database columns
    const camelToSnake: Record<string, string> = {
      coverPhoto: 'cover_photo',
      showPhone: 'show_phone',
      showLocation: 'show_location',
      avatarBase64: 'avatar_base64',
      paymentMethods: 'payment_methods',
    };

    const allowed = ['name', 'phone', 'location', 'bio', 'show_phone', 'show_location',
      'interests', 'payment_methods', 'avatar_base64', 'avatar', 'cover_photo', 'gender', 'date_of_birth'];

    const updates: string[] = [];
    const values: any[] = [];

    // SQLite INTEGER columns that store boolean values (0/1)
    const booleanColumns = ['show_phone', 'show_location', 'is_verified', 'is_admin', 'is_trusted', 'is_deactivated'];

    for (const [key, value] of Object.entries(req.body)) {
      // Convert camelCase keys to snake_case for database columns
      const dbKey = camelToSnake[key] || key;
      if (allowed.includes(dbKey) && value !== undefined) {
        updates.push(`${dbKey} = ?`);
        // Convert boolean values to 0/1 for SQLite (SQLite doesn't accept JS booleans)
        if (booleanColumns.includes(dbKey) && typeof value === 'boolean') {
          values.push(value ? 1 : 0);
        } else if (typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'لا توجد بيانات للتحديث' });
      return;
    }

    updates.push("updated_at = datetime('now')");
    values.push(payload.userId);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
    res.json(parseUser(user));
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحديث الملف الشخصي', details: err.message });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبتان' });
      return;
    }
    if (newPassword.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير وحرف صغير ورقم' });
      return;
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(payload.userId) as any;
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
      return;
    }

    const newHash = bcrypt.hashSync(newPassword, 12);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, payload.userId);
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تغيير كلمة المرور', details: err.message });
  }
});

// POST /api/auth/send-verification - Send email verification code
router.post('/send-verification', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const user = db.prepare('SELECT email, email_verified FROM users WHERE id = ?').get(payload.userId) as any;
    if (!user) { res.status(404).json({ error: 'المستخدم غير موجود' }); return; }
    if (user.email_verified) { res.status(400).json({ error: 'البريد الإلكتروني مفعل بالفعل' }); return; }

    // Generate 6-digit verification code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    db.prepare("UPDATE users SET email_verification_code = ?, email_verification_expires = ? WHERE id = ?")
      .run(code, expiresAt, payload.userId);

    // In production, send via email service (SMTP/SendGrid/etc.)
    // For now, log it and return in dev mode
    console.log(`[EMAIL-VERIFY] Code for ${user.email}: ${code}`);

    res.json({
      message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
      // Development only: include the code
      ...(process.env.NODE_ENV !== 'production' && { code }),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إرسال رمز التحقق' });
  }
});

// POST /api/auth/verify-email - Verify email with code
router.post('/verify-email', (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ error: 'البريد الإلكتروني والرمز مطلوبان' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = db.prepare('SELECT id, email_verification_code, email_verification_expires FROM users WHERE email = ?').get(normalizedEmail) as any;

    if (!user) { res.status(404).json({ error: 'المستخدم غير موجود' }); return; }
    if (user.email_verification_code !== code) {
      res.status(400).json({ error: 'رمز التحقق غير صحيح' }); return;
    }
    if (user.email_verification_expires && new Date(user.email_verification_expires) < new Date()) {
      res.status(400).json({ error: 'رمز التحقق منتهي الصلاحية' }); return;
    }

    // Mark email as verified
    db.prepare("UPDATE users SET email_verified = 1, email_verification_code = '', email_verification_expires = '', is_verified = 1 WHERE id = ?")
      .run(user.id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    const token = generateToken({ userId: (updatedUser as any).id, email: (updatedUser as any).email, isAdmin: !!(updatedUser as any).is_admin });

    res.json({ message: 'تم تفعيل البريد الإلكتروني بنجاح', user: parseUser(updatedUser), token });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل التحقق من البريد' });
  }
});

export default router;
