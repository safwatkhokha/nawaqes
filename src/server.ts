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
  // 🔧 CRITICAL: Auto-restore database BEFORE anything else
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
      // Get user from auth header (optional - allows guest device registration)
      let userId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const { verifyToken } = await import('./middleware/auth.js');
          const payload = verifyToken(authHeader.split(' ')[1]);
          if (payload) userId = payload.userId || payload.sub || null;
        } catch { /* ignore auth errors */ }
      }
      // TODO: Save to database (devices table) — for now, log only
      console.log(`[FCM] Device registered: platform=${platform}, user=${userId || 'guest'}, token=${token.substring(0, 20)}...`);
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
      // TODO: integrate with FCM topic subscription server-side
      console.log(`[FCM] Topic subscription: ${topic}`);
      res.json({ success: true, subscribed: true, topic });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to subscribe' });
    }
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
      const { initAutoBackup } = await import('./database/backup-system.js');
      initAutoBackup();
    } catch (err: any) {
      console.warn('[BACKUP] Init failed:', err.message);
    }
  });
}

startServer().catch((err) => {
  console.error('[STARTUP] Failed to start server:', err);
  process.exit(1);
});
