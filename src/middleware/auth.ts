// ─── JWT Auth Middleware (Production-Secure) ────────────────────────
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Lazy JWT_SECRET: read at first use, not at import time, so dotenv.config() can run first
let _jwtSecret: string | null = null;
function getJwtSecret(): string {
  if (_jwtSecret) return _jwtSecret;
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'REPLACE-WITH-YOUR-OWN-SECURE-RANDOM-STRING') {
    // Should not happen since server.ts auto-generates JWT_SECRET
    // But as a fallback, generate one instead of crashing
    const fallback = crypto.randomBytes(64).toString('hex');
    process.env.JWT_SECRET = fallback;
    _jwtSecret = fallback;
    return _jwtSecret;
  }
  _jwtSecret = secret;
  return _jwtSecret;
}

function getJwtExpires(): string {
  return process.env.JWT_EXPIRES_IN || '7d';
}

export interface JwtPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
  sub?: string; // alias for userId (standard JWT claim)
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpires() as any });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
    return;
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'جلسة منتهية، سجل دخولك مجدداً' });
    return;
  }
  (req as any).user = payload;
  next();
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as JwtPayload;
  if (!user?.isAdmin) {
    res.status(403).json({ error: 'صلاحيات المدير مطلوبة' });
    return;
  }
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (payload) (req as any).user = payload;
  }
  next();
}
