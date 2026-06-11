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

  // 7b. API 404 handler (MUST be before Vite catch-all)
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
    app.get('*', (_req, res) => {
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
  server.listen(PORT, '0.0.0.0', () => {
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
  });
}

startServer().catch((err) => {
  console.error('[STARTUP] Failed to start server:', err);
  process.exit(1);
});
