// ─── Chat / Messages Routes ─────────────────────────────────────────
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from '../database/index.js';
import { authMiddleware, JwtPayload } from '../middleware/auth.js';

const router = Router();

// ─── Chat Image Upload Setup ────────────────────────────────────────
const chatImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.resolve('uploads/chat');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});
const chatImageUpload = multer({
  storage: chatImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    // Accept all image formats
    const allowedExt = /jpeg|jpg|png|gif|webp|bmp|svg|tiff|tif|avif|heic|heif|ico|jfif|pjpeg|pjp/;
    const allowedMime = /^image\//; // Accept any image/* MIME type
    const ext = allowedExt.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedMime.test(file.mimetype);
    cb(null, ext || mime);
  },
});

// GET /api/chat/contacts
router.get('/contacts', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const userId = payload.userId;

    // Get all users who have exchanged messages with current user
    const contacts = db.prepare(`
      SELECT DISTINCT
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as contact_id,
        u.name, u.avatar, u.is_verified
      FROM chat_messages cm
      JOIN users u ON u.id = CASE WHEN cm.sender_id = ? THEN cm.receiver_id ELSE cm.sender_id END
      WHERE sender_id = ? OR receiver_id = ?
      ORDER BY cm.created_at DESC
    `).all(userId, userId, userId, userId) as any[];

    const enriched = contacts.map(c => {
      const lastMsg = db.prepare(`
        SELECT text, message_type, created_at FROM chat_messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at DESC LIMIT 1
      `).get(userId, c.contact_id, c.contact_id, userId) as any;

      const unread = db.prepare(`
        SELECT COUNT(*) as count FROM chat_messages
        WHERE sender_id = ? AND receiver_id = ? AND read = 0
      `).get(c.contact_id, userId) as any;

      let lastMessageText = lastMsg?.text || '';
      if (lastMsg?.message_type === 'image') {
        lastMessageText = '📷 صورة';
      }

      return {
        id: c.contact_id,
        name: c.name,
        avatar: c.avatar,
        isVerified: !!c.is_verified,
        lastMessage: lastMessageText,
        lastTime: lastMsg?.created_at || '',
        unread: unread?.count || 0,
        online: (req.app.locals as any).wsManager?.isUserOnline(c.contact_id) || false,
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب جهات الاتصال', details: err.message });
  }
});

// GET /api/chat/messages/:contactId
router.get('/messages/:contactId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { contactId } = req.params;
    const { limit = '50', before } = req.query;

    let query = `
      SELECT * FROM chat_messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `;
    const params: any[] = [payload.userId, contactId, contactId, payload.userId];

    if (before) { query += ' AND created_at < ?'; params.push(before as string); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit as string));

    const messages = db.prepare(query).all(...params).reverse();

    // Filter out messages deleted for the current user
    const filteredMessages = messages.filter((m: any) => {
      if (!m.deleted_for) return true;
      const deletedForUsers = m.deleted_for.split(',').map((id: string) => id.trim()).filter(Boolean);
      return !deletedForUsers.includes(payload.userId);
    });

    // Mark as read
    db.prepare('UPDATE chat_messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0')
      .run(contactId, payload.userId);

    res.json(filteredMessages);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب الرسائل', details: err.message });
  }
});

// POST /api/chat/send
router.post('/send', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { receiverId, text, postId, messageType, imageUrl, replyToId } = req.body;

    const msgType = messageType || 'text';

    if (!receiverId) {
      res.status(400).json({ error: 'المستلم مطلوب' });
      return;
    }

    // Text messages require text; image messages require imageUrl
    if (msgType === 'text' && !text) {
      res.status(400).json({ error: 'النص مطلوب' });
      return;
    }
    if (msgType === 'image' && !imageUrl) {
      res.status(400).json({ error: 'رابط الصورة مطلوب' });
      return;
    }

    // Generate a TEXT id manually (matching the DEFAULT expression in the schema)
    const messageId = crypto.randomBytes(16).toString('hex').toLowerCase();

    db.prepare(`
      INSERT INTO chat_messages (id, sender_id, receiver_id, text, post_id, message_type, image_url, reply_to_id, reactions, deleted_for)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageId, payload.userId, receiverId,
      text || '', postId || null,
      msgType, imageUrl || '', replyToId || null,
      '{}', ''
    );

    // Create notification for the receiver
    const sender = db.prepare('SELECT name FROM users WHERE id = ?').get(payload.userId) as any;
    if (sender) {
      const notifText = msgType === 'image'
        ? `رسالة جديدة من ${sender.name}: 📷 صورة`
        : `رسالة جديدة من ${sender.name}: ${(text || '').slice(0, 50)}${(text || '').length > 50 ? '...' : ''}`;
      db.prepare('INSERT INTO notifications (user_id, type, message, user_id_ref, link) VALUES (?, ?, ?, ?, ?)')
        .run(receiverId, 'message', notifText, payload.userId, '/messages');
    }

    const message = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId);

    // Emit WebSocket event to receiver for real-time delivery
    try {
      const wsManager = (req.app.locals as any).wsManager;
      if (wsManager) {
        const senderUser = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(payload.userId) as any;
        wsManager.emitChatMessage(receiverId, {
          id: messageId,
          senderId: payload.userId,
          receiverId,
          text: text || '',
          messageType: msgType,
          imageUrl: imageUrl || '',
          postId: postId || null,
          replyToId: replyToId || null,
          timestamp: new Date().toISOString(),
          senderName: senderUser?.name || '',
          senderAvatar: senderUser?.avatar || '',
        });
      }
    } catch (wsErr: any) {
      console.error('[WS] Failed to emit chat message:', wsErr.message);
    }

    res.status(201).json(message);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إرسال الرسالة', details: err.message });
  }
});

// DELETE /api/chat/messages/:messageId — Soft-delete a message for the current user
router.delete('/messages/:messageId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { messageId } = req.params;

    const message = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId) as any;
    if (!message) {
      res.status(404).json({ error: 'الرسالة غير موجودة' });
      return;
    }

    // Only allow deleting messages where the user is sender or receiver
    if (message.sender_id !== payload.userId && message.receiver_id !== payload.userId) {
      res.status(403).json({ error: 'لا يمكنك حذف هذه الرسالة' });
      return;
    }

    // Add userId to deleted_for (comma-separated)
    const deletedFor = message.deleted_for
      ? message.deleted_for.split(',').map((id: string) => id.trim()).filter(Boolean)
      : [];
    if (!deletedFor.includes(payload.userId)) {
      deletedFor.push(payload.userId);
    }
    const newDeletedFor = deletedFor.join(',');

    db.prepare('UPDATE chat_messages SET deleted_for = ? WHERE id = ?').run(newDeletedFor, messageId);

    res.json({ message: 'تم حذف الرسالة' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل حذف الرسالة', details: err.message });
  }
});

// POST /api/chat/messages/:messageId/react — Add/toggle reaction
router.post('/messages/:messageId/react', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      res.status(400).json({ error: 'الرمز التفاعلي مطلوب' });
      return;
    }

    const message = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId) as any;
    if (!message) {
      res.status(404).json({ error: 'الرسالة غير موجودة' });
      return;
    }

    // Only allow reacting on messages where the user is sender or receiver
    if (message.sender_id !== payload.userId && message.receiver_id !== payload.userId) {
      res.status(403).json({ error: 'لا يمكنك التفاعل مع هذه الرسالة' });
      return;
    }

    // Parse existing reactions
    let reactions: Record<string, string> = {};
    try {
      reactions = JSON.parse(message.reactions || '{}');
    } catch {
      reactions = {};
    }

    // Toggle reaction: if user already reacted with same emoji, remove it; otherwise set it
    if (reactions[payload.userId] === emoji) {
      delete reactions[payload.userId];
    } else {
      reactions[payload.userId] = emoji;
    }

    db.prepare('UPDATE chat_messages SET reactions = ? WHERE id = ?').run(JSON.stringify(reactions), messageId);

    res.json({ message: 'تم تحديث التفاعل', reactions });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحديث التفاعل', details: err.message });
  }
});

// POST /api/chat/upload-image — Upload image for chat
router.post('/upload-image', authMiddleware, chatImageUpload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'لم يتم رفع أي ملف' });
    return;
  }
  const url = `/uploads/chat/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

export default router;
