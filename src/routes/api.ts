// ─── General API Routes (categories, news, stories, trends, users, promotions, friends) ─
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import db from '../database/index.js';
import { authMiddleware, optionalAuth, JwtPayload } from '../middleware/auth.js';
import { getDefaultAvatar } from '../utils/serverAvatar.js';
import { notifyFriendRequest, sendPushToUser } from '../services/pushNotifications.js';

const router = Router();

// ─── File Upload Setup ──────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.resolve('uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for images (increased)
  fileFilter: (_req, file, cb) => {
    // Accept ALL image and video formats - no restriction on extensions
    const ext = path.extname(file.originalname).toLowerCase();
    // Accept any file that has an extension or is an image/video MIME type
    const isMediaMime = /^(image|video)\//.test(file.mimetype) || file.mimetype === 'application/octet-stream';
    const hasExt = ext.length > 1; // Has a valid extension (e.g., .jpg, .png)
    cb(null, isMediaMime || hasExt); // Accept all media files with valid extensions
  },
});

// Video upload setup
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const videoDir = path.resolve('uploads/videos');
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });
    cb(null, videoDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `vid_${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for videos (increased)
  fileFilter: (_req, file, cb) => {
    // Accept ALL video formats - no restriction on extensions
    const ext = path.extname(file.originalname).toLowerCase();
    const isVideoMime = /^video\//.test(file.mimetype) || file.mimetype === 'application/octet-stream';
    const hasExt = ext.length > 1;
    // Accept any video file with a valid extension or video MIME type
    cb(null, isVideoMime || hasExt);
  },
});

// POST /api/upload — Accept both images and videos
const mediaUpload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for any media (increased)
  fileFilter: (_req, file, cb) => {
    // Accept ALL image and video formats - no restriction
    const ext = path.extname(file.originalname).toLowerCase();
    const isMediaMime = /^(image|video)\//.test(file.mimetype) || file.mimetype === 'application/octet-stream';
    const hasExt = ext.length > 1;
    // Accept any media file with valid extension or media MIME type
    cb(null, isMediaMime || hasExt);
  },
});
router.post('/upload', authMiddleware, mediaUpload.single('image'), (req: Request, res: Response) => {
  if (!req.file) { res.status(400).json({ error: 'لم يتم رفع أي ملف' }); return; }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// POST /api/videos/upload - Upload video file
router.post('/videos/upload', authMiddleware, videoUpload.single('video'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'لم يتم رفع أي فيديو' });
      return;
    }
    const url = `/uploads/videos/${req.file.filename}`;
    const size = req.file.size;
    res.json({ url, filename: req.file.filename, size });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل رفع الفيديو', details: err.message });
  }
});

// Error handler for multer video upload errors
router.use('/videos/upload', (err: any, _req: Request, res: Response, _next: any) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'حجم الفيديو يتجاوز الحد المسموح (500 ميجابايت)' });
    return;
  }
  if (err.message) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'فشل رفع الفيديو' });
});

// POST /api/market-live/link-video - Link uploaded video to a post or market listing
router.post('/market-live/link-video', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { postId, videoUrl, thumbnailUrl, duration, listingType } = req.body;

    if (!postId || !videoUrl) {
      res.status(400).json({ error: 'معرف المنشور ورابط الفيديو مطلوبان' });
      return;
    }

    // Validate the video URL belongs to our uploads
    if (!videoUrl.startsWith('/uploads/')) {
      res.status(400).json({ error: 'رابط الفيديو غير صالح' });
      return;
    }

    const videoId = crypto.randomBytes(16).toString('hex').toLowerCase();

    if (listingType === 'market_listing') {
      // Link to market listing
      const listing = db.prepare('SELECT * FROM market_listings WHERE id = ? AND seller_id = ?').get(postId, payload.userId) as any;
      if (!listing) {
        res.status(404).json({ error: 'الإعلان غير موجود أو ليس ملكك' });
        return;
      }
      // Insert into ad_videos with a reference to a virtual post
      db.prepare(`
        INSERT INTO ad_videos (id, post_id, user_id, video_url, thumbnail_url, duration)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(videoId, postId, payload.userId, videoUrl, thumbnailUrl || '', duration || 0);
    } else {
      // Link to post
      const post = db.prepare('SELECT * FROM posts WHERE id = ? AND author_id = ?').get(postId, payload.userId) as any;
      if (!post) {
        res.status(404).json({ error: 'المنشور غير موجود أو ليس ملكك' });
        return;
      }
      // Update the post's video_url
      db.prepare(`UPDATE posts SET video_url = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(videoUrl, postId);
      // Also insert into ad_videos for the video feed
      db.prepare(`
        INSERT INTO ad_videos (id, post_id, user_id, video_url, thumbnail_url, duration)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(videoId, postId, payload.userId, videoUrl, thumbnailUrl || '', duration || 0);
    }

    res.status(201).json({
      id: videoId,
      videoUrl,
      thumbnailUrl: thumbnailUrl || '',
      duration: duration || 0,
      message: 'تم ربط الفيديو بنجاح',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل ربط الفيديو', details: err.message });
  }
});

// GET /api/market-live/my-videos - Get current user's uploaded videos
router.get('/market-live/my-videos', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const videos = db.prepare(`
      SELECT v.*, p.content as post_content, p.image as post_image,
             ml.title as listing_title, ml.images as listing_images
      FROM ad_videos v
      LEFT JOIN posts p ON p.id = v.post_id
      LEFT JOIN market_listings ml ON ml.id = v.post_id
      WHERE v.user_id = ? AND v.status = 'active'
      ORDER BY v.created_at DESC
    `).all(payload.userId);

    const result = videos.map((v: any) => ({
      id: v.id,
      postId: v.post_id,
      videoUrl: v.video_url,
      thumbnailUrl: v.thumbnail_url || v.post_image || '',
      duration: v.duration,
      views: v.views,
      likes: v.likes,
      shares: v.shares,
      saves: v.saves,
      isFeatured: !!v.is_featured,
      title: v.listing_title || v.post_content?.substring(0, 60) || '',
      createdAt: v.created_at,
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب فيديوهاتي', details: err.message });
  }
});

// ─── Active Admin Alerts (for alert bar, auth required but not admin) ──
router.get('/alerts/active', authMiddleware, (_req: Request, res: Response) => {
  try {
    const alerts = db.prepare(
      `SELECT id, title, content, source, category, is_alert, created_at
       FROM news_items
       WHERE is_alert = 1
       ORDER BY created_at DESC
       LIMIT 20`
    ).all() as any[];
    res.json({ alerts });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب التنبيهات', details: err.message });
  }
});

// ─── Categories ─────────────────────────────────────────────────────
router.get('/categories', (_req: Request, res: Response) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort').all();
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب الفئات', details: err.message });
  }
});

// ─── News ───────────────────────────────────────────────────────────
router.get('/news', (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    let query = 'SELECT * FROM news_items';
    const params: string[] = [];
    if (category && ['general', 'egypt', 'world', 'urgent'].includes(category)) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    query += ' ORDER BY created_at DESC LIMIT 50';
    const news = db.prepare(query).all(...params);
    res.json(news);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب الأخبار', details: err.message });
  }
});

// ─── Stories ────────────────────────────────────────────────────────
router.get('/stories', optionalAuth, (_req: Request, res: Response) => {
  try {
    const stories = db.prepare(`
      SELECT s.*, u.name as user_name, u.avatar as user_avatar
      FROM stories s JOIN users u ON u.id = s.user_id
      WHERE s.created_at >= datetime('now', '-24 hours')
      ORDER BY s.created_at DESC
    `).all().map((s: any) => ({
      id: s.id,
      image: s.image,
      type: s.type,
      text: s.text,
      backgroundColor: s.background_color,
      isSeen: !!s.is_seen,
      createdAt: s.created_at,
      user: { id: s.user_id, name: s.user_name, avatar: s.user_avatar },
    }));
    res.json(stories);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب القصص', details: err.message });
  }
});

// POST /api/stories
router.post('/stories', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { image, type, text, backgroundColor } = req.body;

    const result = db.prepare('INSERT INTO stories (user_id, image, type, text, background_color) VALUES (?, ?, ?, ?, ?)')
      .run(payload.userId, image || '', type || 'image', text || '', backgroundColor || '');

    const story = db.prepare('SELECT * FROM stories WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(payload.userId) as any;

    // Emit WebSocket event so other users see the new story in real-time
    try {
      const wsManager = (req.app.locals as any).wsManager;
      if (wsManager) {
        wsManager.broadcast({ type: 'story:created', data: { userId: payload.userId } }, { excludeUserId: payload.userId });
      }
    } catch (wsErr: any) { console.error('[WS] Failed to emit story created:', wsErr.message); }

    res.status(201).json(story);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إنشاء القصة', details: err.message });
  }
});

// ─── Trends ─────────────────────────────────────────────────────────
router.get('/trends', (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    let query = 'SELECT * FROM market_trends';
    const params: string[] = [];
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    query += ' ORDER BY updated_at DESC';
    const trends = db.prepare(query).all(...params);
    res.json(trends);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب الاتجاهات', details: err.message });
  }
});

// ─── Refresh Trends (recompute from real data) ─────────────────────
router.post('/trends/refresh', authMiddleware, (_req: Request, res: Response) => {
  try {
    // Compute category-level stats from real posts
    const categoryStats = db.prepare(`
      SELECT 
        category,
        COUNT(*) as count,
        COALESCE(AVG(price), 0) as avg_price,
        COALESCE(SUM(likes), 0) as total_likes
      FROM posts 
      WHERE type = 'ad' AND status = 'active' AND category != '' AND category IS NOT NULL
      GROUP BY category 
      ORDER BY count DESC
    `).all() as any[];

    const categoryTrendData: Record<string, { recent: number; previous: number; avgPrice: number; count: number }> = {};
    for (const cat of categoryStats) {
      const recent = db.prepare(`
        SELECT COUNT(*) as count FROM posts 
        WHERE type = 'ad' AND status = 'active' AND category = ? 
        AND created_at >= datetime('now', '-7 days')
      `).get(cat.category) as any;
      const previous = db.prepare(`
        SELECT COUNT(*) as count FROM posts 
        WHERE type = 'ad' AND status = 'active' AND category = ? 
        AND created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')
      `).get(cat.category) as any;
      categoryTrendData[cat.category] = {
        recent: recent.count || 0,
        previous: previous.count || 0,
        avgPrice: cat.avg_price,
        count: cat.count,
      };
    }

    const categoryNames: Record<string, string> = {
      phones: 'هواتف', cars: 'سيارات', electronics: 'إلكترونيات', realEstate: 'عقارات',
      games: 'ألعاب', fashion: 'أزياء', services: 'خدمات', books: 'كتب',
      sports: 'رياضة', animals: 'حيوانات', jobs: 'وظائف', other: 'أخرى',
    };

    db.prepare('DELETE FROM market_trends').run();
    const insertTrend = db.prepare("INSERT INTO market_trends (id, item, trend, change, category, price, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))");

    for (const [cat, data] of Object.entries(categoryTrendData)) {
      if (data.count < 1) continue;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let changePercent = 0;
      if (data.previous > 0) {
        changePercent = Math.round(((data.recent - data.previous) / data.previous) * 100);
        if (changePercent > 3) trend = 'up';
        else if (changePercent < -3) trend = 'down';
      } else if (data.recent > 0) {
        changePercent = 100;
        trend = 'up';
      }
      const changeStr = changePercent >= 0 ? `+${changePercent}%` : `${changePercent}%`;
      insertTrend.run(`trend-real-${cat}`, categoryNames[cat] || cat, trend, changeStr, cat, Math.round(data.avgPrice));
    }

    const trends = db.prepare('SELECT * FROM market_trends ORDER BY updated_at DESC').all();
    res.json({ message: 'تم تحديث الاتجاهات من البيانات الحقيقية', trends });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحديث الاتجاهات', details: err.message });
  }
});

// ─── Opportunities (فرص قد تهمك) ──────────────────────────────────
// NEW: Supports multi-city targeting — promoted posts only show to users in targeted cities
router.get('/opportunities', optionalAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || null;
    const limit = Math.min(parseInt(req.query.limit as string) || 8, 20);

    // Get the current user's info for targeting (if authenticated)
    let userInterests: string[] = [];
    let userLocation = '';
    let userCityId = ''; // city ID derived from user location
    let userAge = 0;
    if (userId) {
      try {
        const userInfo = db.prepare('SELECT interests, location, date_of_birth FROM users WHERE id = ?').get(userId) as any;
        if (userInfo) {
          try { userInterests = JSON.parse(userInfo.interests || '[]'); } catch { userInterests = []; }
          userLocation = userInfo.location || '';
          // Calculate user age
          if (userInfo.date_of_birth) {
            const birthDate = new Date(userInfo.date_of_birth);
            const today = new Date();
            userAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              userAge--;
            }
          }
          // Try to match user location string to a city ID
          if (userLocation) {
            const cityMatch = db.prepare("SELECT id FROM cities_lookup WHERE name_ar = ? OR name_en = ? COLLATE NOCASE")
              .get(userLocation, userLocation) as any;
            if (cityMatch) userCityId = cityMatch.id;
          }
        }
      } catch { /* ignore */ }
    }

    // Fetch real posts that match user interests or are promoted
    let opportunities: any[] = [];

    // 1. First: Promoted posts that are active AND match targeting criteria
    const promotedPosts = db.prepare(`
      SELECT p.id, p.content, p.image, p.price, p.category, p.location, p.created_at,
             p.is_promoted, p.promotion_tier, p.targeting, p.target_city, p.target_interests,
             p.target_age_min, p.target_age_max,
             u.name as author_name, u.avatar as author_avatar, u.avatar_base64, u.is_verified
      FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.type = 'ad' AND p.status = 'active' AND p.is_promoted = 1 AND p.promotion_status = 'approved'
      ORDER BY p.reach_count DESC, p.created_at DESC
      LIMIT ?
    `).all(limit * 2) as any[];

    // Filter promoted posts by ALL targeting criteria (city, interests, age)
    const filteredPromotedPosts = promotedPosts.filter(p => {
      // City targeting filter
      if (p.targeting === 'city' && p.target_city) {
        if (userCityId || userLocation) {
          let targetCities: string[] = [];
          try {
            const parsed = JSON.parse(p.target_city || '[]');
            if (Array.isArray(parsed)) targetCities = parsed;
            else if (typeof parsed === 'string' && parsed.length > 0) targetCities = [parsed];
          } catch {
            if (p.target_city) targetCities = [p.target_city];
          }
          if (targetCities.length > 0) {
            const cityMatch = (userCityId && targetCities.includes(userCityId)) ||
              (userLocation && targetCities.some(c => userLocation.includes(c)));
            if (!cityMatch) return false;
          }
        }
      }

      // Interest targeting filter (flexible matching)
      if (p.targeting === 'interests' && p.target_interests) {
        let postInterests: string[] = [];
        try {
          const parsed = JSON.parse(p.target_interests || '[]');
          if (Array.isArray(parsed)) postInterests = parsed;
        } catch {
          postInterests = [p.target_interests];
        }
        if (postInterests.length > 0 && userInterests.length > 0) {
          const hasMatch = postInterests.some((interest: string) =>
            userInterests.some(ui =>
              ui === interest ||
              ui.toLowerCase() === interest.toLowerCase() ||
              ui.includes(interest) || interest.includes(ui) ||
              (ui === 'هواتف' && interest === 'phones') || (ui === 'phones' && interest === 'هواتف') ||
              (ui === 'سيارات' && interest === 'cars') || (ui === 'cars' && interest === 'سيارات') ||
              (ui === 'إلكترونيات' && interest === 'electronics') || (ui === 'electronics' && interest === 'إلكترونيات') ||
              (ui === 'عقارات' && interest === 'realEstate') || (ui === 'realEstate' && interest === 'عقارات') ||
              (ui === 'أزياء' && interest === 'fashion') || (ui === 'fashion' && interest === 'أزياء') ||
              (ui === 'ألعاب' && interest === 'games') || (ui === 'games' && interest === 'ألعاب') ||
              (ui === 'رياضة' && interest === 'sports') || (ui === 'sports' && interest === 'رياضة') ||
              (ui === 'كتب' && interest === 'books') || (ui === 'books' && interest === 'كتب') ||
              (ui === 'وظائف' && interest === 'jobs') || (ui === 'jobs' && interest === 'وظائف') ||
              (ui === 'خدمات' && interest === 'services') || (ui === 'services' && interest === 'خدمات') ||
              (ui === 'حيوانات' && interest === 'animals') || (ui === 'animals' && interest === 'حيوانات')
            )
          );
          if (!hasMatch) return false;
        }
      }

      // Age targeting filter
      if (p.target_age_min && p.target_age_max && p.target_age_min > 0 && p.target_age_max > 0) {
        if (userAge > 0) {
          if (userAge < p.target_age_min || userAge > p.target_age_max) return false;
        }
      }

      return true;
    });

    // 2. If user has interests, fetch posts matching their interests
    let interestPosts: any[] = [];
    if (userInterests.length > 0) {
      const placeholders = userInterests.map(() => 'p.category = ?').join(' OR ');
      interestPosts = db.prepare(`
        SELECT p.id, p.content, p.image, p.price, p.category, p.location, p.created_at,
               p.is_promoted, p.promotion_tier,
               u.name as author_name, u.avatar as author_avatar, u.avatar_base64, u.is_verified
        FROM posts p JOIN users u ON u.id = p.author_id
        WHERE p.type = 'ad' AND p.status = 'active' AND (${placeholders})
        ORDER BY p.likes DESC, p.created_at DESC
        LIMIT ?
      `).all(...userInterests, limit) as any[];
    }

    // 3. Fill remaining with recent popular posts
    const existingIds = new Set([...filteredPromotedPosts, ...interestPosts].map(p => p.id));
    const recentPosts = db.prepare(`
      SELECT p.id, p.content, p.image, p.price, p.category, p.location, p.created_at,
             p.is_promoted, p.promotion_tier,
             u.name as author_name, u.avatar as author_avatar, u.avatar_base64, u.is_verified
      FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.type = 'ad' AND p.status = 'active'
      ORDER BY p.likes DESC, p.created_at DESC
      LIMIT ?
    `).all(limit * 2) as any[];

    // Merge and deduplicate: promoted first, then interest-matched, then recent
    const seen = new Set<string>();
    const addPost = (p: any) => {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      // Parse target_city for display
      let targetCitiesForDisplay: string[] = [];
      if (p.targeting === 'city' && p.target_city) {
        try {
          const parsed = JSON.parse(p.target_city);
          targetCitiesForDisplay = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          targetCitiesForDisplay = [p.target_city];
        }
      }
      opportunities.push({
        id: p.id,
        content: p.content?.substring(0, 100) + (p.content?.length > 100 ? '...' : ''),
        image: p.image,
        price: p.price,
        category: p.category,
        location: p.location,
        isPromoted: !!p.is_promoted,
        promotionTier: p.promotion_tier,
        targeting: p.targeting,
        targetCities: targetCitiesForDisplay,
        createdAt: p.created_at,
        author: {
          name: p.author_name,
          avatar: p.avatar_base64 || p.author_avatar || getDefaultAvatar('default'),
          isVerified: !!p.is_verified,
        },
        matchReason: p.is_promoted ? 'promoted' :
          (p.category && userInterests.includes(p.category)) ? 'interest' : 'recent',
      });
    };

    filteredPromotedPosts.forEach(addPost);
    interestPosts.forEach(addPost);
    recentPosts.forEach(addPost);

    res.json(opportunities.slice(0, limit));
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب الفرص', details: err.message });
  }
});

// ─── Market Pulse Overview ──────────────────────────────────────────
router.get('/market-pulse/overview', optionalAuth, (_req: Request, res: Response) => {
  try {
    // Active ads count
    const activeAds = db.prepare("SELECT COUNT(*) as count FROM posts WHERE type = 'ad' AND status = 'active'").get() as any;

    // New ads today
    const newToday = db.prepare("SELECT COUNT(*) as count FROM posts WHERE type = 'ad' AND status = 'active' AND created_at >= datetime('now', '-1 day')").get() as any;

    // New ads this week
    const newThisWeek = db.prepare("SELECT COUNT(*) as count FROM posts WHERE type = 'ad' AND status = 'active' AND created_at >= datetime('now', '-7 days')").get() as any;

    // Total users
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_deactivated = 0").get() as any;

    // Average price
    const avgPrice = db.prepare("SELECT COALESCE(AVG(price), 0) as avg FROM posts WHERE type = 'ad' AND status = 'active' AND price > 0").get() as any;

    // Category distribution
    const categoryDist = db.prepare(`
      SELECT category, COUNT(*) as count, COALESCE(AVG(price), 0) as avg_price, 
             COALESCE(MIN(price), 0) as min_price, COALESCE(MAX(price), 0) as max_price
      FROM posts WHERE type = 'ad' AND status = 'active' AND category != '' AND category IS NOT NULL
      GROUP BY category ORDER BY count DESC LIMIT 10
    `).all();

    // Top ads by reach
    const topAds = db.prepare(`
      SELECT p.id, p.content, p.image, p.price, p.category, p.location, p.reach_count, p.likes, p.created_at,
             u.name as author_name, u.avatar as author_avatar
      FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.type = 'ad' AND p.status = 'active'
      ORDER BY p.reach_count DESC, p.likes DESC LIMIT 5
    `).all();

    // Supply & demand indicator per category
    const supplyDemand = db.prepare(`
      SELECT category, 
        COUNT(*) as supply,
        COALESCE(SUM(likes), 0) as demand_score
      FROM posts WHERE type = 'ad' AND status = 'active' AND category != '' AND category IS NOT NULL
      GROUP BY category ORDER BY demand_score DESC LIMIT 6
    `).all();

    // Price ranges per category
    const priceRanges = db.prepare(`
      SELECT category,
        COUNT(*) as count,
        COALESCE(MIN(price), 0) as min_price,
        COALESCE(MAX(price), 0) as max_price,
        COALESCE(AVG(price), 0) as avg_price
      FROM posts WHERE type = 'ad' AND status = 'active' AND price > 0 AND category != '' AND category IS NOT NULL
      GROUP BY category ORDER BY count DESC LIMIT 8
    `).all();

    // Weekly activity (ads per day in the last 7 days)
    const weeklyActivity = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM posts WHERE type = 'ad' AND status = 'active' AND created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at) ORDER BY date ASC
    `).all();

    res.json({
      activeAds: activeAds.count || 0,
      newToday: newToday.count || 0,
      newThisWeek: newThisWeek.count || 0,
      totalUsers: totalUsers.count || 0,
      avgPrice: Math.round(avgPrice.avg || 0),
      categoryDist,
      topAds: topAds.map((a: any) => ({
        id: a.id,
        content: a.content?.substring(0, 80) + (a.content?.length > 80 ? '...' : ''),
        image: a.image,
        price: a.price,
        category: a.category,
        location: a.location,
        reachCount: a.reach_count || 0,
        likes: a.likes || 0,
        authorName: a.author_name,
        authorAvatar: a.author_avatar,
        createdAt: a.created_at,
      })),
      supplyDemand: supplyDemand.map((s: any) => ({
        category: s.category,
        supply: s.supply,
        demandScore: s.demand_score,
        ratio: s.supply > 0 ? Math.round((s.demand_score / s.supply) * 10) / 10 : 0,
      })),
      priceRanges: priceRanges.map((p: any) => ({
        category: p.category,
        count: p.count,
        minPrice: p.min_price,
        maxPrice: p.max_price,
        avgPrice: Math.round(p.avg_price),
      })),
      weeklyActivity,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب نبض السوق', details: err.message });
  }
});

// ─── Notifications ──────────────────────────────────────────────────
router.get('/notifications', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    // Filter out 'like' type notifications — they're disabled per user request.
    // Also fetch only the latest 50 to keep the response small.
    const notifications = db.prepare(
      `SELECT id, type, message, post_id, user_id_ref, link, read, created_at
       FROM notifications
       WHERE user_id = ? AND type != 'like'
       ORDER BY created_at DESC LIMIT 50`
    ).all(payload.userId);
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب الإشعارات', details: err.message });
  }
});

// POST /api/notifications/mark-read
router.post('/notifications/mark-read', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(payload.userId);
    res.json({ message: 'تم قراءة جميع الإشعارات' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحديث الإشعارات', details: err.message });
  }
});

// POST /api/notifications/:id/mark-read - Mark a single notification as read
router.post('/notifications/:id/mark-read', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { id } = req.params;
    const result = db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(id, payload.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'الإشعار غير موجود' });
      return;
    }
    res.json({ message: 'تم تعليم الإشعار كمقروء' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحديث الإشعار', details: err.message });
  }
});

// DELETE /api/notifications/:id - Delete a single notification
router.delete('/notifications/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { id } = req.params;
    const result = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(id, payload.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'الإشعار غير موجود' });
      return;
    }
    res.json({ message: 'تم حذف الإشعار' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل حذف الإشعار', details: err.message });
  }
});

// ─── Promotion Requests ─────────────────────────────────────────────
router.post('/promotions', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { postId, tier, price, packageName, duration, estimatedReach, maxNotifications, includeMessages, targeting, targetCity, targetCities, cityCount, cityTierLabel, targetInterests, targetAgeMin, targetAgeMax } = req.body;

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as any;
    if (!post) { res.status(404).json({ error: 'المنشور غير موجود' }); return; }
    if (post.author_id !== payload.userId) { res.status(403).json({ error: 'يمكنك ترويج منشوراتك فقط' }); return; }

    // Validate targeting data
    // Support multi-city targeting (targetCities array) — available for ALL packages
    const finalTargetCities: string[] = targetCities && Array.isArray(targetCities) && targetCities.length > 0
      ? targetCities
      : targetCity ? [targetCity] : [];

    if (targeting === 'city' && finalTargetCities.length === 0) {
      res.status(400).json({ error: 'يجب تحديد مدينة واحدة على الأقل عند تفعيل استهداف المدن' }); return;
    }
    if (targeting === 'interests' && (!targetInterests || !Array.isArray(targetInterests) || targetInterests.length === 0)) {
      res.status(400).json({ error: 'يجب تحديد اهتمام واحد على الأقل لاستهداف الاهتمامات' }); return;
    }

    const user = db.prepare('SELECT name, avatar FROM users WHERE id = ?').get(payload.userId) as any;
    const wallet = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(payload.userId) as any;
    if (wallet.wallet_balance < price) { res.status(400).json({ error: 'رصيدك غير كافٍ للترويج' }); return; }

    // Deduct wallet balance immediately to prevent double-spending
    db.prepare("UPDATE users SET wallet_balance = wallet_balance - ?, updated_at = datetime('now') WHERE id = ?")
      .run(price, payload.userId);

    // Create transaction record for the promotion debit
    db.prepare('INSERT INTO transactions (user_id, type, amount, method, status) VALUES (?, ?, ?, ?, ?)')
      .run(payload.userId, 'promotion_debit', price, 'محفظة', 'completed');

    const promoId = crypto.randomBytes(16).toString('hex').toLowerCase();

    // Store target_cities as JSON array, and target_city as first city (backward compat)
    const targetCitiesJson = JSON.stringify(finalTargetCities);
    const firstCity = finalTargetCities[0] || '';

    db.prepare(`INSERT INTO promotion_requests
      (id, post_id, post_content, author_id, author_name, author_avatar, tier, price, package_name, duration, estimated_reach, max_notifications, include_messages, targeting, target_city, target_interests, target_age_min, target_age_max, city_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      promoId, postId, post.content, payload.userId, user.name, user.avatar,
      tier, price, packageName, duration, estimatedReach, maxNotifications,
      includeMessages ? 1 : 0, targeting,
      targetCitiesJson, JSON.stringify(targetInterests || []),
      targetAgeMin || 0, targetAgeMax || 0, finalTargetCities.length
    );

    // Don't set is_promoted=1 yet — only set it when admin approves.
    // Mark promotion_status as 'pending' so the UI can show the request was made.
    // Also set targeting data on the post itself for efficient querying
    db.prepare(`UPDATE posts SET promotion_status = 'pending', promotion_tier = ?,
      targeting = ?, target_city = ?, target_interests = ?, target_age_min = ?, target_age_max = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(tier, targeting || 'all', targetCitiesJson, JSON.stringify(targetInterests || []), targetAgeMin || 0, targetAgeMax || 0, postId);

    // Return the full created request so the frontend can use the real ID
    const createdRequest = db.prepare('SELECT * FROM promotion_requests WHERE id = ?').get(promoId) as any;
    res.status(201).json({
      id: createdRequest?.id || promoId,
      message: 'تم إرسال طلب الترويج بنجاح',
      request: createdRequest,
      targetCities: finalTargetCities,
      cityCount: finalTargetCities.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إرسال طلب الترويج', details: err.message });
  }
});

// ─── My Promotion Requests ──────────────────────────────────────────
router.get('/promotions/my-requests', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const requests = db.prepare('SELECT * FROM promotion_requests WHERE author_id = ? ORDER BY created_at DESC').all(payload.userId);
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب طلبات الترويج', details: err.message });
  }
});

// ─── Friends ────────────────────────────────────────────────────────
// GET /api/friends/stats - Get friends statistics
router.get('/friends/stats', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const uid = payload.userId;

    // Total accepted friends
    const totalFriends = (db.prepare(`
      SELECT COUNT(*) as cnt FROM friendships
      WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
    `).get(uid, uid) as any)?.cnt || 0;

    // Pending incoming requests
    const pendingIncoming = (db.prepare(`
      SELECT COUNT(*) as cnt FROM friendships
      WHERE addressee_id = ? AND status = 'pending'
    `).get(uid) as any)?.cnt || 0;

    // Pending sent requests
    const pendingSent = (db.prepare(`
      SELECT COUNT(*) as cnt FROM friendships
      WHERE requester_id = ? AND status = 'pending'
    `).get(uid) as any)?.cnt || 0;

    // Online friends count (from WebSocket manager)
    let onlineFriends = 0;
    try {
      const wsManager = (req.app.locals as any)?.wsManager;
      if (wsManager) {
        const friendRows = db.prepare(`
          SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END as fid
          FROM friendships WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
        `).all(uid, uid, uid) as any[];
        onlineFriends = friendRows.filter((f: any) => wsManager.isUserOnline(f.fid)).length;
      }
    } catch {}

    // Friends by label
    const friendsByLabel: Record<string, number> = { general: 0, close: 0, family: 0, work: 0 };
    try {
      const labelRows = db.prepare(`
        SELECT COALESCE(friend_label, 'general') as label, COUNT(*) as cnt
        FROM friendships
        WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
        GROUP BY friend_label
      `).all(uid, uid) as any[];
      for (const row of labelRows) {
        friendsByLabel[row.label || 'general'] = row.cnt;
      }
    } catch {}

    // Friends gained this week
    const friendsThisWeek = (db.prepare(`
      SELECT COUNT(*) as cnt FROM friendships
      WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
        AND created_at >= datetime('now', '-7 days')
    `).get(uid, uid) as any)?.cnt || 0;

    // Nearby friends (same location)
    let nearbyFriends = 0;
    try {
      const myLocation = (db.prepare('SELECT location FROM users WHERE id = ?').get(uid) as any)?.location;
      if (myLocation) {
        nearbyFriends = (db.prepare(`
          SELECT COUNT(*) as cnt FROM friendships f
          JOIN users u ON (
            CASE WHEN f.requester_id = ? THEN f.addressee_id = u.id ELSE f.requester_id = u.id END
          )
          WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
            AND u.location = ? AND u.location != ''
        `).get(uid, uid, uid, myLocation) as any)?.cnt || 0;
      }
    } catch {}

    res.json({
      totalFriends,
      pendingIncoming,
      pendingSent,
      onlineFriends,
      friendsByLabel,
      friendsThisWeek,
      nearbyFriends,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب إحصائيات الأصدقاء', details: err.message });
  }
});

// GET /api/friends/list
router.get('/friends/list', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const uid = payload.userId;

    // Check if friendships table exists first
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='friendships'").get() as any;
    if (!tableCheck) {
      res.json([]);
      return;
    }

    let friendships: any[];
    try {
      // Try the full query with all columns
      friendships = db.prepare(`
        SELECT f.id, f.created_at, f.status,
          CASE WHEN f.requester_id = ? THEN u2.id ELSE u1.id END as friend_id,
          CASE WHEN f.requester_id = ? THEN u2.name ELSE u1.name END as friend_name,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.avatar ELSE u1.avatar END, '') as friend_avatar,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.avatar_base64 ELSE u1.avatar_base64 END, '') as friend_avatar_base64,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.is_verified ELSE u1.is_verified END, 0) as friend_is_verified,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.is_trusted ELSE u1.is_trusted END, 0) as friend_is_trusted,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.trust_score ELSE u1.trust_score END, 50) as friend_trust_score,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.location ELSE u1.location END, '') as friend_location,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.interests ELSE u1.interests END, '[]') as friend_interests,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.last_seen_at ELSE u1.last_seen_at END, NULL) as friend_last_seen,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.gender ELSE u1.gender END, NULL) as friend_gender,
          COALESCE(f.friend_label, 'general') as friend_label
        FROM friendships f
        JOIN users u1 ON u1.id = f.requester_id
        JOIN users u2 ON u2.id = f.addressee_id
        WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
        ORDER BY f.created_at DESC
      `).all(uid, uid, uid, uid, uid, uid, uid, uid, uid, uid, uid, uid, uid, uid);
    } catch (queryErr: any) {
      // Fallback: simpler query without potentially missing columns
      try {
        friendships = db.prepare(`
          SELECT f.id, f.created_at,
            CASE WHEN f.requester_id = ? THEN u2.id ELSE u1.id END as friend_id,
            CASE WHEN f.requester_id = ? THEN u2.name ELSE u1.name END as friend_name,
            COALESCE(CASE WHEN f.requester_id = ? THEN u2.avatar ELSE u1.avatar END, '') as friend_avatar,
            '' as friend_avatar_base64,
            0 as friend_is_verified,
            0 as friend_is_trusted,
            50 as friend_trust_score,
            '' as friend_location,
            '[]' as friend_interests
          FROM friendships f
          JOIN users u1 ON u1.id = f.requester_id
          JOIN users u2 ON u2.id = f.addressee_id
          WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
          ORDER BY f.created_at DESC
        `).all(uid, uid, uid, uid, uid);
      } catch (fallbackErr: any) {
        // Ultimate fallback: just return empty list instead of 500 error
        res.json([]);
        return;
      }
    }

    const friends = friendships.map((f: any) => ({
      friendshipId: f.id,
      id: f.friend_id,
      name: f.friend_name,
      avatar: f.friend_avatar_base64 || f.friend_avatar || getDefaultAvatar(f.friend_id, f.friend_gender),
      isVerified: !!f.friend_is_verified,
      isTrusted: !!f.friend_is_trusted,
      trustScore: f.friend_trust_score || 50,
      location: f.friend_location || '',
      interests: (() => { try { return JSON.parse(f.friend_interests || '[]'); } catch { return []; } })(),
      friendSince: f.created_at,
      friendLabel: f.friend_label || 'general',
      lastSeen: f.friend_last_seen || null,
      isOnline: (req.app.locals as any)?.wsManager?.isUserOnline(f.friend_id) || false,
    }));

    res.json(friends);
  } catch (err: any) {
    // Return empty array instead of 500 to prevent UI crashes
    res.json([]);
  }
});

// GET /api/friends/suggestions
router.get('/friends/suggestions', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const user = db.prepare('SELECT interests FROM users WHERE id = ?').get(payload.userId) as any;
    if (!user) { res.json([]); return; }
    const userInterests: string[] = (() => { try { return JSON.parse(user.interests || '[]'); } catch { return []; } })();

    // Get IDs of existing friends and pending requests
    const existingFriends = db.prepare(`
      SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END as friend_id
      FROM friendships WHERE (requester_id = ? OR addressee_id = ?)
    `).all(payload.userId, payload.userId, payload.userId).map((r: any) => r.friend_id);

    // Get IDs of blocked users (both directions)
    const blockedIds = db.prepare(`
      SELECT CASE WHEN blocker_id = ? THEN blocked_id ELSE blocker_id END as blocked_id
      FROM blocked_users WHERE blocker_id = ? OR blocked_id = ?
    `).all(payload.userId, payload.userId, payload.userId).map((r: any) => r.blocked_id);

    const excludeIds = [...existingFriends, payload.userId, ...blockedIds];

    // Find users with matching interests who are not already friends
    let suggestions: any[] = [];
    if (userInterests.length > 0) {
      for (const interest of userInterests) {
        const matches = db.prepare(`
          SELECT id, name, avatar, avatar_base64, is_verified, is_trusted, trust_score, location, interests, last_seen_at, gender
          FROM users WHERE id != ? AND is_deactivated = 0 AND interests LIKE ?
          ORDER BY trust_score DESC LIMIT 5
        `).all(payload.userId, `%"${interest}"%`);
        suggestions.push(...matches);
      }
    }

    // If not enough suggestions, add random users
    if (suggestions.length < 5) {
      const moreUsers = db.prepare(`
        SELECT id, name, avatar, avatar_base64, is_verified, is_trusted, trust_score, location, interests, last_seen_at, gender
        FROM users WHERE id != ? AND is_deactivated = 0
        ORDER BY RANDOM() LIMIT 10
      `).all(payload.userId);
      suggestions.push(...moreUsers);
    }

    // Deduplicate and filter out existing friends
    const seen = new Set<string>();
    const result = suggestions.filter((u: any) => {
      if (seen.has(u.id) || excludeIds.includes(u.id)) return false;
      seen.add(u.id);
      return true;
    }).slice(0, 10).map((u: any) => {
      // Compute real mutual friends count by counting shared accepted friendships
      let mutualCount = 0;
      try {
        mutualCount = (db.prepare(`
          SELECT COUNT(*) as cnt FROM friendships f1
          JOIN friendships f2 ON (
            CASE WHEN f1.requester_id = ? THEN f1.addressee_id ELSE f1.requester_id END
            =
            CASE WHEN f2.requester_id = ? THEN f2.addressee_id ELSE f2.requester_id END
          )
          WHERE f1.status = 'accepted' AND f2.status = 'accepted'
            AND (f1.requester_id = ? OR f1.addressee_id = ?)
            AND (f2.requester_id = ? OR f2.addressee_id = ?)
        `).get(payload.userId, u.id, payload.userId, payload.userId, u.id, u.id) as any)?.cnt || 0;
      } catch { mutualCount = 0; }

      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar_base64 || u.avatar || getDefaultAvatar(u.id, u.gender),
        isVerified: !!u.is_verified,
        isTrusted: !!u.is_trusted,
        trustScore: u.trust_score || 50,
        location: u.location || '',
        interests: JSON.parse(u.interests || '[]'),
        mutualFriends: mutualCount,
        lastSeen: u.last_seen_at || null,
        isOnline: (req.app.locals as any)?.wsManager?.isUserOnline(u.id) || false,
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب الاقتراحات', details: err.message });
  }
});

router.get('/friends/requests', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const requests = db.prepare(`
      SELECT f.id, f.status, f.created_at,
        u.id as user_id, u.name, u.avatar, u.avatar_base64, u.is_verified
      FROM friendships f
      JOIN users u ON u.id = f.requester_id
      WHERE f.addressee_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `).all(payload.userId);

    res.json(requests.map((r: any) => ({
      id: r.id,
      user: { id: r.user_id, name: r.name, avatar: r.avatar_base64 || r.avatar || getDefaultAvatar(r.user_id, r.gender), isVerified: !!r.is_verified },
      timestamp: r.created_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب طلبات الصداقة', details: err.message });
  }
});

router.post('/friends/request', authMiddleware, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { userId } = req.body;
    if (!userId) { res.status(400).json({ error: 'معرف المستخدم مطلوب' }); return; }
    if (userId === payload.userId) { res.status(400).json({ error: 'لا يمكنك إرسال طلب صداقة لنفسك' }); return; }

    // Check if user exists
    const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any;
    if (!targetUser) { res.status(404).json({ error: 'المستخدم غير موجود' }); return; }

    // Check if either user has blocked the other
    const blockCheck = db.prepare('SELECT id FROM blocked_users WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)')
      .get(payload.userId, userId, userId, payload.userId) as any;
    if (blockCheck) { res.status(403).json({ error: 'لا يمكنك إرسال طلب صداقة لهذا المستخدم' }); return; }

    // Check if already friends or request already sent
    const existing = db.prepare('SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)')
      .get(payload.userId, userId, userId, payload.userId) as any;
    if (existing) {
      if (existing.status === 'accepted') { res.status(400).json({ error: 'أنتما أصدقاء بالفعل' }); return; }
      if (existing.status === 'pending' && existing.requester_id === payload.userId) { res.status(400).json({ error: 'لقد أرسلت طلباً بالفعل' }); return; }
      if (existing.status === 'pending' && existing.addressee_id === payload.userId) { res.status(400).json({ error: 'لديك طلب صداقة من هذا المستخدم' }); return; }
      if (existing.status === 'rejected') {
        // If previously rejected, allow resending by deleting the old record
        db.prepare('DELETE FROM friendships WHERE id = ?').run(existing.id);
      }
    }

    db.prepare('INSERT OR IGNORE INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, ?)')
      .run(payload.userId, userId, 'pending');

    // Create notification for the addressee
    const sender = db.prepare('SELECT name, avatar, avatar_base64, is_verified FROM users WHERE id = ?').get(payload.userId) as any;
    if (sender) {
      db.prepare('INSERT INTO notifications (user_id, type, message, user_id_ref) VALUES (?, ?, ?, ?)')
        .run(userId, 'friend', `أرسل ${sender.name} طلب صداقة`, payload.userId);
    }

    // Emit WebSocket event for real-time friend request notification
    try {
      const wsManager = (req.app.locals as any).wsManager;
      if (wsManager && sender) {
        // Get the friendship ID
        const friendship = db.prepare('SELECT id FROM friendships WHERE requester_id = ? AND addressee_id = ? AND status = ?')
          .get(payload.userId, userId, 'pending') as any;
        wsManager.emitFriendRequest(userId, {
          id: friendship?.id,
          user: {
            id: payload.userId,
            name: sender.name,
            avatar: sender.avatar_base64 || sender.avatar || '',
            isVerified: !!sender.is_verified,
          },
          timestamp: new Date().toISOString(),
        });
        // Also emit notification event
        wsManager.emitNotification(userId, {
          type: 'friend',
          message: `أرسل ${sender.name} طلب صداقة`,
          userId: payload.userId,
          link: `/user/${payload.userId}`,
          time: new Date().toISOString(),
        });
      }
    } catch (wsErr: any) {
      console.error('[WS] Failed to emit friend request:', wsErr.message);
    }

    // Send FCM push notification for friend request
    try {
      if (sender) {
        await notifyFriendRequest(userId, sender.name);
      }
    } catch (pushErr: any) {
      console.error('[FCM] Failed to send friend request push:', pushErr.message);
    }

    res.json({ message: 'تم إرسال طلب الصداقة' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إرسال طلب الصداقة', details: err.message });
  }
});

router.post('/friends/accept/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const friendship = db.prepare('SELECT * FROM friendships WHERE id = ? AND addressee_id = ?').get(req.params.id, payload.userId) as any;
    if (!friendship) { res.status(404).json({ error: 'الطلب غير موجود' }); return; }

    db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(req.params.id);

    // Notify the requester that their friend request was accepted
    const accepter = db.prepare('SELECT name, avatar, avatar_base64 FROM users WHERE id = ?').get(payload.userId) as any;
    if (accepter) {
      db.prepare('INSERT INTO notifications (user_id, type, message, user_id_ref) VALUES (?, ?, ?, ?)')
        .run(friendship.requester_id, 'friend', `قبل ${accepter.name} طلب الصداقة`, payload.userId);
    }

    // Emit WebSocket events for real-time friend acceptance
    try {
      const wsManager = (req.app.locals as any).wsManager;
      if (wsManager) {
        // Notify the requester
        wsManager.emitFriendAccepted(friendship.requester_id, {
          friendshipId: req.params.id,
          user: {
            id: payload.userId,
            name: accepter?.name || '',
            avatar: accepter?.avatar_base64 || accepter?.avatar || '',
          },
        });
        wsManager.emitNotification(friendship.requester_id, {
          type: 'friend',
          message: `قبل ${accepter?.name || ''} طلب الصداقة`,
          userId: payload.userId,
          link: `/user/${payload.userId}`,
          time: new Date().toISOString(),
        });
      }
    } catch (wsErr: any) {
      console.error('[WS] Failed to emit friend accepted:', wsErr.message);
    }

    // Send FCM push notification for friend request acceptance
    try {
      if (accepter) {
        await sendPushToUser(friendship.requester_id, 'طلب صداقة مقبول', `قبل ${accepter.name} طلب الصداقة`, { type: 'friend_accepted', link: '/friends' });
      }
    } catch (pushErr: any) {
      console.error('[FCM] Failed to send friend accepted push:', pushErr.message);
    }

    res.json({ message: 'تم قبول طلب الصداقة' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل قبول الصداقة', details: err.message });
  }
});

router.post('/friends/reject/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    db.prepare("UPDATE friendships SET status = 'rejected' WHERE id = ? AND addressee_id = ?").run(req.params.id, payload.userId);
    res.json({ message: 'تم رفض طلب الصداقة' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل رفض الصداقة', details: err.message });
  }
});

// GET /api/friends/sent - Get sent friend requests (pending requests I sent)
router.get('/friends/sent', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const sent = db.prepare(`
      SELECT f.id, f.status, f.created_at,
        u.id as user_id, u.name, u.avatar, u.avatar_base64, u.is_verified
      FROM friendships f
      JOIN users u ON u.id = f.addressee_id
      WHERE f.requester_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `).all(payload.userId);

    res.json(sent.map((r: any) => ({
      id: r.id,
      user: { id: r.user_id, name: r.name, avatar: r.avatar_base64 || r.avatar || getDefaultAvatar(r.user_id, r.gender), isVerified: !!r.is_verified },
      timestamp: r.created_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب الطلبات المرسلة', details: err.message });
  }
});

// POST /api/friends/cancel/:id - Cancel a sent friend request
router.post('/friends/cancel/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const result = db.prepare("DELETE FROM friendships WHERE id = ? AND requester_id = ? AND status = 'pending'").run(req.params.id, payload.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'الطلب غير موجود أو لا يمكن إلغاؤه' });
      return;
    }
    res.json({ message: 'تم إلغاء طلب الصداقة' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إلغاء طلب الصداقة', details: err.message });
  }
});

// POST /api/friends/unfriend/:friendshipId - Remove an accepted friendship
router.post('/friends/unfriend/:friendshipId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const result = db.prepare("DELETE FROM friendships WHERE id = ? AND status = 'accepted' AND (requester_id = ? OR addressee_id = ?)")
      .run(req.params.friendshipId, payload.userId, payload.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'الصداقة غير موجودة' });
      return;
    }
    res.json({ message: 'تم إلغاء الصداقة' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إلغاء الصداقة', details: err.message });
  }
});

// POST /api/friends/unfriend-by-user/:userId - Remove friendship by friend's user ID (not friendship ID)
router.post('/friends/unfriend-by-user/:userId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { userId } = req.params;
    if (!userId) { res.status(400).json({ error: 'معرف المستخدم مطلوب' }); return; }

    const result = db.prepare(
      "DELETE FROM friendships WHERE status = 'accepted' AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))"
    ).run(payload.userId, userId, userId, payload.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'الصداقة غير موجودة' });
      return;
    }
    res.json({ message: 'تم إلغاء الصداقة' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إلغاء الصداقة', details: err.message });
  }
});

// POST /api/friends/label/:friendshipId - Set friend label/category
router.post('/friends/label/:friendshipId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { label } = req.body;
    const validLabels = ['general', 'close', 'family', 'work'];
    if (!label || !validLabels.includes(label)) {
      res.status(400).json({ error: 'التصنيف غير صالح. الاستخدام: general, close, family, work' });
      return;
    }
    const result = db.prepare(
      "UPDATE friendships SET friend_label = ? WHERE id = ? AND status = 'accepted' AND (requester_id = ? OR addressee_id = ?)"
    ).run(label, req.params.friendshipId, payload.userId, payload.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'الصداقة غير موجودة' });
      return;
    }
    res.json({ message: 'تم تحديث تصنيف الصديق' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحديث التصنيف', details: err.message });
  }
});

// POST /api/friends/label-by-user/:userId - Set friend label by user ID
router.post('/friends/label-by-user/:userId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { userId } = req.params;
    const { label } = req.body;
    const validLabels = ['general', 'close', 'family', 'work'];
    if (!label || !validLabels.includes(label)) {
      res.status(400).json({ error: 'التصنيف غير صالح' });
      return;
    }
    const result = db.prepare(
      "UPDATE friendships SET friend_label = ? WHERE status = 'accepted' AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))"
    ).run(label, payload.userId, userId, userId, payload.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'الصداقة غير موجودة' });
      return;
    }
    res.json({ message: 'تم تحديث تصنيف الصديق' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تحديث التصنيف', details: err.message });
  }
});

// GET /api/friends/mutual/:userId - Get mutual friends with a specific user
router.get('/friends/mutual/:userId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { userId } = req.params;
    if (!userId) { res.status(400).json({ error: 'معرف المستخدم مطلوب' }); return; }

    // Get my friends
    const myFriends = db.prepare(`
      SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END as friend_id
      FROM friendships WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
    `).all(payload.userId, payload.userId, payload.userId).map((r: any) => r.friend_id);

    // Get their friends
    const theirFriends = db.prepare(`
      SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END as friend_id
      FROM friendships WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
    `).all(userId, userId, userId).map((r: any) => r.friend_id);

    // Find intersection
    const mutualIds = myFriends.filter((id: string) => theirFriends.includes(id) && id !== payload.userId);

    // Get user details for mutual friends
    const mutualFriends = mutualIds.map((fid: string) => {
      const user = db.prepare('SELECT id, name, avatar, avatar_base64, is_verified, trust_score, location FROM users WHERE id = ?').get(fid) as any;
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar_base64 || user.avatar || getDefaultAvatar(user.id, user.gender),
        isVerified: !!user.is_verified,
        trustScore: user.trust_score || 50,
        location: user.location || '',
      };
    }).filter(Boolean);

    res.json({ mutualFriends, count: mutualFriends.length });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب الأصدقاء المشتركين', details: err.message });
  }
});

// ─── Block / Unblock Users ──────────────────────────────────────────
// POST /api/block/:userId - Block a user
router.post('/block/:userId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { userId } = req.params;
    const { reason } = req.body || {};
    if (!userId) { res.status(400).json({ error: 'معرف المستخدم مطلوب' }); return; }
    if (userId === payload.userId) { res.status(400).json({ error: 'لا يمكنك حظر نفسك' }); return; }

    // Check target user exists
    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as any;
    if (!target) { res.status(404).json({ error: 'المستخدم غير موجود' }); return; }

    // Insert block
    db.prepare('INSERT OR IGNORE INTO blocked_users (blocker_id, blocked_id, reason) VALUES (?, ?, ?)')
      .run(payload.userId, userId, reason || '');

    // Also remove any existing friendship
    db.prepare("DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)")
      .run(payload.userId, userId, userId, payload.userId);

    res.json({ message: 'تم حظر المستخدم بنجاح' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل حظر المستخدم', details: err.message });
  }
});

// POST /api/unblock/:userId - Unblock a user
router.post('/unblock/:userId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { userId } = req.params;
    if (!userId) { res.status(400).json({ error: 'معرف المستخدم مطلوب' }); return; }

    const result = db.prepare('DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?')
      .run(payload.userId, userId);
    if (result.changes === 0) {
      res.status(404).json({ error: 'الحظر غير موجود' });
      return;
    }
    res.json({ message: 'تم إلغاء الحظر' });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إلغاء الحظر', details: err.message });
  }
});

// GET /api/blocked - Get list of blocked users
router.get('/blocked', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const blocked = db.prepare(`
      SELECT b.id as block_id, b.reason, b.created_at as blocked_at,
        u.id as user_id, u.name, u.avatar, u.avatar_base64
      FROM blocked_users b
      JOIN users u ON u.id = b.blocked_id
      WHERE b.blocker_id = ?
      ORDER BY b.created_at DESC
    `).all(payload.userId);

    res.json(blocked.map((b: any) => ({
      blockId: b.block_id,
      reason: b.reason,
      blockedAt: b.blocked_at,
      user: {
        id: b.user_id,
        name: b.name,
        avatar: b.avatar_base64 || b.avatar || getDefaultAvatar(b.user_id, b.gender),
      },
    })));
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب قائمة المحظورين', details: err.message });
  }
});

// GET /api/friends/status/:userId - Check friendship status with a specific user
router.get('/friends/status/:userId', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { userId } = req.params;
    if (!userId) { res.status(400).json({ error: 'معرف المستخدم مطلوب' }); return; }

    const friendship = db.prepare(`
      SELECT status FROM friendships
      WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
    `).get(payload.userId, userId, userId, payload.userId) as any;

    // Also return last_seen_at for the contact
    const targetUser = db.prepare('SELECT last_seen_at FROM users WHERE id = ?').get(userId) as any;

    res.json({ friendshipStatus: friendship?.status || null, lastSeenAt: targetUser?.last_seen_at || null });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب حالة الصداقة', details: err.message });
  }
});

// ─── Search Users ────────────────────────────────────────────────────
router.get('/users/search', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { q } = req.query;
    if (!q || (q as string).length < 1) { res.json([]); return; }

    const search = `%${q}%`;
    const users = db.prepare(`
      SELECT id, name, avatar, avatar_base64, is_verified, is_trusted, trust_score, location, interests, phone, show_phone
      FROM users
      WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ?) AND id != ? AND is_deactivated = 0
      ORDER BY is_verified DESC, trust_score DESC
      LIMIT 20
    `).all(search, search, search, payload.userId);

    // Check friendship status for each user
    const enriched = users.map((u: any) => {
      const friendship = db.prepare(`
        SELECT status FROM friendships
        WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
      `).get(payload.userId, u.id, u.id, payload.userId) as any;

      const result: any = {
        id: u.id,
        name: u.name,
        avatar: u.avatar_base64 || u.avatar || getDefaultAvatar(u.id, u.gender),
        is_verified: !!u.is_verified,
        is_trusted: !!u.is_trusted,
        trustScore: u.trust_score || 50,
        location: u.location || '',
        interests: JSON.parse(u.interests || '[]'),
        friendshipStatus: friendship?.status || null,
      };
      // Only include phone if user has show_phone enabled
      if (u.phone && u.show_phone) result.phone = u.phone;
      delete result.show_phone;
      return result;
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل البحث', details: err.message });
  }
});

// ─── User Profile ───────────────────────────────────────────────────
router.get('/users/:id', optionalAuth, (req: Request, res: Response) => {
  try {
    const user = db.prepare(`
      SELECT id, name, avatar, avatar_base64, is_verified, is_trusted, trust_score, location, bio,
        cover_photo, interests, join_date, show_phone, show_location, phone, gender, last_seen_at
      FROM users WHERE id = ? AND is_deactivated = 0
    `).get(req.params.id) as any;

    if (!user) { res.status(404).json({ error: 'المستخدم غير موجود' }); return; }

    user.interests = JSON.parse(user.interests || '[]');
    user.is_verified = !!user.is_verified;
    user.is_trusted = !!user.is_trusted;
    // Prefer base64 avatar over URL avatar
    if (user.avatar_base64) user.avatar = user.avatar_base64;
    delete user.avatar_base64;

    if (!user.show_phone) delete user.phone;
    if (!user.show_location) delete user.location;

    // Get user's posts
    const posts = db.prepare('SELECT * FROM posts WHERE author_id = ? AND status = ? ORDER BY created_at DESC LIMIT 10')
      .all(req.params.id, 'active');

    res.json({ ...user, posts });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب الملف الشخصي', details: err.message });
  }
});

// ─── Health Check ───────────────────────────────────────────────────
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
});

// ─── Smart Reach Stats ─────────────────────────────────────────────
router.get('/smart-reach/stats', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const stats = db.prepare(`
      SELECT 
        COALESCE(SUM(reach_count), 0) as total_reach,
        COALESCE(SUM(click_count), 0) as total_clicks,
        COUNT(CASE WHEN is_promoted = 1 THEN 1 END) as promoted_count,
        COUNT(*) as total_posts
      FROM posts WHERE author_id = ? AND status = 'active'
    `).get(payload.userId) as any;

    res.json({
      totalReach: stats.total_reach || 0,
      totalClicks: stats.total_clicks || 0,
      promotedCount: stats.promoted_count || 0,
      totalPosts: stats.total_posts || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب إحصائيات الوصول', details: err.message });
  }
});

// ─── Share Tracking ─────────────────────────────────────────────────
// POST /api/posts/:id/share — Track a share event
router.post('/posts/:id/share', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { platform } = req.body;
    const postId = req.params.id;

    if (!platform) { res.status(400).json({ error: 'المنصة مطلوبة' }); return; }
    const validPlatforms = ['internal', 'whatsapp', 'telegram', 'facebook', 'twitter', 'link', 'smart_link'];
    if (!validPlatforms.includes(platform)) { res.status(400).json({ error: 'منصة غير صالحة' }); return; }

    const post = db.prepare('SELECT id, author_id, shares FROM posts WHERE id = ? AND status = ?').get(postId, 'active') as any;
    if (!post) { res.status(404).json({ error: 'المنشور غير موجود' }); return; }

    // Increment shares count on the post
    db.prepare("UPDATE posts SET shares = COALESCE(shares, 0) + 1, updated_at = datetime('now') WHERE id = ?")
      .run(postId);

    // Insert share event
    const shareId = crypto.randomBytes(16).toString('hex').toLowerCase();
    db.prepare('INSERT INTO share_events (id, post_id, user_id, platform) VALUES (?, ?, ?, ?)')
      .run(shareId, postId, payload.userId, platform);

    // Notify post author about the share (for internal shares)
    if (platform === 'internal' && post.author_id && post.author_id !== payload.userId) {
      const sharer = db.prepare('SELECT name FROM users WHERE id = ?').get(payload.userId) as any;
      if (sharer) {
        db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)')
          .run(post.author_id, 'share', `شارك ${sharer.name} منشورك`, `/post/${postId}`);
      }
    }

    const totalShares = (post.shares || 0) + 1;
    res.json({ message: 'تم تسجيل المشاركة', totalShares });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل تسجيل المشاركة', details: err.message });
  }
});

// GET /api/posts/:id/share-stats — Get share statistics
router.get('/posts/:id/share-stats', (req: Request, res: Response) => {
  try {
    const postId = req.params.id;

    const post = db.prepare('SELECT id, shares FROM posts WHERE id = ?').get(postId) as any;
    if (!post) { res.status(404).json({ error: 'المنشور غير موجود' }); return; }

    // Total shares
    const total = post.shares || 0;

    // Shares by platform
    const byPlatformRows = db.prepare('SELECT platform, COUNT(*) as count FROM share_events WHERE post_id = ? GROUP BY platform').all(postId) as any[];
    const byPlatform: Record<string, number> = {};
    for (const row of byPlatformRows) {
      byPlatform[row.platform] = row.count;
    }

    // Recent shares
    const recentShares = db.prepare(`
      SELECT se.platform, se.shared_at, u.name as user_name, u.avatar as user_avatar
      FROM share_events se
      JOIN users u ON u.id = se.user_id
      WHERE se.post_id = ?
      ORDER BY se.shared_at DESC
      LIMIT 10
    `).all(postId);

    res.json({ total, byPlatform, recentShares });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب إحصائيات المشاركة', details: err.message });
  }
});

// ─── Smart Link ─────────────────────────────────────────────────────
router.get('/smart-link/:postId', optionalAuth, (req: Request, res: Response) => {
  try {
    const post = db.prepare('SELECT id, author_id, reach_count, is_promoted FROM posts WHERE id = ? AND status = ?').get(req.params.postId, 'active') as any;
    if (!post) { res.status(404).json({ error: 'المنشور غير موجود' }); return; }

    // Increment reach count and click count
    db.prepare("UPDATE posts SET reach_count = COALESCE(reach_count, 0) + 1, click_count = COALESCE(click_count, 0) + 1, updated_at = datetime('now') WHERE id = ?")
      .run(req.params.postId);

    // Record the visit in smart_link_visits
    const visitorId = (req as any).user ? ((req as any).user as JwtPayload).userId : null;
    const visitorIp = req.ip || req.headers['x-forwarded-for'] as string || '';
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || '';
    const visitId = crypto.randomBytes(16).toString('hex').toLowerCase();
    try {
      db.prepare('INSERT INTO smart_link_visits (id, post_id, visitor_id, visitor_ip, user_agent, referrer) VALUES (?, ?, ?, ?, ?, ?)')
        .run(visitId, req.params.postId, visitorId, typeof visitorIp === 'string' ? visitorIp : '', userAgent, referrer);
    } catch { /* ignore if table not yet available */ }

    // Notify post author about the visit (only for promoted posts, limit notifications)
    if (post.is_promoted && post.author_id) {
      const recentNotifCount = db.prepare(`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ? AND type = 'promotion' AND created_at >= datetime('now', '-1 hour')
      `).get(post.author_id) as any;

      if (recentNotifCount.count < 5) { // Max 5 visit notifications per hour
        db.prepare('INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)')
          .run(post.author_id, 'promotion', `حصل منشورك على زيارة جديدة عبر الوصل الذكي (إجمالي: ${(post.reach_count || 0) + 1})`);
      }
    }

    // Redirect to the post page in the SPA
    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    res.redirect(`${appUrl}/#/post/${req.params.postId}`);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إعادة التوجيه', details: err.message });
  }
});

// POST /api/smart-link/generate — Generate a custom smart link
router.post('/smart-link/generate', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { postId, alias } = req.body;

    if (!postId || !alias) { res.status(400).json({ error: 'معرف المنشور والرابط المخصص مطلوبان' }); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(alias)) { res.status(400).json({ error: 'الرابط المخصص يجب أن يحتوي على حروف إنجليزية وأرقام فقط' }); return; }
    if (alias.length < 3 || alias.length > 50) { res.status(400).json({ error: 'الرابط المخصص يجب أن يكون بين 3 و 50 حرف' }); return; }

    const post = db.prepare('SELECT id, author_id FROM posts WHERE id = ? AND status = ?').get(postId, 'active') as any;
    if (!post) { res.status(404).json({ error: 'المنشور غير موجود' }); return; }
    if (post.author_id !== payload.userId) { res.status(403).json({ error: 'يمكنك إنشاء رابط ذكي لمنشوراتك فقط' }); return; }

    // Check if alias is already taken
    const existingAlias = db.prepare('SELECT id FROM posts WHERE smart_link_alias = ? AND id != ?').get(alias, postId) as any;
    if (existingAlias) { res.status(409).json({ error: 'هذا الرابط المخصص مستخدم بالفعل' }); return; }

    db.prepare("UPDATE posts SET smart_link_alias = ?, updated_at = datetime('now') WHERE id = ?")
      .run(alias, postId);

    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = `${appUrl}/api/smart-link/a/${alias}`;

    res.json({ url, alias });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إنشاء الرابط الذكي', details: err.message });
  }
});

// GET /api/smart-link/:postId/stats — Get smart link analytics
router.get('/smart-link/:postId/stats', authMiddleware, (req: Request, res: Response) => {
  try {
    const postId = req.params.postId;

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId) as any;
    if (!post) { res.status(404).json({ error: 'المنشور غير موجود' }); return; }

    // Total visits
    const totalVisitsRow = db.prepare('SELECT COUNT(*) as count FROM smart_link_visits WHERE post_id = ?').get(postId) as any;
    const totalVisits = totalVisitsRow?.count || 0;

    // Unique visitors
    const uniqueVisitorsRow = db.prepare('SELECT COUNT(DISTINCT COALESCE(visitor_id, visitor_ip)) as count FROM smart_link_visits WHERE post_id = ?').get(postId) as any;
    const uniqueVisitors = uniqueVisitorsRow?.count || 0;

    // Visits by date (last 7 days)
    const visitsByDate = db.prepare(`
      SELECT DATE(visited_at) as date, COUNT(*) as count
      FROM smart_link_visits
      WHERE post_id = ? AND visited_at >= datetime('now', '-7 days')
      GROUP BY DATE(visited_at)
      ORDER BY date ASC
    `).all(postId);

    // Recent visitors
    const recentVisitors = db.prepare(`
      SELECT sv.visitor_id, sv.visitor_ip, sv.user_agent, sv.referrer, sv.visited_at,
             u.name as visitor_name, u.avatar as visitor_avatar
      FROM smart_link_visits sv
      LEFT JOIN users u ON u.id = sv.visitor_id
      WHERE sv.post_id = ?
      ORDER BY sv.visited_at DESC
      LIMIT 10
    `).all(postId);

    res.json({ totalVisits, uniqueVisitors, visitsByDate, recentVisitors });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب إحصائيات الوصل الذكي', details: err.message });
  }
});

// GET /api/smart-link/a/:alias — Redirect via custom alias
router.get('/smart-link/a/:alias', optionalAuth, (req: Request, res: Response) => {
  try {
    const post = db.prepare('SELECT id, author_id, reach_count, is_promoted FROM posts WHERE smart_link_alias = ? AND status = ?').get(req.params.alias, 'active') as any;
    if (!post) { res.status(404).json({ error: 'الرابط غير موجود' }); return; }

    // Increment reach count and click count
    db.prepare("UPDATE posts SET reach_count = COALESCE(reach_count, 0) + 1, click_count = COALESCE(click_count, 0) + 1, updated_at = datetime('now') WHERE id = ?")
      .run(post.id);

    // Record the visit in smart_link_visits
    const visitorId = (req as any).user ? ((req as any).user as JwtPayload).userId : null;
    const visitorIp = req.ip || req.headers['x-forwarded-for'] as string || '';
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || '';
    const visitId = crypto.randomBytes(16).toString('hex').toLowerCase();
    try {
      db.prepare('INSERT INTO smart_link_visits (id, post_id, visitor_id, visitor_ip, user_agent, referrer) VALUES (?, ?, ?, ?, ?, ?)')
        .run(visitId, post.id, visitorId, typeof visitorIp === 'string' ? visitorIp : '', userAgent, referrer);
    } catch { /* ignore */ }

    // Notify post author about the visit (only for promoted posts, limit notifications)
    if (post.is_promoted && post.author_id) {
      const recentNotifCount = db.prepare(`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ? AND type = 'promotion' AND created_at >= datetime('now', '-1 hour')
      `).get(post.author_id) as any;

      if (recentNotifCount.count < 5) {
        db.prepare('INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)')
          .run(post.author_id, 'promotion', `حصل منشورك على زيارة جديدة عبر الوصل الذكي (إجمالي: ${(post.reach_count || 0) + 1})`);
      }
    }

    // Redirect to the post page in the SPA
    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    res.redirect(`${appUrl}/#/post/${post.id}`);
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إعادة التوجيه', details: err.message });
  }
});

// ─── Market Live Video Comments ─────────────────────────────────────
// GET comments for a video
router.get('/market-live/:videoId/comments', optionalAuth, (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const offset = (page - 1) * limit;

    const comments = db.prepare(`
      SELECT c.id, c.text, c.created_at,
             u.id as user_id, u.name as user_name, u.avatar as user_avatar, u.avatar_base64
      FROM video_comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.video_id = ? AND c.status = 'active'
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(videoId, limit, offset).map((c: any) => ({
      id: c.id,
      text: c.text,
      createdAt: c.created_at,
      userId: c.user_id,
      userName: c.user_name,
      userAvatar: c.avatar_base64 || c.user_avatar,
    }));

    res.json({ comments, page, hasMore: comments.length === limit });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب التعليقات', details: err.message });
  }
});

// POST a comment on a video
router.post('/market-live/:videoId/comments', authMiddleware, (req: Request, res: Response) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const { videoId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'التعليق فارغ' });
      return;
    }

    const video = db.prepare('SELECT * FROM ad_videos WHERE id = ? AND status = ?').get(videoId, 'active') as any;
    if (!video) {
      res.status(404).json({ error: 'الفيديو غير موجود' });
      return;
    }

    const commentId = crypto.randomBytes(16).toString('hex').toLowerCase();
    db.prepare('INSERT INTO video_comments (id, video_id, user_id, text) VALUES (?, ?, ?, ?)')
      .run(commentId, videoId, payload.userId, text.trim());

    const commenter = db.prepare('SELECT name, avatar, avatar_base64 FROM users WHERE id = ?').get(payload.userId) as any;
    if (commenter && video.user_id !== payload.userId) {
      db.prepare('INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)')
        .run(video.user_id, 'market', `علق ${commenter.name} على فيديو إعلانك`, `/market/listing/${video.post_id}`);
    }

    const comment = {
      id: commentId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      userId: payload.userId,
      userName: commenter?.name || '',
      userAvatar: commenter?.avatar_base64 || commenter?.avatar || '',
    };

    res.status(201).json({ comment });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إضافة التعليق', details: err.message });
  }
});

// ─── Market Live Stats ─────────────────────────────────────────────
router.get('/market-live/stats', optionalAuth, (_req: Request, res: Response) => {
  try {
    const totalVideos = db.prepare("SELECT COUNT(*) as count FROM ad_videos WHERE status = 'active'").get() as any;
    const totalViews = db.prepare("SELECT COALESCE(SUM(views), 0) as total FROM ad_videos WHERE status = 'active'").get() as any;
    const todayVideos = db.prepare("SELECT COUNT(*) as count FROM ad_videos WHERE status = 'active' AND created_at >= datetime('now', '-1 day')").get() as any;

    const categoryDist = db.prepare(`
      SELECT COALESCE(p.category, ml.category, '') as category, COUNT(*) as count
      FROM ad_videos v
      LEFT JOIN posts p ON p.id = v.post_id
      LEFT JOIN market_listings ml ON ml.id = v.post_id
      WHERE v.status = 'active'
      AND COALESCE(p.category, ml.category, '') != ''
      GROUP BY COALESCE(p.category, ml.category)
      ORDER BY count DESC LIMIT 6
    `).all();

    res.json({
      totalVideos: totalVideos.count || 0,
      totalViews: totalViews.total || 0,
      todayVideos: todayVideos.count || 0,
      videosToday: todayVideos.count || 0,
      categoryDist,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل جلب إحصائيات السوق', details: err.message });
  }
});

// POST /api/livestream/notify-friends — Send livestream notification to all friends
router.post('/livestream/notify-friends', authMiddleware, (req: Request, res: Response) => {
  try {
    const uid = (req as any).user?.userId;
    if (!uid) { res.status(401).json({ error: 'غير مصرح' }); return; }

    const { streamTitle } = req.body || {};
    const hostName = ((db.prepare('SELECT name FROM users WHERE id = ?').get(uid) as any)?.name) || 'مستخدم';
    const message = `${hostName} بدأ بثاً مباشراً${streamTitle ? ': ' + streamTitle : ''}! شاهد الآن`;

    // Get all accepted friends
    const friends = db.prepare(`
      SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END as friend_id
      FROM friendships
      WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
    `).all(uid, uid, uid) as any[];

    // Insert notification for each friend — use 'livestream' type with link to the host's stream
    const insertNotif = db.prepare('INSERT INTO notifications (user_id, type, message, link, user_id_ref) VALUES (?, ?, ?, ?, ?)');
    let count = 0;
    for (const friend of friends) {
      try {
        insertNotif.run(friend.friend_id, 'livestream', message, `/live-stream/${uid}`, uid);
        count++;
      } catch {}
    }

    res.json({ success: true, notifiedFriends: count });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل إرسال إشعارات البث', details: err.message });
  }
});

// GET /api/livestream/active — Get list of users currently streaming
router.get('/livestream/active', authMiddleware, (req: Request, res: Response) => {
  try {
    const wsManager = (req.app.locals as any).wsManager;
    if (!wsManager || !wsManager.activeStreams) {
      res.json([]);
      return;
    }
    // Convert Map to Array for JSON serialization (Map serializes as {})
    const activeStreamers = Array.from((wsManager.activeStreams as Map<string, any>).values());
    res.json(activeStreamers);
  } catch (err: any) {
    res.json([]);
  }
});


// GET /api/alerts/active — PUBLIC endpoint for currently visible admin alerts
// (No auth required - moved here from /api/admin/* so all users can see alerts)
router.get('/alerts/active', optionalAuth, (req: Request, res: Response) => {
  try {
    const now = new Date().toISOString();
    const isAdmin = !!(req as any).user?.isAdmin;

    let query = `
      SELECT id, title, content, source, priority, target_audience,
             start_at, expires_at, display_duration, action_label, action_url,
             created_at
      FROM admin_alerts
      WHERE is_active = 1
        AND (start_at IS NULL OR start_at <= ?)
        AND (expires_at IS NULL OR expires_at > ?)
    `;
    const params: any[] = [now, now];

    if (isAdmin) {
      query += ` AND target_audience IN ('all', 'admins')`;
    } else if ((req as any).user?.userId) {
      query += ` AND target_audience IN ('all', 'users')`;
    } else {
      query += ` AND target_audience = 'all'`;
    }

    query += ` ORDER BY
      CASE priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      created_at DESC
    `;

    const alerts = db.prepare(query).all(...params) as any[];
    res.json({ alerts });
  } catch (err: any) {
    res.status(500).json({ error: 'فشل في جلب التنبيهات النشطة', details: err.message });
  }
});

export default router;
