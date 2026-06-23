// --- Nawaqes Server (Production-Ready Secure) ---
import express from 'express';
import { createServer as createHttpServer } from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import crypto from 'crypto';
import { wsManager } from './websocket/index.js';

const rootDir = process.cwd();

// --- Detect persistent storage (HF Spaces uses /data) ---
const PERSISTENT_DIR = fs.existsSync('/data') ? '/data' : path.resolve(rootDir, 'data');
console.log(`[SETUP] Persistent storage: ${PERSISTENT_DIR}`);

// --- Auto-setup: Create .env and directories if missing ---
// Use persistent storage for .env to prevent JWT_SECRET reset on container rebuild
const envPath = fs.existsSync(path.resolve(PERSISTENT_DIR, '.env'))
  ? path.resolve(PERSISTENT_DIR, '.env')
  : path.resolve(rootDir, '.env');
const envExamplePath = path.resolve(rootDir, '.env.example');
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log(`[SETUP] Created .env at ${envPath}`);
}
for (const dir of ['uploads', 'data', 'backups']) {
  const dirPath = path.resolve(rootDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`[SETUP] Created ${dir}/ directory`);
  }
}
// Ensure persistent storage subdirectories exist
for (const dir of ['uploads', 'uploads/videos', 'backups']) {
  const dirPath = path.resolve(PERSISTENT_DIR, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`[SETUP] Created persistent ${dir}/ directory`);
  }
}

// Load environment variables
dotenv.config({ path: envPath });
dotenv.config({ path: path.resolve(rootDir, '.env.local') });

// --- Auto-configure missing env vars (write to .env silently) ---
function autoSetEnv(key: string, value: string) {
  process.env[key] = value;
  try {
    const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    const lines = envContent.split('\n');
    const keyPattern = new RegExp(`^${key}=`);
    const existingIndex = lines.findIndex(l => keyPattern.test(l));
    if (existingIndex >= 0) {
      lines[existingIndex] = `${key}=${value}`;
    } else {
      lines.push(`${key}=${value}`);
    }
    fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
    // Also save to persistent .env if different from main .env
    const persistentEnvPath = path.resolve(PERSISTENT_DIR, '.env');
    if (persistentEnvPath !== envPath) {
      try {
        const pEnvContent = fs.existsSync(persistentEnvPath) ? fs.readFileSync(persistentEnvPath, 'utf-8') : '';
        const pLines = pEnvContent.split('\n');
        const pExistingIndex = pLines.findIndex(l => keyPattern.test(l));
        if (pExistingIndex >= 0) {
          pLines[pExistingIndex] = `${key}=${value}`;
        } else {
          pLines.push(`${key}=${value}`);
        }
        fs.writeFileSync(persistentEnvPath, pLines.join('\n'), 'utf-8');
      } catch { /* ignore */ }
    }
  } catch { /* ignore write errors */ }
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret === 'REPLACE-WITH-YOUR-OWN-SECURE-RANDOM-STRING') {
  const generatedSecret = crypto.randomBytes(64).toString('hex');
  autoSetEnv('JWT_SECRET', generatedSecret);
  console.log('[CONFIG] JWT_SECRET auto-generated and saved to .env');
}

// Import middleware
import { validateInput, rateLimit, securityHeaders } from './middleware/validation.js';

// Import routes
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import chatRoutes from './routes/chat.js';
import walletRoutes from './routes/wallet.js';
import adminRoutes from './routes/admin.js';
import apiRoutes from './routes/api.js';
import marketRoutes from './routes/market.js';
import smartReachRoutes from './routes/smartReach.js';
import aiRoutes from './routes/ai.js';

async function startServer() {
  // 🔧 Safety net: also try to restore from HF backup if needed.
  // The PRIMARY restore happens via `dist/restore.mjs` BEFORE this
  // server starts (see Dockerfile CMD). This call here is a fallback
  // for dev mode / non-Docker environments. In production it will
  // typically skip because the DB will already exist and be fresh.
  try {
    const { autoRestoreDB } = await import('./database/auto-restore.js');
    await autoRestoreDB();
  } catch (err: any) {
    console.warn('[RESTORE] Failed:', err.message);
  }

  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isDev = process.env.NODE_ENV !== 'production';

  // --- Global error handling ---
  process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err.message);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled Rejection:', reason);
  });

  // =====================================================
  // MIDDLEWARE ORDER MATTERS!
  // 1. CORS           - must be first
  // 2. Security       - sets headers on ALL responses (including Vite pages)
  // 3. JSON parser    - parses request bodies
  // 4. Rate limit     - skips Vite/asset paths
  // 5. Validation     - only checks POST/PUT JSON bodies
  // 6. Uploads        - serves uploaded files
  // 7. API routes     - handles /api/* requests
  // 8. Vite / Static  - serves frontend (catch-all)
  // =====================================================

  // 1. CORS (must be first)
  const allowedOrigins = isDev
    ? true
    : [
        process.env.APP_URL || `http://localhost:${PORT}`,
        'https://huggingface.co',
        'https://*.huggingface.co',
        /^https:\/\/[a-zA-Z0-9-]+\.huggingface\.co$/,
        /^https:\/\/[a-zA-Z0-9-]+\.hf\.space$/,
        /^https:\/\/[a-zA-Z0-9-]+-[a-zA-Z0-9-]+\.hf\.space$/,
      ];
  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));

  // 2. Security headers - MUST come before Vite so CSP is set on ALL responses
  app.use(securityHeaders);

  // 3. Parse JSON bodies (increased limit for base64-encoded media)
  app.use(express.json({ limit: '50mb' }));

  // 3b. Disable caching for ALL API responses.
  // Without this, the Android WebView caches API responses and serves
  // stale data (different posts on app vs website).
  app.use('/api', (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // JSON parse error handler
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'بيانات غير صالحة' });
      return;
    }
    next(err);
  });

  // 4. Rate limiting (skips Vite HMR paths and static assets)
  app.use(rateLimit);

  // 5. Input validation (only affects POST/PUT/PATCH with JSON)
  app.use(validateInput);

  // 6. Serve uploaded files (with caching headers)
  app.use('/uploads', express.static(path.resolve('uploads'), {
    maxAge: '7d',
    etag: true,
    lastModified: true,
  }));
  // Also ensure videos directory exists
  const videosDir = path.resolve('uploads/videos');
  if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

  // 7. API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/market', marketRoutes);
  app.use('/api/smart-reach', smartReachRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api', apiRoutes);

  // Health check endpoint (no auth required)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      env: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      ts: new Date().toISOString(),
      version: '2.0.0',
    });
  });

  // Log all registered API routes for debugging
  const registeredRoutes: string[] = [];
  app._router?.stack?.forEach((layer: any) => {
    if (layer.route) {
      registeredRoutes.push(`${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);
    } else if (layer.name === 'router' && layer.regexp) {
      const match = layer.regexp.toString().match(/\/api\/\w+/);
      if (match) registeredRoutes.push(`Router: ${match[0]}`);
    }
  });
  console.log('[API] Registered routes:', registeredRoutes.join(', '));

  // Diagnostics endpoint (admin only in production)
  app.get('/api/diagnostics', async (req, res) => {
    if (!isDev) {
      // In production, require admin auth for diagnostics - properly validate JWT token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      // Verify the JWT token
      const { verifyToken } = await import('./middleware/auth.js');
      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);
      if (!payload || !payload.isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
    }
    const routes: string[] = [];
    app._router?.stack?.forEach((layer: any) => {
      if (layer.route) {
        routes.push(`${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);
      } else if (layer.name === 'router' && layer.regexp) {
        const match = layer.regexp.toString().match(/\/api\/\w+/);
        if (match) routes.push(`Router: ${match[0]}`);
      }
    });
    res.json({
      status: 'ok',
      env: process.env.NODE_ENV || 'development',
      port: PORT,
      uptime: process.uptime(),
      routes,
      ts: new Date().toISOString(),
    });
  });

  // 7b. APK download endpoint (serves APK file)
  // Place APKs in /data/downloads/ or ./downloads/
  const downloadsDir = fs.existsSync('/data/downloads')
    ? '/data/downloads'
    : path.resolve(rootDir, 'downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
    console.log(`[SETUP] Created downloads/ directory at ${downloadsDir}`);
  }
  app.use('/download', express.static(downloadsDir, {
    maxAge: '1h',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.apk')) {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  }));

  // Download landing page (public)
  app.get('/get-app', (_req, res) => {
    const downloadPagePath = path.resolve(rootDir, 'public', 'download.html');
    const distDownloadPath = path.resolve(rootDir, 'dist', 'client', 'download.html');
    if (fs.existsSync(distDownloadPath)) {
      res.sendFile(distDownloadPath);
    } else if (fs.existsSync(downloadPagePath)) {
      res.sendFile(downloadPagePath);
    } else {
      res.redirect('/');
    }
  });

  // Smart install page (auto-detects platform: iOS/Android/Desktop)
  app.get('/install', (_req, res) => {
    const installPagePath = path.resolve(rootDir, 'public', 'install.html');
    const distInstallPath = path.resolve(rootDir, 'dist', 'client', 'install.html');
    if (fs.existsSync(distInstallPath)) {
      res.sendFile(distInstallPath);
    } else if (fs.existsSync(installPagePath)) {
      res.sendFile(installPagePath);
    } else {
      res.redirect('/get-app');
    }
  });

  // Firebase setup guide page (interactive Arabic guide)
  app.get('/firebase-setup', (_req, res) => {
    const setupPagePath = path.resolve(rootDir, 'public', 'firebase-setup.html');
    const distSetupPath = path.resolve(rootDir, 'dist', 'client', 'firebase-setup.html');
    if (fs.existsSync(distSetupPath)) {
      res.sendFile(distSetupPath);
    } else if (fs.existsSync(setupPagePath)) {
      res.sendFile(setupPagePath);
    } else {
      res.redirect('/get-app');
    }
  });

  // Interactive Firebase config collector (auto-generates config JSON)
  app.get('/firebase-setup-interactive', (_req, res) => {
    const setupPagePath = path.resolve(rootDir, 'public', 'firebase-setup-interactive.html');
    const distSetupPath = path.resolve(rootDir, 'dist', 'client', 'firebase-setup-interactive.html');
    if (fs.existsSync(distSetupPath)) {
      res.sendFile(distSetupPath);
    } else if (fs.existsSync(setupPagePath)) {
      res.sendFile(setupPagePath);
    } else {
      res.redirect('/firebase-setup');
    }
  });

  // Serve download.html at /download too (for cleaner URL)
  app.get('/download.html', (_req, res) => {
    const downloadPagePath = path.resolve(rootDir, 'public', 'download.html');
    const distDownloadPath = path.resolve(rootDir, 'dist', 'client', 'download.html');
    if (fs.existsSync(distDownloadPath)) {
      res.sendFile(distDownloadPath);
    } else if (fs.existsSync(downloadPagePath)) {
      res.sendFile(downloadPagePath);
    } else {
      res.redirect('/get-app');
    }
  });

  // ===========================================
  // 7c. Firebase config endpoint (public, no secrets)
  // ===========================================
  app.get('/api/notifications/firebase-config', (_req, res) => {
    res.json({
      apiKey: process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${process.env.FIREBASE_PROJECT_ID || 'nawaqes-app'}.firebaseapp.com`,
      projectId: process.env.FIREBASE_PROJECT_ID || 'nawaqes-app',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID || 'nawaqes-app'}.appspot.com`,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || '',
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || '',
      vapidKey: process.env.FIREBASE_VAPID_KEY || '',
    });
  });

  // ===========================================
  // 7d. Device registration for push notifications
  // ===========================================
  app.post('/api/notifications/register-device', async (req, res) => {
    try {
      const { token, platform } = req.body;
      if (!token || !platform) {
        res.status(400).json({ error: 'token and platform required' });
        return;
      }
      let userId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const { verifyToken } = await import('./middleware/auth.js');
          const payload = verifyToken(authHeader.split(' ')[1]);
          if (payload) userId = payload.userId || payload.sub || null;
        } catch { /* ignore auth errors */ }
      }
      // Save or update device token in database
      try {
        const db = (await import('./database/index.js')).default;
        // Remove token from any other user (token can only belong to one user)
        db.prepare('DELETE FROM devices WHERE token = ? AND user_id != ?').run(token, userId || '');
        // Upsert device token
        const existing = db.prepare('SELECT id FROM devices WHERE token = ?').get(token) as any;
        if (existing) {
          db.prepare('UPDATE devices SET user_id = ?, platform = ?, updated_at = datetime(\'now\') WHERE token = ?').run(userId, platform, token);
        } else {
          db.prepare('INSERT INTO devices (user_id, token, platform) VALUES (?, ?, ?)').run(userId, token, platform);
        }
      } catch (dbErr: any) {
        console.warn('[FCM] Failed to save device token:', dbErr.message);
      }
      console.log(`[FCM] Device registered: platform=${platform}, user=${userId || 'guest'}`);
      res.json({ success: true, registered: true });
    } catch (err: any) {
      console.error('[FCM] register-device error:', err.message);
      res.status(500).json({ error: 'Failed to register device' });
    }
  });

  // Topic subscription
  app.post('/api/notifications/subscribe', async (req, res) => {
    try {
      const { topic } = req.body;
      if (!topic) {
        res.status(400).json({ error: 'topic required' });
        return;
      }
      console.log(`[FCM] Topic subscription: ${topic}`);
      res.json({ success: true, subscribed: true, topic });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to subscribe' });
    }
  });

  // Send push notification to a specific user or broadcast to all
  app.post('/api/notifications/send', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { verifyToken } = await import('./middleware/auth.js');
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (!payload?.isAdmin) {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }
      const { userId: targetUserId, userIds: targetUserIds, title, body, data, topic } = req.body;
      if (!title || !body) {
        res.status(400).json({ error: 'title and body required' });
        return;
      }

      // Broadcast to all users
      if (targetUserId === 'all' || (targetUserIds && targetUserIds.length === 0)) {
        const db = (await import('./database/index.js')).default;
        const allUsers = db.prepare('SELECT id FROM users WHERE is_deactivated = 0').all() as any[];
        const { sendPushToUsers } = await import('./services/pushNotifications.js');
        const result = await sendPushToUsers(allUsers.map(u => u.id), title, body, data);
        res.json({ success: true, broadcast: true, totalUsers: allUsers.length, ...result });
        return;
      }

      // Send to specific user IDs list
      if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
        const { sendPushToUsers } = await import('./services/pushNotifications.js');
        const result = await sendPushToUsers(targetUserIds, title, body, data);
        res.json({ success: true, ...result });
        return;
      }

      // Send to a topic
      if (topic) {
        const { sendPushToTopic } = await import('./services/pushNotifications.js');
        const result = await sendPushToTopic(topic, title, body, data);
        res.json({ success: true, ...result });
        return;
      }

      // Send to a single user
      if (!targetUserId) {
        res.status(400).json({ error: 'userId, userIds, or topic required' });
        return;
      }
      const { sendPushToUser } = await import('./services/pushNotifications.js');
      const result = await sendPushToUser(targetUserId, title, body, data);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  // FCM diagnostics endpoint (admin only)
  app.get('/api/notifications/fcm-status', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { verifyToken } = await import('./middleware/auth.js');
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (!payload?.isAdmin) { res.status(403).json({ error: 'Admin access required' }); return; }
      const { getFCMStatus } = await import('./services/pushNotifications.js');
      const db = (await import('./database/index.js')).default;
      const deviceCount = (db.prepare('SELECT COUNT(*) as count FROM devices').get() as any).count;
      const status = getFCMStatus();
      res.json({ ...status, registeredDevices: deviceCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Story API Endpoints ───
  app.get('/api/stories', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const authHeader = req.headers.authorization;
      let userId = '';
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const { verifyToken } = await import('./middleware/auth.js');
          const p = verifyToken(authHeader.split(' ')[1]);
          if (p) userId = p.userId || p.sub || '';
        } catch {}
      }
      // Get stories from last 24 hours only
      const stories = db.prepare(`
        SELECT s.*, u.name as user_name, u.avatar as user_avatar,
          (SELECT COUNT(*) FROM story_views WHERE story_id = s.id) as view_count,
          CASE WHEN sv.id IS NOT NULL THEN 1 ELSE 0 END as is_seen
        FROM stories s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN story_views sv ON sv.story_id = s.id AND sv.user_id = ?
        WHERE s.created_at >= datetime('now', '-24 hours')
        ORDER BY s.created_at DESC
      `).all(userId) as any[];
      
      const result = stories.map(s => ({
        id: s.id,
        user: { id: s.user_id, name: s.user_name, avatar: s.user_avatar },
        image: s.image || '',
        type: s.type || 'image',
        text: s.text || '',
        backgroundColor: s.background_color || '',
        videoUrl: s.video_url || '',
        isSeen: !!s.is_seen,
        viewCount: s.view_count,
        createdAt: s.created_at,
      }));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/stories/:id/view', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { verifyToken } = await import('./middleware/auth.js');
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }
      const userId = payload.userId || payload.sub;
      const storyId = req.params.id;
      db.prepare('INSERT OR IGNORE INTO story_views (story_id, user_id) VALUES (?, ?)').run(storyId, userId);
      db.prepare('UPDATE stories SET is_seen = 1 WHERE id = ?').run(storyId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/stories/:id/reply', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { verifyToken } = await import('./middleware/auth.js');
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }
      const userId = payload.userId || payload.sub;
      const storyId = req.params.id;
      const { text } = req.body;
      if (!text) { res.status(400).json({ error: 'text required' }); return; }
      const id = crypto.randomBytes(16).toString('hex');
      db.prepare('INSERT INTO story_replies (id, story_id, user_id, text) VALUES (?, ?, ?, ?)').run(id, storyId, userId, text);
      // Notify story owner
      const story = db.prepare('SELECT user_id FROM stories WHERE id = ?').get(storyId) as any;
      if (story && story.user_id !== userId) {
        const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
        const notifId = crypto.randomBytes(16).toString('hex');
        db.prepare('INSERT INTO notifications (id, user_id, type, message, link) VALUES (?, ?, ?, ?, ?)').run(
          notifId, story.user_id, 'message', `${user?.name || 'مستخدم'} رد على قصتك`, `/messages/${userId}`
        );
        try {
          const { wsManager } = await import('./websocket/index.js');
          wsManager.sendToUser(story.user_id, JSON.stringify({
            type: 'notification:new',
            notification: { id: notifId, type: 'message', message: `${user?.name || 'مستخدم'} رد على قصتك`, time: new Date().toISOString(), link: `/messages/${userId}` }
          }));
        } catch {}
      }
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/stories/:id/react', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { verifyToken } = await import('./middleware/auth.js');
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }
      const userId = payload.userId || payload.sub;
      const storyId = req.params.id;
      const { emoji } = req.body;
      if (!emoji) { res.status(400).json({ error: 'emoji required' }); return; }
      // Toggle reaction
      const existing = db.prepare('SELECT id FROM story_reactions WHERE story_id = ? AND user_id = ? AND emoji = ?').get(storyId, userId, emoji) as any;
      if (existing) {
        db.prepare('DELETE FROM story_reactions WHERE id = ?').run(existing.id);
        res.json({ success: true, reacted: false });
      } else {
        const id = crypto.randomBytes(16).toString('hex');
        db.prepare('INSERT INTO story_reactions (id, story_id, user_id, emoji) VALUES (?, ?, ?, ?)').run(id, storyId, userId, emoji);
        // Notify story owner
        const story = db.prepare('SELECT user_id FROM stories WHERE id = ?').get(storyId) as any;
        if (story && story.user_id !== userId) {
          const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
          const notifId = crypto.randomBytes(16).toString('hex');
          db.prepare('INSERT INTO notifications (id, user_id, type, message, link) VALUES (?, ?, ?, ?, ?)').run(
            notifId, story.user_id, 'like', `${user?.name || 'مستخدم'} تفاعل مع قصتك ${emoji}`, null
          );
          try {
            const { wsManager } = await import('./websocket/index.js');
            wsManager.sendToUser(story.user_id, JSON.stringify({
              type: 'notification:new',
              notification: { id: notifId, type: 'like', message: `${user?.name || 'مستخدم'} تفاعل مع قصتك ${emoji}`, time: new Date().toISOString() }
            }));
          } catch {}
        }
        res.json({ success: true, reacted: true });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/stories/:id/viewers', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { verifyToken } = await import('./middleware/auth.js');
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }
      const storyId = req.params.id;
      // Verify story belongs to user
      const story = db.prepare('SELECT user_id FROM stories WHERE id = ?').get(storyId) as any;
      if (!story) { res.status(404).json({ error: 'Story not found' }); return; }
      const userId = payload.userId || payload.sub;
      if (story.user_id !== userId && !payload.isAdmin) {
        res.status(403).json({ error: 'Not your story' }); return;
      }
      const viewers = db.prepare(`
        SELECT sv.*, u.name, u.avatar FROM story_views sv
        JOIN users u ON u.id = sv.user_id
        WHERE sv.story_id = ?
        ORDER BY sv.created_at DESC
      `).all(storyId) as any[];
      res.json(viewers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Withdrawal API now handled in routes/wallet.ts ───

  // ─── Story Highlights API ───
  app.get('/api/users/:userId/highlights', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const { userId } = req.params;
      const highlights = db.prepare(`
        SELECT h.*, 
          (SELECT COUNT(*) FROM highlight_stories WHERE highlight_id = h.id) as story_count,
          (SELECT s.image FROM highlight_stories hs JOIN stories s ON s.id = hs.story_id WHERE hs.highlight_id = h.id LIMIT 1) as cover_image
        FROM story_highlights h
        WHERE h.user_id = ?
        ORDER BY h.created_at DESC
      `).all(userId) as any[];
      res.json(highlights);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/highlights', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { verifyToken } = await import('./middleware/auth.js');
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }
      const userId = payload.userId || payload.sub;
      const { name, storyIds } = req.body;
      if (!name || !storyIds?.length) { res.status(400).json({ error: 'name and storyIds required' }); return; }
      const id = crypto.randomBytes(16).toString('hex');
      db.prepare('INSERT INTO story_highlights (id, user_id, name) VALUES (?, ?, ?)').run(id, userId, name);
      const insertHS = db.prepare('INSERT OR IGNORE INTO highlight_stories (highlight_id, story_id) VALUES (?, ?)');
      for (const sid of storyIds) { insertHS.run(id, sid); }
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Delete expired stories (24h) ───
  app.delete('/api/stories/expired', async (_req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const result = db.prepare("DELETE FROM stories WHERE created_at < datetime('now', '-24 hours')").run();
      res.json({ success: true, deleted: result.changes });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Report user from chat ───
  app.post('/api/report', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { verifyToken } = await import('./middleware/auth.js');
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }
      const userId = payload.userId || payload.sub;
      const { targetUserId, reason, details } = req.body;
      if (!targetUserId || !reason) { res.status(400).json({ error: 'targetUserId and reason required' }); return; }
      // Create a complaint post (reuse existing complaints system)
      const id = crypto.randomBytes(16).toString('hex');
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
      const targetUser = db.prepare('SELECT name FROM users WHERE id = ?').get(targetUserId) as any;
      db.prepare('INSERT INTO posts (id, author_id, content, type, category, status) VALUES (?, ?, ?, ?, ?, ?)').run(
        id, userId, `بلاغ ضد ${targetUser?.name || 'مستخدم'}: ${reason}${details ? ' - ' + details : ''}`, 'status', 'complaint', 'active'
      );
      // Notify admin
      const notifId = crypto.randomBytes(16).toString('hex');
      db.prepare('INSERT INTO notifications (id, user_id, type, message) VALUES (?, ?, ?, ?)').run(
        notifId, 'admin', 'warning', `بلاغ جديد من ${user?.name || 'مستخدم'} ضد ${targetUser?.name || 'مستخدم'}`
      );
      res.json({ success: true, id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Scheduled Streams API ──────────────────────────────────────────
  app.get('/api/livestream/scheduled', async (_req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const streams = db.prepare(`
        SELECT ss.*, u.name as user_name, u.avatar as user_avatar
        FROM scheduled_streams ss
        JOIN users u ON u.id = ss.user_id
        WHERE ss.scheduled_at >= datetime('now')
        ORDER BY ss.scheduled_at ASC
        LIMIT 50
      `).all() as any[];
      res.json(streams);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/livestream/schedule', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { verifyToken } = await import('./middleware/auth.js');
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }
      const userId = payload.userId || payload.sub;
      const { title, description, scheduledAt, durationMinutes, category } = req.body;
      if (!title || !scheduledAt) { res.status(400).json({ error: 'title and scheduledAt required' }); return; }
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) { res.status(400).json({ error: 'يجب أن يكون الموعد في المستقبل' }); return; }
      const id = crypto.randomBytes(16).toString('hex');
      db.prepare('INSERT INTO scheduled_streams (id, user_id, title, description, scheduled_at, duration_minutes, category) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        id, userId, title, description || '', scheduledAt, durationMinutes || 60, category || ''
      );
      // Notify friends about scheduled stream
      try {
        const { sendPushToUsers } = await import('./services/pushNotifications.js');
        const friends = db.prepare('SELECT requester_id as fid FROM friendships WHERE addressee_id = ? AND status = ? UNION SELECT addressee_id as fid FROM friendships WHERE requester_id = ? AND status = ?').all(userId, 'accepted', userId, 'accepted') as any[];
        if (friends.length > 0) {
          const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
          const friendIds = friends.map((f: any) => f.fid);
          sendPushToUsers(friendIds, 'بث مباشر مجدول', `${user?.name || 'مستخدم'} جدول بث مباشر: ${title}`, { type: 'livestream', link: `/live-stream/${userId}` }).catch(() => {});
        }
      } catch {}
      res.json({ success: true, id });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/livestream/schedule/:id/remind', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { verifyToken } = await import('./middleware/auth.js');
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }
      const userId = payload.userId || payload.sub;
      const streamId = req.params.id;
      // Save reminder in stream_reminders table
      try {
        db.prepare('INSERT OR IGNORE INTO stream_reminders (stream_id, user_id) VALUES (?, ?)').run(streamId, userId);
      } catch {}
      db.prepare('UPDATE scheduled_streams SET reminder_count = reminder_count + 1 WHERE id = ?').run(streamId);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete('/api/livestream/schedule/:id', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { verifyToken } = await import('./middleware/auth.js');
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }
      const userId = payload.userId || payload.sub;
      const streamId = req.params.id;
      const stream = db.prepare('SELECT user_id FROM scheduled_streams WHERE id = ?').get(streamId) as any;
      if (!stream) { res.status(404).json({ error: 'Not found' }); return; }
      if (stream.user_id !== userId && !payload.isAdmin) { res.status(403).json({ error: 'Not your stream' }); return; }
      db.prepare('DELETE FROM scheduled_streams WHERE id = ?').run(streamId);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ─── Stream Gifts/Tips API ──────────────────────────────────────
  const GIFT_TYPES = [
    { id: 'rose', name: '🌹 وردة', amount: 5 },
    { id: 'heart', name: '❤️ قلب', amount: 10 },
    { id: 'star', name: '⭐ نجمة', amount: 25 },
    { id: 'crown', name: '👑 تاج', amount: 50 },
    { id: 'diamond', name: '💎 ألماسة', amount: 100 },
    { id: 'rocket', name: '🚀 صاروخ', amount: 200 },
  ];

  app.get('/api/livestream/gifts', (_req, res) => {
    res.json(GIFT_TYPES);
  });

  app.post('/api/livestream/gift', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const { verifyToken } = await import('./middleware/auth.js');
      const payload = verifyToken(authHeader.split(' ')[1]);
      if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }
      const userId = payload.userId || payload.sub;
      const { streamId, receiverId, giftType, message } = req.body;
      if (!streamId || !receiverId || !giftType) { res.status(400).json({ error: 'streamId, receiverId, giftType required' }); return; }

      const gift = GIFT_TYPES.find(g => g.id === giftType);
      if (!gift) { res.status(400).json({ error: 'Invalid gift type' }); return; }

      // Check balance
      const sender = db.prepare('SELECT wallet_balance, name FROM users WHERE id = ?').get(userId) as any;
      if (!sender || sender.wallet_balance < gift.amount) { res.status(400).json({ error: 'رصيد غير كافي' }); return; }

      // Deduct from sender
      db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?').run(gift.amount, userId);
      // Add to receiver (90% to creator, 10% platform fee)
      const receiverAmount = gift.amount * 0.9;
      db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(receiverAmount, receiverId);

      // Record gift
      const id = crypto.randomBytes(16).toString('hex');
      db.prepare('INSERT INTO stream_gifts (id, stream_id, sender_id, receiver_id, gift_type, gift_name, amount, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        id, streamId, userId, receiverId, giftType, gift.name, gift.amount, message || ''
      );

      // Record transactions
      const txId1 = crypto.randomBytes(16).toString('hex');
      db.prepare('INSERT INTO transactions (id, user_id, type, amount, method, status) VALUES (?, ?, ?, ?, ?, ?)').run(
        txId1, userId, 'gift_sent', gift.amount, 'wallet', 'completed'
      );
      const txId2 = crypto.randomBytes(16).toString('hex');
      db.prepare('INSERT INTO transactions (id, user_id, type, amount, method, status) VALUES (?, ?, ?, ?, ?, ?)').run(
        txId2, receiverId, 'gift_received', receiverAmount, 'wallet', 'completed'
      );

      // Notify receiver via WebSocket
      try {
        const { wsManager } = await import('./websocket/index.js');
        wsManager.sendToUser(receiverId, JSON.stringify({
          type: 'livestream:gift',
          gift: { id, giftType, giftName: gift.name, amount: gift.amount, senderName: sender.name, message }
        }));
      } catch {}

      res.json({ success: true, id, amount: gift.amount, giftName: gift.name });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/livestream/:streamId/gifts', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const streamId = req.params.streamId;
      const gifts = db.prepare(`
        SELECT sg.*, u.name as sender_name, u.avatar as sender_avatar
        FROM stream_gifts sg
        JOIN users u ON u.id = sg.sender_id
        WHERE sg.stream_id = ?
        ORDER BY sg.created_at DESC
        LIMIT 100
      `).all(streamId) as any[];
      res.json(gifts);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/livestream/:streamId/gift-stats', async (req, res) => {
    try {
      const db = (await import('./database/index.js')).default;
      const streamId = req.params.streamId;
      const stats = db.prepare(`
        SELECT gift_type, gift_name, COUNT(*) as count, SUM(amount) as total_amount
        FROM stream_gifts
        WHERE stream_id = ?
        GROUP BY gift_type
        ORDER BY count DESC
      `).all(streamId) as any[];
      const total = db.prepare('SELECT SUM(amount) as total FROM stream_gifts WHERE stream_id = ?').get(streamId) as any;
      res.json({ stats, total: total?.total || 0 });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // 7e. API 404 handler (MUST be after all /api/* routes, before Vite catch-all)
  app.use('/api', (req, res) => {
    console.log(`[404] API route not found: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'API endpoint not found', path: req.path, method: req.method });
  });

  // 8. Vite middleware (dev) / Static files (prod)
  // This is LAST because it acts as a catch-all for non-API requests
  if (isDev) {
    const vite = await createViteServer({
      root: rootDir,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built frontend from dist/client
    const clientPath = path.resolve(rootDir, 'dist', 'client');
    // Fallback to dist/ if dist/client doesn't exist (local builds)
    const distPath = fs.existsSync(clientPath) ? clientPath : path.resolve(rootDir, 'dist');
    console.log(`[PROD] Serving static files from: ${distPath}`);
    app.use(express.static(distPath, {
      maxAge: '1d',
      etag: true,
      lastModified: true,
    }));

    // SPA fallback: only for routes that don't match a static file
    // Excludes: /api/*, /download/*, /uploads/*, /get-app, /health
    app.get('*', (req, res, next) => {
      // Skip API and known paths
      if (req.path.startsWith('/api/') ||
          req.path.startsWith('/download/') ||
          req.path.startsWith('/uploads/') ||
          req.path === '/get-app' ||
          req.path === '/health' ||
          req.path === '/manifest.webmanifest' ||
          req.path === '/sw.js' ||
          req.path === '/offline.html' ||
          req.path.startsWith('/icons/')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // General error handler
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    res.status(err.status || 500).json({
      error: isDev ? err.message : 'Internal server error',
      ...(isDev && { stack: err.stack }),
    });
  });

  // --- Create HTTP server and attach WebSocket ---
  const server = createHttpServer(app);

  // Initialize WebSocket server
  wsManager.initialize(server);

  // Make wsManager available to route handlers via app.locals
  app.locals.wsManager = wsManager;

  // --- Start Server ---
  server.listen(PORT, '0.0.0.0', async () => {
    console.log('');
    console.log('================================================');
    console.log(`  Nawaqes Server running on http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Health: http://localhost:${PORT}/api/health`);
    console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
    console.log('================================================');
    console.log('');

    if (isDev) {
      console.log('[DEV] Vite HMR is active. Rate limit: 500/10s.');
    } else {
      console.log('[PROD] Security headers enabled. Rate limit: 100/min.');
      console.log('[PROD] JWT_SECRET: ✅ Configured');
      console.log('[PROD] HSTS: ✅ Enabled');
    }

    // 🔧 Initialize auto-backup system
    try {
      const { initAutoBackup, createManualBackup, getBackupStats, createEventBackup } = await import('./database/backup-system.js');
      const { authMiddleware: authMid } = await import('./middleware/auth.js');
      initAutoBackup();

      // Manual backup endpoint (admin only)
      app.post('/api/admin/backup', authMid, async (req: express.Request, res: express.Response) => {
        try {
          const payload = (req as any).user as any;
          if (!payload.isAdmin) { res.status(403).json({ error: 'ممنوع' }); return; }
          createManualBackup();
          res.json({ success: true, message: 'تم إنشاء نسخة احتياطية' });
        } catch (err: any) {
          res.status(500).json({ error: 'فشل النسخ الاحتياطي', details: err.message });
        }
      });

      // Backup stats endpoint (admin only)
      app.get('/api/admin/backup-stats', authMid, async (req: express.Request, res: express.Response) => {
        try {
          const payload = (req as any).user as any;
          if (!payload.isAdmin) { res.status(403).json({ error: 'ممنوع' }); return; }
          res.json(getBackupStats());
        } catch (err: any) {
          res.status(500).json({ error: 'فشل جلب الإحصائيات', details: err.message });
        }
      });

      // Save .env to persistent storage so it survives rebuilds
      app.post('/api/admin/persist-env', authMid, async (req: express.Request, res: express.Response) => {
        try {
          const payload = (req as any).user as any;
          if (!payload.isAdmin) { res.status(403).json({ error: 'ممنوع' }); return; }
          const fs2 = await import('fs');
          const envPath = path.resolve(process.cwd(), '.env');
          const persistentEnvPath = '/data/.env';
          if (fs2.existsSync(envPath)) {
            fs2.copyFileSync(envPath, persistentEnvPath);
            res.json({ success: true, message: 'تم حفظ الإعدادات بشكل دائم' });
          } else {
            res.status(404).json({ error: 'ملف .env غير موجود' });
          }
        } catch (err: any) {
          res.status(500).json({ error: 'فشل حفظ الإعدادات', details: err.message });
        }
      });

    } catch (err: any) {
      console.warn('[BACKUP] Init failed:', err.message);
    }
  });
}

startServer().catch((err) => {
  console.error('[STARTUP] Failed to start server:', err);
  process.exit(1);
});
