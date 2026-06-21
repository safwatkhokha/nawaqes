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

// ─── Helper: check if user is blocked ──────────────────────────────
function isUserBlocked(blockerId: string, blockedId: string): boolean {
  const block = db.prepare(
    'SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?'
  ).get(blockerId, blockedId) as any;
  return !!block;
}

// ─── Helper: get muted chats for a user ────────────────────────────
function getMutedTargetIds(userId: string): Set<string> {
  const mutes = db.prepare('SELECT target_id FROM chat_mutes WHERE user_id = ?').all(userId) as any[];
  return new Set(mutes.map(m => m.target_id));
}

// ─── Helper: get blocked user IDs for a user ───────────────────────
function getBlockedUserIds(userId: string): { blockedByMe: Set<string>; blockedMe: Set<string> } {
  const blockedByMe = db.prepare('SELECT blocked_id FROM user_blocks WHERE blocker_id = ?').all(userId) as any[];
  const blockedMe = db.prepare('SELECT blocker_id FROM user_blocks WHERE blocked_id = ?').all(userId) as any[];
  return {
    blockedByMe: new Set(blockedByMe.map(b => b.blocked_id)),
    blockedMe: new Set(blockedMe.map(b => b.blocker_id)),
  };
}

// GET /api/chat/contacts
router.get('/contacts', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const userId = payload.userId;
    const mutedIds = getMutedTargetIds(userId);
    const { blockedByMe, blockedMe } = getBlockedUserIds(userId);

    // Get all users who have exchanged messages with current user
    const contacts = db.prepare(`
      SELECT DISTINCT
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as contact_id,
        u.name, u.avatar, u.is_verified
      FROM chat_messages cm
      JOIN users u ON u.id = CASE WHEN cm.sender_id = ? THEN cm.receiver_id ELSE cm.sender_id END
      WHERE (sender_id = ? OR receiver_id = ?) AND group_id IS NULL
      ORDER BY cm.created_at DESC
    `).all(userId, userId, userId, userId) as any[];

    const enriched = contacts.map(c => {
      const lastMsg = db.prepare(`
        SELECT text, message_type, created_at FROM chat_messages
        WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) AND (group_id IS NULL OR group_id = '')
        ORDER BY created_at DESC LIMIT 1
      `).get(userId, c.contact_id, c.contact_id, userId) as any;

      const unread = db.prepare(`
        SELECT COUNT(*) as count FROM chat_messages
        WHERE sender_id = ? AND receiver_id = ? AND read = 0 AND (group_id IS NULL OR group_id = '')
      `).get(c.contact_id, userId) as any;

      let lastMessageText = lastMsg?.text || '';
      if (lastMsg?.message_type === 'image') {
        lastMessageText = '📷 صورة';
      } else if (lastMsg?.message_type === 'voice') {
        lastMessageText = '🎤 رسالة صوتية';
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
        isMuted: mutedIds.has(c.contact_id),
        isBlocked: blockedByMe.has(c.contact_id) || blockedMe.has(c.contact_id),
      };
    });

    // Also get groups for this user
    const groups = db.prepare(`
      SELECT cg.*, cgm.role
      FROM chat_groups cg
      JOIN chat_group_members cgm ON cgm.group_id = cg.id
      WHERE cgm.user_id = ?
      ORDER BY cg.updated_at DESC
    `).all(userId) as any[];

    const groupContacts = groups.map(g => {
      const lastMsg = db.prepare(`
        SELECT text, message_type, created_at FROM chat_messages
        WHERE group_id = ?
        ORDER BY created_at DESC LIMIT 1
      `).get(g.id) as any;

      const unread = db.prepare(`
        SELECT COUNT(*) as count FROM chat_messages
        WHERE group_id = ? AND sender_id != ? AND read = 0
      `).get(g.id, userId) as any;

      const memberCount = db.prepare('SELECT COUNT(*) as count FROM chat_group_members WHERE group_id = ?').get(g.id) as any;

      let lastMessageText = lastMsg?.text || '';
      if (lastMsg?.message_type === 'image') {
        lastMessageText = '📷 صورة';
      } else if (lastMsg?.message_type === 'voice') {
        lastMessageText = '🎤 رسالة صوتية';
      }

      return {
        id: `group_${g.id}`,
        name: g.name,
        avatar: g.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(g.name)}`,
        lastMessage: lastMessageText,
        lastTime: lastMsg?.created_at || g.created_at || '',
        unread: unread?.count || 0,
        online: false,
        isGroup: true,
        groupId: g.id,
        isMuted: mutedIds.has(g.id),
        isBlocked: false,
        memberCount: memberCount?.count || 0,
      };
    });

    // Merge and sort by last message time
    const allContacts = [...enriched, ...groupContacts].sort((a, b) => {
      const timeA = a.lastTime ? new Date(a.lastTime).getTime() : 0;
      const timeB = b.lastTime ? new Date(b.lastTime).getTime() : 0;
      return timeB - timeA;
    });

    res.json(allContacts);
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

    // Check if this is a group chat
    const isGroup = contactId.startsWith('group_');
    const groupId = isGroup ? contactId.replace('group_', '') : null;

    let messages: any[];
    if (isGroup && groupId) {
      // Load group messages
      let query = `SELECT * FROM chat_messages WHERE group_id = ?`;
      const params: any[] = [groupId];
      if (before) { query += ' AND created_at < ?'; params.push(before as string); }
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(parseInt(limit as string));
      messages = db.prepare(query).all(...params).reverse();

      // Mark group messages as read
      db.prepare('UPDATE chat_messages SET read = 1 WHERE group_id = ? AND sender_id != ? AND read = 0')
        .run(groupId, payload.userId);
      db.prepare('UPDATE chat_messages SET delivered = 1 WHERE group_id = ? AND sender_id != ? AND delivered = 0')
        .run(groupId, payload.userId);
    } else {
      // Load DM messages
      let query = `
        SELECT * FROM chat_messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      `;
      const params: any[] = [payload.userId, contactId, contactId, payload.userId];
      if (before) { query += ' AND created_at < ?'; params.push(before as string); }
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(parseInt(limit as string));
      messages = db.prepare(query).all(...params).reverse();

      // Mark as read
      db.prepare('UPDATE chat_messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0')
        .run(contactId, payload.userId);
      db.prepare('UPDATE chat_messages SET delivered = 1 WHERE sender_id = ? AND receiver_id = ? AND delivered = 0')
        .run(contactId, payload.userId);
    }

    // Filter out messages deleted for the current user
    const filteredMessages = messages.filter((m: any) => {
      if (!m.deleted_for) return true;
      const deletedForUsers = m.deleted_for.split(',').map((id: string) => id.trim()).filter(Boolean);
      return !deletedForUsers.includes(payload.userId);
    });

    res.json(filteredMessages);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب الرسائل', details: err.message });
  }
});

// POST /api/chat/send
router.post('/send', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { receiverId, text, postId, messageType, imageUrl, replyToId, voiceUrl, voiceDuration, groupId } = req.body;

    const msgType = messageType || 'text';
    const isGroupMsg = !!groupId;

    if (!receiverId && !groupId) {
      res.status(400).json({ error: 'المستلم مطلوب' });
      return;
    }

    // Text messages require text; image messages require imageUrl; voice messages require voiceUrl
    if (msgType === 'text' && !text) {
      res.status(400).json({ error: 'النص مطلوب' });
      return;
    }
    if (msgType === 'image' && !imageUrl) {
      res.status(400).json({ error: 'رابط الصورة مطلوب' });
      return;
    }
    if (msgType === 'voice' && !voiceUrl) {
      res.status(400).json({ error: 'رابط الرسالة الصوتية مطلوب' });
      return;
    }

    // For DMs, check block status
    if (!isGroupMsg && receiverId) {
      if (isUserBlocked(payload.userId, receiverId)) {
        res.status(403).json({ error: 'لا يمكنك مراسلة مستخدم محظور' });
        return;
      }
      if (isUserBlocked(receiverId, payload.userId)) {
        res.status(403).json({ error: 'لا يمكنك مراسلة هذا المستخدم' });
        return;
      }
    }

    // For group messages, check membership
    if (isGroupMsg) {
      const membership = db.prepare(
        'SELECT id FROM chat_group_members WHERE group_id = ? AND user_id = ?'
      ).get(groupId, payload.userId) as any;
      if (!membership) {
        res.status(403).json({ error: 'لست عضواً في هذه المجموعة' });
        return;
      }
    }

    // Generate a TEXT id manually
    const messageId = crypto.randomBytes(16).toString('hex').toLowerCase();

    const actualReceiverId = isGroupMsg ? 'group' : receiverId;

    db.prepare(`
      INSERT INTO chat_messages (id, sender_id, receiver_id, text, post_id, message_type, image_url, reply_to_id, reactions, deleted_for, voice_url, voice_duration, group_id, is_forwarded, forwarded_from)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageId, payload.userId, actualReceiverId,
      text || '', postId || null,
      msgType, imageUrl || '', replyToId || null,
      '{}', '', voiceUrl || '', voiceDuration || 0,
      groupId || null, 0, ''
    );

    // Create notification for the receiver (DM only)
    if (!isGroupMsg && receiverId) {
      const sender = db.prepare('SELECT name FROM users WHERE id = ?').get(payload.userId) as any;
      if (sender) {
        const notifText = msgType === 'image'
          ? `رسالة جديدة من ${sender.name}: 📷 صورة`
          : msgType === 'voice'
            ? `رسالة جديدة من ${sender.name}: 🎤 رسالة صوتية`
            : `رسالة جديدة من ${sender.name}: ${(text || '').slice(0, 50)}${(text || '').length > 50 ? '...' : ''}`;
        db.prepare('INSERT INTO notifications (user_id, type, message, user_id_ref, link) VALUES (?, ?, ?, ?, ?)')
          .run(receiverId, 'message', notifText, payload.userId, '/messages');
      }
    }

    const message = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId);

    // Emit WebSocket event
    try {
      const wsManager = (req.app.locals as any).wsManager;
      if (wsManager) {
        const senderUser = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(payload.userId) as any;

        if (isGroupMsg && groupId) {
          // Broadcast to all group members except sender
          const groupMembers = db.prepare('SELECT user_id FROM chat_group_members WHERE group_id = ?').all(groupId) as any[];
          for (const member of groupMembers) {
            if (member.user_id !== payload.userId) {
              wsManager.emitChatMessage(member.user_id, {
                id: messageId,
                senderId: payload.userId,
                receiverId: 'group',
                text: text || '',
                messageType: msgType,
                imageUrl: imageUrl || '',
                postId: postId || null,
                replyToId: replyToId || null,
                voiceUrl: voiceUrl || '',
                voiceDuration: voiceDuration || 0,
                groupId,
                timestamp: new Date().toISOString(),
                senderName: senderUser?.name || '',
                senderAvatar: senderUser?.avatar || '',
              });

              // Notification for group members
              const notifText = msgType === 'image'
                ? `رسالة في المجموعة من ${senderUser?.name || ''}: 📷 صورة`
                : msgType === 'voice'
                  ? `رسالة في المجموعة من ${senderUser?.name || ''}: 🎤 رسالة صوتية`
                  : `رسالة في المجموعة من ${senderUser?.name || ''}: ${(text || '').slice(0, 50)}`;
              db.prepare('INSERT INTO notifications (user_id, type, message, user_id_ref, link) VALUES (?, ?, ?, ?, ?)')
                .run(member.user_id, 'message', notifText, payload.userId, '/messages');
            }
          }
        } else if (receiverId) {
          wsManager.emitChatMessage(receiverId, {
            id: messageId,
            senderId: payload.userId,
            receiverId,
            text: text || '',
            messageType: msgType,
            imageUrl: imageUrl || '',
            postId: postId || null,
            replyToId: replyToId || null,
            voiceUrl: voiceUrl || '',
            voiceDuration: voiceDuration || 0,
            timestamp: new Date().toISOString(),
            senderName: senderUser?.name || '',
            senderAvatar: senderUser?.avatar || '',
          });
        }
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
    if (message.sender_id !== payload.userId && message.receiver_id !== payload.userId && !message.group_id) {
      res.status(403).json({ error: 'لا يمكنك حذف هذه الرسالة' });
      return;
    }

    // For group messages, allow members to delete for themselves
    if (message.group_id) {
      const membership = db.prepare('SELECT id FROM chat_group_members WHERE group_id = ? AND user_id = ?').get(message.group_id, payload.userId) as any;
      if (!membership && message.sender_id !== payload.userId) {
        res.status(403).json({ error: 'لا يمكنك حذف هذه الرسالة' });
        return;
      }
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

    // Only allow reacting on messages where the user is sender or receiver or group member
    const isParticipant = message.sender_id === payload.userId || message.receiver_id === payload.userId;
    const isGroupMember = message.group_id ? !!db.prepare('SELECT id FROM chat_group_members WHERE group_id = ? AND user_id = ?').get(message.group_id, payload.userId) : false;
    if (!isParticipant && !isGroupMember) {
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

    // Toggle reaction
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

// ─── Voice Upload Setup ──────────────────────────────────────────────
const chatVoiceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.resolve('uploads/chat/voice');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});
const chatVoiceUpload = multer({
  storage: chatVoiceStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowedMime = /^audio\/|^video\/webm/;
    const allowedExt = /\.webm$|\.ogg$|\.mp3$|\.wav$|\.m4a$|\.mp4$|\.oga$/i;
    const ext = allowedExt.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedMime.test(file.mimetype);
    cb(null, ext || mime);
  },
});

// POST /api/chat/upload-voice — Upload voice note for chat
router.post('/upload-voice', authMiddleware, chatVoiceUpload.single('voice'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'لم يتم رفع أي ملف صوتي' });
    return;
  }
  const url = `/uploads/chat/voice/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// PUT /api/chat/messages/:messageId — Edit message
router.put('/messages/:messageId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { messageId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'النص مطلوب' });
      return;
    }

    const message = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId) as any;
    if (!message) {
      res.status(404).json({ error: 'الرسالة غير موجودة' });
      return;
    }

    // Only sender can edit
    if (message.sender_id !== payload.userId) {
      res.status(403).json({ error: 'لا يمكنك تعديل هذه الرسالة' });
      return;
    }

    // Cannot edit deleted-for-everyone messages
    if (message.deleted_for === 'everyone') {
      res.status(400).json({ error: 'لا يمكن تعديل رسالة محذوفة' });
      return;
    }

    db.prepare('UPDATE chat_messages SET text = ?, is_edited = 1 WHERE id = ?').run(text.trim(), messageId);

    const updatedMessage = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId);

    // Emit WebSocket event to receiver
    try {
      const wsManager = (req.app.locals as any).wsManager;
      if (wsManager) {
        if (message.group_id) {
          // Broadcast edit to all group members
          const groupMembers = db.prepare('SELECT user_id FROM chat_group_members WHERE group_id = ?').all(message.group_id) as any[];
          for (const member of groupMembers) {
            if (member.user_id !== payload.userId) {
              wsManager.sendToUser(member.user_id, {
                type: 'chat:message-edited',
                data: { id: messageId, text: text.trim(), isEdited: true },
              });
            }
          }
        } else {
          wsManager.sendToUser(message.receiver_id, {
            type: 'chat:message-edited',
            data: { id: messageId, text: text.trim(), isEdited: true },
          });
        }
      }
    } catch (wsErr: any) {
      console.error('[WS] Failed to emit message-edited:', wsErr.message);
    }

    res.json(updatedMessage);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تعديل الرسالة', details: err.message });
  }
});

// DELETE /api/chat/messages/:messageId/everyone — Delete for everyone
router.delete('/messages/:messageId/everyone', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { messageId } = req.params;

    const message = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId) as any;
    if (!message) {
      res.status(404).json({ error: 'الرسالة غير موجودة' });
      return;
    }

    // Only sender can delete for everyone
    if (message.sender_id !== payload.userId) {
      res.status(403).json({ error: 'لا يمكنك حذف هذه الرسالة للجميع' });
      return;
    }

    // Mark as deleted for everyone
    db.prepare(
      "UPDATE chat_messages SET text = '', message_type = 'system', image_url = '', deleted_for = 'everyone', voice_url = '', voice_duration = 0 WHERE id = ?"
    ).run(messageId);

    // Emit WebSocket event
    try {
      const wsManager = (req.app.locals as any).wsManager;
      if (wsManager) {
        if (message.group_id) {
          const groupMembers = db.prepare('SELECT user_id FROM chat_group_members WHERE group_id = ?').all(message.group_id) as any[];
          for (const member of groupMembers) {
            if (member.user_id !== payload.userId) {
              wsManager.sendToUser(member.user_id, {
                type: 'chat:message-deleted',
                data: { id: messageId, deletedFor: 'everyone' },
              });
            }
          }
        } else {
          wsManager.sendToUser(message.receiver_id, {
            type: 'chat:message-deleted',
            data: { id: messageId, deletedFor: 'everyone' },
          });
        }
      }
    } catch (wsErr: any) {
      console.error('[WS] Failed to emit message-deleted:', wsErr.message);
    }

    res.json({ message: 'تم حذف الرسالة للجميع' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل حذف الرسالة للجميع', details: err.message });
  }
});

// GET /api/chat/messages/:contactId/search — Search messages
router.get('/messages/:contactId/search', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { contactId } = req.params;
    const { q } = req.query;

    if (!q || typeof q !== 'string' || !q.trim()) {
      res.json([]);
      return;
    }

    const searchTerm = `%${q.trim()}%`;
    const isGroup = contactId.startsWith('group_');
    const groupId = isGroup ? contactId.replace('group_', '') : null;

    let messages: any[];
    if (isGroup && groupId) {
      messages = db.prepare(`
        SELECT * FROM chat_messages
        WHERE group_id = ? AND text LIKE ? AND deleted_for != 'everyone'
        ORDER BY created_at DESC LIMIT 50
      `).all(groupId, searchTerm);
    } else {
      messages = db.prepare(`
        SELECT * FROM chat_messages
        WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
          AND text LIKE ?
          AND deleted_for != 'everyone'
        ORDER BY created_at DESC
        LIMIT 50
      `).all(payload.userId, contactId, contactId, payload.userId, searchTerm);
    }

    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل البحث في الرسائل', details: err.message });
  }
});

// POST /api/chat/messages/:messageId/pin — Toggle pin status
router.post('/messages/:messageId/pin', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { messageId } = req.params;

    const message = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId) as any;
    if (!message) {
      res.status(404).json({ error: 'الرسالة غير موجودة' });
      return;
    }

    // Only participants can pin
    const isParticipant = message.sender_id === payload.userId || message.receiver_id === payload.userId;
    const isGroupMember = message.group_id ? !!db.prepare('SELECT id FROM chat_group_members WHERE group_id = ? AND user_id = ?').get(message.group_id, payload.userId) : false;
    if (!isParticipant && !isGroupMember) {
      res.status(403).json({ error: 'لا يمكنك تثبيت هذه الرسالة' });
      return;
    }

    const newPinStatus = message.is_pinned ? 0 : 1;
    db.prepare('UPDATE chat_messages SET is_pinned = ? WHERE id = ?').run(newPinStatus, messageId);

    res.json({ message: newPinStatus ? 'تم تثبيت الرسالة' : 'تم إلغاء تثبيت الرسالة', isPinned: !!newPinStatus });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تثبيت الرسالة', details: err.message });
  }
});

// GET /api/chat/messages/:contactId/media — Get shared media
router.get('/messages/:contactId/media', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { contactId } = req.params;

    const isGroup = contactId.startsWith('group_');
    const groupId = isGroup ? contactId.replace('group_', '') : null;

    let media: any[];
    if (isGroup && groupId) {
      media = db.prepare(`
        SELECT * FROM chat_messages
        WHERE group_id = ? AND (message_type = 'image' OR message_type = 'voice') AND deleted_for != 'everyone'
        ORDER BY created_at DESC LIMIT 100
      `).all(groupId);
    } else {
      media = db.prepare(`
        SELECT * FROM chat_messages
        WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
          AND (message_type = 'image' OR message_type = 'voice')
          AND deleted_for != 'everyone'
        ORDER BY created_at DESC
        LIMIT 100
      `).all(payload.userId, contactId, contactId, payload.userId);
    }

    res.json(media);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب الوسائط المشتركة', details: err.message });
  }
});

// ─── Phase 3: Group Chat Routes ─────────────────────────────────────

// POST /api/chat/groups — Create group
router.post('/groups', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { name, avatar, description, memberIds } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'اسم المجموعة مطلوب' });
      return;
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      res.status(400).json({ error: 'يجب إضافة عضو واحد على الأقل' });
      return;
    }

    const groupId = crypto.randomBytes(16).toString('hex').toLowerCase();

    db.prepare(`
      INSERT INTO chat_groups (id, name, avatar, description, creator_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(groupId, name.trim(), avatar || '', description || '', payload.userId);

    // Add creator as admin
    db.prepare(`
      INSERT INTO chat_group_members (group_id, user_id, role)
      VALUES (?, ?, 'admin')
    `).run(groupId, payload.userId);

    // Add other members
    const addMember = db.prepare(`
      INSERT OR IGNORE INTO chat_group_members (group_id, user_id, role)
      VALUES (?, ?, 'member')
    `);
    for (const memberId of memberIds) {
      if (memberId !== payload.userId) {
        addMember.run(groupId, memberId);
      }
    }

    const group = db.prepare('SELECT * FROM chat_groups WHERE id = ?').get(groupId);
    const members = db.prepare(`
      SELECT cgm.*, u.name, u.avatar
      FROM chat_group_members cgm
      JOIN users u ON u.id = cgm.user_id
      WHERE cgm.group_id = ?
    `).all(groupId);

    // Notify members via WebSocket
    try {
      const wsManager = (req.app.locals as any).wsManager;
      if (wsManager) {
        const creator = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(payload.userId) as any;
        for (const memberId of memberIds) {
          if (memberId !== payload.userId) {
            wsManager.sendToUser(memberId, {
              type: 'chat:group-created',
              data: {
                groupId,
                groupName: name.trim(),
                groupAvatar: avatar || '',
                creatorName: creator?.name || '',
                creatorAvatar: creator?.avatar || '',
              },
            });
          }
        }
      }
    } catch (wsErr: any) {
      console.error('[WS] Failed to emit group-created:', wsErr.message);
    }

    res.status(201).json({ ...(group as any || {}), members });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إنشاء المجموعة', details: err.message });
  }
});

// GET /api/chat/groups — Get user's groups
router.get('/groups', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const groups = db.prepare(`
      SELECT cg.* FROM chat_groups cg
      JOIN chat_group_members cgm ON cgm.group_id = cg.id
      WHERE cgm.user_id = ?
      ORDER BY cg.updated_at DESC
    `).all(payload.userId);

    const enriched = (groups as any[]).map(g => {
      const members = db.prepare(`
        SELECT cgm.*, u.name, u.avatar
        FROM chat_group_members cgm
        JOIN users u ON u.id = cgm.user_id
        WHERE cgm.group_id = ?
      `).all(g.id);
      return { ...g, members };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب المجموعات', details: err.message });
  }
});

// GET /api/chat/groups/:groupId — Get group details + members
router.get('/groups/:groupId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { groupId } = req.params;

    const group = db.prepare('SELECT * FROM chat_groups WHERE id = ?').get(groupId) as any;
    if (!group) {
      res.status(404).json({ error: 'المجموعة غير موجودة' });
      return;
    }

    const members = db.prepare(`
      SELECT cgm.*, u.name, u.avatar
      FROM chat_group_members cgm
      JOIN users u ON u.id = cgm.user_id
      WHERE cgm.group_id = ?
    `).all(groupId);

    // Check if user is a member
    const isMember = (members as any[]).some((m: any) => m.user_id === payload.userId);
    if (!isMember) {
      res.status(403).json({ error: 'لست عضواً في هذه المجموعة' });
      return;
    }

    res.json({ ...group, members });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب تفاصيل المجموعة', details: err.message });
  }
});

// PUT /api/chat/groups/:groupId — Update group (admin only)
router.put('/groups/:groupId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { groupId } = req.params;
    const { name, avatar, description } = req.body;

    const group = db.prepare('SELECT * FROM chat_groups WHERE id = ?').get(groupId) as any;
    if (!group) {
      res.status(404).json({ error: 'المجموعة غير موجودة' });
      return;
    }

    // Only admins can update
    const membership = db.prepare(
      'SELECT role FROM chat_group_members WHERE group_id = ? AND user_id = ?'
    ).get(groupId, payload.userId) as any;
    if (!membership || membership.role !== 'admin') {
      res.status(403).json({ error: 'فقط المشرفون يمكنهم تعديل المجموعة' });
      return;
    }

    const updates: string[] = [];
    const params: any[] = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (avatar !== undefined) { updates.push('avatar = ?'); params.push(avatar); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    updates.push("updated_at = datetime('now')");

    if (updates.length > 1) {
      params.push(groupId);
      db.prepare(`UPDATE chat_groups SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updatedGroup = db.prepare('SELECT * FROM chat_groups WHERE id = ?').get(groupId);
    res.json(updatedGroup);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تعديل المجموعة', details: err.message });
  }
});

// POST /api/chat/groups/:groupId/members — Add member (admin only)
router.post('/groups/:groupId/members', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { groupId } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'معرف المستخدم مطلوب' });
      return;
    }

    // Check admin status
    const membership = db.prepare(
      'SELECT role FROM chat_group_members WHERE group_id = ? AND user_id = ?'
    ).get(groupId, payload.userId) as any;
    if (!membership || membership.role !== 'admin') {
      res.status(403).json({ error: 'فقط المشرفون يمكنهم إضافة أعضاء' });
      return;
    }

    db.prepare(`
      INSERT OR IGNORE INTO chat_group_members (group_id, user_id, role)
      VALUES (?, ?, ?)
    `).run(groupId, userId, role || 'member');

    // Notify the added user
    try {
      const wsManager = (req.app.locals as any).wsManager;
      if (wsManager) {
        const group = db.prepare('SELECT name, avatar FROM chat_groups WHERE id = ?').get(groupId) as any;
        wsManager.sendToUser(userId, {
          type: 'chat:group-created',
          data: { groupId, groupName: group?.name || '', groupAvatar: group?.avatar || '' },
        });
      }
    } catch {}

    res.json({ message: 'تم إضافة العضو' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إضافة العضو', details: err.message });
  }
});

// DELETE /api/chat/groups/:groupId/members/:userId — Remove member (admin only, or user leaving)
router.delete('/groups/:groupId/members/:userId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { groupId, userId } = req.params;

    // User can remove themselves (leave), or admin can remove others
    if (userId !== payload.userId) {
      const membership = db.prepare(
        'SELECT role FROM chat_group_members WHERE group_id = ? AND user_id = ?'
      ).get(groupId, payload.userId) as any;
      if (!membership || membership.role !== 'admin') {
        res.status(403).json({ error: 'فقط المشرفون يمكنهم إزالة الأعضاء' });
        return;
      }
    }

    // Cannot remove the creator
    const group = db.prepare('SELECT creator_id FROM chat_groups WHERE id = ?').get(groupId) as any;
    if (group && group.creator_id === userId && userId !== payload.userId) {
      res.status(403).json({ error: 'لا يمكن إزالة منشئ المجموعة' });
      return;
    }

    db.prepare('DELETE FROM chat_group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);

    // If the creator is leaving, delete the group
    if (group && group.creator_id === userId) {
      db.prepare('DELETE FROM chat_group_members WHERE group_id = ?').run(groupId);
      db.prepare('DELETE FROM chat_groups WHERE id = ?').run(groupId);
    }

    res.json({ message: 'تم إزالة العضو' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إزالة العضو', details: err.message });
  }
});

// DELETE /api/chat/groups/:groupId — Delete group (creator only)
router.delete('/groups/:groupId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { groupId } = req.params;

    const group = db.prepare('SELECT * FROM chat_groups WHERE id = ?').get(groupId) as any;
    if (!group) {
      res.status(404).json({ error: 'المجموعة غير موجودة' });
      return;
    }

    if (group.creator_id !== payload.userId) {
      res.status(403).json({ error: 'فقط منشئ المجموعة يمكنه حذفها' });
      return;
    }

    // Notify all members before deletion
    try {
      const wsManager = (req.app.locals as any).wsManager;
      if (wsManager) {
        const members = db.prepare('SELECT user_id FROM chat_group_members WHERE group_id = ?').all(groupId) as any[];
        for (const member of members) {
          if (member.user_id !== payload.userId) {
            wsManager.sendToUser(member.user_id, {
              type: 'chat:group-deleted',
              data: { groupId, groupName: group.name },
            });
          }
        }
      }
    } catch {}

    db.prepare('DELETE FROM chat_group_members WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM chat_groups WHERE id = ?').run(groupId);

    res.json({ message: 'تم حذف المجموعة' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل حذف المجموعة', details: err.message });
  }
});

// POST /api/chat/groups/:groupId/leave — Leave group
router.post('/groups/:groupId/leave', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { groupId } = req.params;

    const group = db.prepare('SELECT * FROM chat_groups WHERE id = ?').get(groupId) as any;
    if (!group) {
      res.status(404).json({ error: 'المجموعة غير موجوعة' });
      return;
    }

    db.prepare('DELETE FROM chat_group_members WHERE group_id = ? AND user_id = ?').run(groupId, payload.userId);

    // If creator leaves, delete the group
    if (group.creator_id === payload.userId) {
      db.prepare('DELETE FROM chat_group_members WHERE group_id = ?').run(groupId);
      db.prepare('DELETE FROM chat_groups WHERE id = ?').run(groupId);
    }

    res.json({ message: 'تم مغادرة المجموعة' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل مغادرة المجموعة', details: err.message });
  }
});

// ─── Phase 3: Forward Message ──────────────────────────────────────

// POST /api/chat/messages/:messageId/forward — Forward message
router.post('/messages/:messageId/forward', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { messageId } = req.params;
    const { targetId, isGroup } = req.body;

    if (!targetId) {
      res.status(400).json({ error: 'الهدف مطلوب' });
      return;
    }

    const originalMessage = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId) as any;
    if (!originalMessage) {
      res.status(404).json({ error: 'الرسالة غير موجودة' });
      return;
    }

    // Check block status for DMs
    if (!isGroup) {
      if (isUserBlocked(payload.userId, targetId)) {
        res.status(403).json({ error: 'لا يمكنك مراسلة مستخدم محظور' });
        return;
      }
      if (isUserBlocked(targetId, payload.userId)) {
        res.status(403).json({ error: 'لا يمكنك مراسلة هذا المستخدم' });
        return;
      }
    }

    // Check group membership
    if (isGroup) {
      const membership = db.prepare(
        'SELECT id FROM chat_group_members WHERE group_id = ? AND user_id = ?'
      ).get(targetId, payload.userId) as any;
      if (!membership) {
        res.status(403).json({ error: 'لست عضواً في هذه المجموعة' });
        return;
      }
    }

    const newMessageId = crypto.randomBytes(16).toString('hex').toLowerCase();
    const receiverId = isGroup ? 'group' : targetId;
    const groupId = isGroup ? targetId : null;

    // Build forwarded_from: show the original sender name
    let forwardedFrom = '';
    try {
      const sender = db.prepare('SELECT name FROM users WHERE id = ?').get(originalMessage.sender_id) as any;
      forwardedFrom = sender?.name || '';
    } catch {}

    db.prepare(`
      INSERT INTO chat_messages (id, sender_id, receiver_id, text, post_id, message_type, image_url, reply_to_id, reactions, deleted_for, voice_url, voice_duration, group_id, is_forwarded, forwarded_from)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newMessageId, payload.userId, receiverId,
      originalMessage.text || '', null,
      originalMessage.message_type || 'text',
      originalMessage.image_url || '', null,
      '{}', '',
      originalMessage.voice_url || '', originalMessage.voice_duration || 0,
      groupId, 1, forwardedFrom
    );

    const newMessage = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(newMessageId);

    // Emit WebSocket event
    try {
      const wsManager = (req.app.locals as any).wsManager;
      if (wsManager) {
        const senderUser = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(payload.userId) as any;
        if (isGroup && groupId) {
          const groupMembers = db.prepare('SELECT user_id FROM chat_group_members WHERE group_id = ?').all(groupId) as any[];
          for (const member of groupMembers) {
            if (member.user_id !== payload.userId) {
              wsManager.emitChatMessage(member.user_id, {
                id: newMessageId,
                senderId: payload.userId,
                receiverId: 'group',
                text: originalMessage.text || '',
                messageType: originalMessage.message_type || 'text',
                imageUrl: originalMessage.image_url || '',
                voiceUrl: originalMessage.voice_url || '',
                voiceDuration: originalMessage.voice_duration || 0,
                groupId,
                isForwarded: true,
                forwardedFrom,
                timestamp: new Date().toISOString(),
                senderName: senderUser?.name || '',
                senderAvatar: senderUser?.avatar || '',
              });
            }
          }
        } else {
          wsManager.emitChatMessage(targetId, {
            id: newMessageId,
            senderId: payload.userId,
            receiverId: targetId,
            text: originalMessage.text || '',
            messageType: originalMessage.message_type || 'text',
            imageUrl: originalMessage.image_url || '',
            voiceUrl: originalMessage.voice_url || '',
            voiceDuration: originalMessage.voice_duration || 0,
            isForwarded: true,
            forwardedFrom,
            timestamp: new Date().toISOString(),
            senderName: senderUser?.name || '',
            senderAvatar: senderUser?.avatar || '',
          });
        }
      }
    } catch (wsErr: any) {
      console.error('[WS] Failed to emit forwarded message:', wsErr.message);
    }

    res.status(201).json(newMessage);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تمرير الرسالة', details: err.message });
  }
});

// ─── Phase 3: Mute Notifications ───────────────────────────────────

// POST /api/chat/mute/:targetId — Mute/unmute chat
router.post('/mute/:targetId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { targetId } = req.params;
    const { isGroup } = req.body;

    const existing = db.prepare(
      'SELECT id FROM chat_mutes WHERE user_id = ? AND target_id = ?'
    ).get(payload.userId, targetId) as any;

    if (existing) {
      db.prepare('DELETE FROM chat_mutes WHERE id = ?').run(existing.id);
      res.json({ message: 'تم إلغاء كتم الإشعارات', isMuted: false });
    } else {
      const muteId = crypto.randomBytes(16).toString('hex').toLowerCase();
      db.prepare(`
        INSERT INTO chat_mutes (id, user_id, target_id, is_group)
        VALUES (?, ?, ?, ?)
      `).run(muteId, payload.userId, targetId, isGroup ? 1 : 0);
      res.json({ message: 'تم كتم الإشعارات', isMuted: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحديث حالة الكتم', details: err.message });
  }
});

// GET /api/chat/mutes — Get muted chats
router.get('/mutes', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const mutes = db.prepare('SELECT target_id, is_group FROM chat_mutes WHERE user_id = ?').all(payload.userId);
    res.json(mutes);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب المحادثات المكتومة', details: err.message });
  }
});

// ─── Phase 3: Block User ───────────────────────────────────────────

// POST /api/chat/block/:userId — Block/unblock user
router.post('/block/:userId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { userId } = req.params;

    if (userId === payload.userId) {
      res.status(400).json({ error: 'لا يمكنك حظر نفسك' });
      return;
    }

    const existing = db.prepare(
      'SELECT id FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?'
    ).get(payload.userId, userId) as any;

    if (existing) {
      db.prepare('DELETE FROM user_blocks WHERE id = ?').run(existing.id);
      res.json({ message: 'تم إلغاء الحظر', isBlocked: false });
    } else {
      const blockId = crypto.randomBytes(16).toString('hex').toLowerCase();
      db.prepare(`
        INSERT INTO user_blocks (id, blocker_id, blocked_id)
        VALUES (?, ?, ?)
      `).run(blockId, payload.userId, userId);
      res.json({ message: 'تم حظر المستخدم', isBlocked: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحديث حالة الحظر', details: err.message });
  }
});

// GET /api/chat/blocks — Get blocked users
router.get('/blocks', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const blocks = db.prepare(`
      SELECT ub.blocked_id, u.name, u.avatar
      FROM user_blocks ub
      JOIN users u ON u.id = ub.blocked_id
      WHERE ub.blocker_id = ?
    `).all(payload.userId);
    res.json(blocks);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب المستخدمين المحظورين', details: err.message });
  }
});

export default router;
