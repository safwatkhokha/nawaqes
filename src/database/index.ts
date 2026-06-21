// ─── Database Setup (better-sqlite3 + SQLite) ────────────────────────
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';

// Use /data (HF Spaces persistent volume) when available, fallback to ./data for local dev
const PERSISTENT_DIR = fs.existsSync('/data') ? '/data' : path.resolve(process.cwd(), 'data');
const DB_PATH = path.resolve(PERSISTENT_DIR, 'nawaqes.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

console.log(`[DB] Database path: ${DB_PATH}`);
console.log(`[DB] Using persistent storage: ${PERSISTENT_DIR === '/data'}`);

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema Initialization ──────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    avatar_base64 TEXT,
    is_verified INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    is_trusted INTEGER DEFAULT 0,
    is_deactivated INTEGER DEFAULT 0,
    wallet_balance REAL DEFAULT 0,
    trust_score INTEGER DEFAULT 50,
    show_phone INTEGER DEFAULT 0,
    show_location INTEGER DEFAULT 1,
    gender TEXT DEFAULT 'male',
    phone TEXT NOT NULL DEFAULT '',
    date_of_birth TEXT DEFAULT '',
    location TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    cover_photo TEXT DEFAULT '',
    interests TEXT DEFAULT '[]',
    payment_methods TEXT DEFAULT '[]',
    join_date TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    author_id TEXT NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    image TEXT DEFAULT '',
    type TEXT DEFAULT 'ad',
    price REAL,
    currency TEXT DEFAULT 'ج.م',
    location TEXT DEFAULT '',
    payment_methods TEXT DEFAULT '[]',
    is_boosted INTEGER DEFAULT 0,
    is_promoted INTEGER DEFAULT 0,
    promotion_tier TEXT,
    promotion_status TEXT,
    promotion_package TEXT,
    promotion_started_at TEXT,
    promotion_expires_at TEXT,
    reach_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    estimated_reach INTEGER,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    category TEXT DEFAULT '',
    feeling TEXT DEFAULT '',
    activity TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS post_comments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT DEFAULT '',
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    sender_id TEXT NOT NULL REFERENCES users(id),
    receiver_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    post_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    image TEXT DEFAULT '',
    type TEXT DEFAULT 'image',
    text TEXT DEFAULT '',
    background_color TEXT DEFAULT '',
    is_seen INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT DEFAULT 'system',
    message TEXT NOT NULL,
    post_id TEXT,
    user_id_ref TEXT,
    link TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS promotion_requests (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    post_id TEXT NOT NULL,
    post_content TEXT NOT NULL,
    author_id TEXT NOT NULL REFERENCES users(id),
    author_name TEXT NOT NULL,
    author_avatar TEXT DEFAULT '',
    tier TEXT NOT NULL,
    price REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    package_name TEXT,
    duration INTEGER,
    estimated_reach INTEGER,
    max_notifications INTEGER,
    include_messages INTEGER DEFAULT 0,
    targeting TEXT,
    target_city TEXT DEFAULT '',
    target_interests TEXT DEFAULT '[]',
    notifications_sent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS charging_requests (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    user_name TEXT NOT NULL,
    user_avatar TEXT DEFAULT '',
    user_phone TEXT DEFAULT '',
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    receipt_image TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    requester_id TEXT NOT NULL REFERENCES users(id),
    addressee_id TEXT NOT NULL REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(requester_id, addressee_id)
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    icon TEXT DEFAULT '',
    sort INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS news_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    is_alert INTEGER DEFAULT 0,
    category TEXT DEFAULT 'general',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_alerts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    content TEXT,
    source TEXT DEFAULT 'إدارة نواقص',
    priority TEXT DEFAULT 'medium',
    target_audience TEXT DEFAULT 'all',
    is_active INTEGER DEFAULT 1,
    start_at TEXT,
    expires_at TEXT,
    display_duration INTEGER DEFAULT 5000,
    action_label TEXT,
    action_url TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_admin_alerts_active ON admin_alerts(is_active, start_at, expires_at);

  CREATE TABLE IF NOT EXISTS market_trends (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    item TEXT NOT NULL,
    trend TEXT DEFAULT 'stable',
    change TEXT DEFAULT '0%',
    category TEXT DEFAULT '',
    price REAL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ad_videos (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    video_url TEXT NOT NULL,
    thumbnail_url TEXT DEFAULT '',
    duration INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS video_interactions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    video_id TEXT NOT NULL REFERENCES ad_videos(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    interaction_type TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(video_id, user_id, interaction_type)
  );

  CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
  CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
  CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
  CREATE INDEX IF NOT EXISTS idx_chat_sender ON chat_messages(sender_id);
  CREATE INDEX IF NOT EXISTS idx_chat_receiver ON chat_messages(receiver_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_ad_videos_post ON ad_videos(post_id);
  CREATE INDEX IF NOT EXISTS idx_ad_videos_user ON ad_videos(user_id);
  CREATE INDEX IF NOT EXISTS idx_ad_videos_status ON ad_videos(status);
  CREATE INDEX IF NOT EXISTS idx_video_interactions_video ON video_interactions(video_id);
  CREATE INDEX IF NOT EXISTS idx_video_interactions_user ON video_interactions(user_id);

  CREATE TABLE IF NOT EXISTS video_comments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    video_id TEXT NOT NULL REFERENCES ad_videos(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_video_comments_video ON video_comments(video_id);
  CREATE INDEX IF NOT EXISTS idx_video_comments_user ON video_comments(user_id);

  CREATE TABLE IF NOT EXISTS share_events (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    platform TEXT NOT NULL,
    shared_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_share_events_post ON share_events(post_id);
  CREATE INDEX IF NOT EXISTS idx_share_events_user ON share_events(user_id);

  CREATE TABLE IF NOT EXISTS smart_link_visits (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    visitor_id TEXT,
    visitor_ip TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    referrer TEXT DEFAULT '',
    visited_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_smart_link_visits_post ON smart_link_visits(post_id);

  CREATE TABLE IF NOT EXISTS cities_lookup (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    region TEXT NOT NULL DEFAULT 'delta',
    population REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS market_listings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    seller_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    images TEXT DEFAULT '[]',
    price REAL,
    currency TEXT DEFAULT 'ج.م',
    category TEXT DEFAULT '',
    subcategory TEXT DEFAULT '',
    condition TEXT DEFAULT 'used',
    location TEXT DEFAULT '',
    city TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    whatsapp TEXT DEFAULT '',
    payment_methods TEXT DEFAULT '[]',
    is_featured INTEGER DEFAULT 0,
    is_promoted INTEGER DEFAULT 0,
    promotion_tier TEXT,
    promotion_status TEXT,
    promotion_package TEXT,
    promotion_started_at TEXT,
    promotion_expires_at TEXT,
    views_count INTEGER DEFAULT 0,
    saves_count INTEGER DEFAULT 0,
    inquiries_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    estimated_reach INTEGER,
    reach_count INTEGER DEFAULT 0,
    targeting TEXT DEFAULT 'all',
    target_city TEXT DEFAULT '',
    target_interests TEXT DEFAULT '[]',
    target_age_min INTEGER DEFAULT 0,
    target_age_max INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_market_listings_seller ON market_listings(seller_id);
  CREATE INDEX IF NOT EXISTS idx_market_listings_category ON market_listings(category);
  CREATE INDEX IF NOT EXISTS idx_market_listings_status ON market_listings(status);
  CREATE INDEX IF NOT EXISTS idx_market_listings_promoted ON market_listings(is_promoted);
  CREATE INDEX IF NOT EXISTS idx_market_listings_city ON market_listings(city);
  CREATE INDEX IF NOT EXISTS idx_market_listings_featured ON market_listings(is_featured);
  CREATE INDEX IF NOT EXISTS idx_market_listings_price ON market_listings(price);
  CREATE INDEX IF NOT EXISTS idx_market_listings_condition ON market_listings(condition);

  CREATE TABLE IF NOT EXISTS market_listing_saves (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    listing_id TEXT NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, listing_id)
  );
  CREATE INDEX IF NOT EXISTS idx_market_saves_user ON market_listing_saves(user_id);
  CREATE INDEX IF NOT EXISTS idx_market_saves_listing ON market_listing_saves(listing_id);

  CREATE TABLE IF NOT EXISTS market_promotion_requests (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    listing_id TEXT NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
    seller_id TEXT NOT NULL REFERENCES users(id),
    listing_title TEXT NOT NULL,
    tier TEXT NOT NULL,
    price REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    package_name TEXT,
    duration INTEGER,
    estimated_reach INTEGER,
    targeting TEXT DEFAULT 'all',
    target_city TEXT DEFAULT '',
    target_interests TEXT DEFAULT '[]',
    target_age_min INTEGER DEFAULT 0,
    target_age_max INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_market_promo_listing ON market_promotion_requests(listing_id);
  CREATE INDEX IF NOT EXISTS idx_market_promo_seller ON market_promotion_requests(seller_id);
  CREATE INDEX IF NOT EXISTS idx_market_promo_status ON market_promotion_requests(status);

  CREATE TABLE IF NOT EXISTS post_views (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id TEXT,
    visitor_ip TEXT DEFAULT '',
    viewed_at TEXT DEFAULT (datetime('now')),
    UNIQUE(post_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_post_views_post ON post_views(post_id);
  CREATE INDEX IF NOT EXISTS idx_post_views_user ON post_views(user_id);
`);

// Add video_url column to posts if missing
try {
  db.prepare('ALTER TABLE posts ADD COLUMN video_url TEXT DEFAULT ""').run();
} catch { /* column already exists */ }

// ─── Chat Messages table migrations ─────────────────────────────────
try { db.prepare("ALTER TABLE chat_messages ADD COLUMN message_type TEXT DEFAULT 'text'").run(); } catch { /* column already exists */ }
try { db.prepare("ALTER TABLE chat_messages ADD COLUMN image_url TEXT DEFAULT ''").run(); } catch { /* column already exists */ }
try { db.prepare('ALTER TABLE chat_messages ADD COLUMN reply_to_id TEXT').run(); } catch { /* column already exists */ }
try { db.prepare("ALTER TABLE chat_messages ADD COLUMN reactions TEXT DEFAULT '{}'").run(); } catch { /* column already exists */ }
try { db.prepare("ALTER TABLE chat_messages ADD COLUMN deleted_for TEXT DEFAULT ''").run(); } catch { /* column already exists */ }
try { db.prepare("ALTER TABLE chat_messages ADD COLUMN is_edited INTEGER DEFAULT 0").run(); } catch { /* column already exists */ }
try { db.prepare("ALTER TABLE chat_messages ADD COLUMN is_pinned INTEGER DEFAULT 0").run(); } catch { /* column already exists */ }
try { db.prepare("ALTER TABLE chat_messages ADD COLUMN delivered INTEGER DEFAULT 0").run(); } catch { /* column already exists */ }
try { db.prepare("ALTER TABLE chat_messages ADD COLUMN voice_url TEXT DEFAULT ''").run(); } catch { /* column already exists */ }
try { db.prepare("ALTER TABLE chat_messages ADD COLUMN voice_duration REAL DEFAULT 0").run(); } catch { /* column already exists */ }

// ─── Post Comments Migrations ──────────────────────────────────────
// Add new columns for threaded comments, likes, images, and timestamps
const commentMigrations: [string, string][] = [
  ['parent_id', "TEXT DEFAULT ''"],
  ['likes', 'INTEGER DEFAULT 0'],
  ['image_url', "TEXT DEFAULT ''"],
  ['updated_at', "TEXT DEFAULT ''"],
];
for (const [col, def] of commentMigrations) {
  try { db.prepare(`ALTER TABLE post_comments ADD COLUMN ${col} ${def}`).run(); } catch { /* already exists */ }
}

// Create comment_likes table for toggling likes on comments
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS comment_likes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      comment_id TEXT NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(comment_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
    CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_id);
  `);
} catch { /* table or index already exists */ }

// Create post_likes table for toggling likes on posts (prevents double-liking)
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_likes (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
    CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);
  `);
} catch { /* table or index already exists */ }

// Add post_views table for unique view tracking (migration for existing databases)
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_views (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT,
      visitor_ip TEXT DEFAULT '',
      viewed_at TEXT DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_post_views_post ON post_views(post_id);
    CREATE INDEX IF NOT EXISTS idx_post_views_user ON post_views(user_id);
  `);
} catch { /* table or index already exists */ }

// ─── Promotion Engagement Tracking Table ─────────────────────────────
// Tracks how users interact with promoted posts at specific positions
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS promotion_engagement (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id),
      feed_position INTEGER NOT NULL DEFAULT 0,
      feed_type TEXT NOT NULL DEFAULT 'home',
      action TEXT NOT NULL DEFAULT 'impression',
      time_on_screen REAL DEFAULT 0,
      scroll_depth REAL DEFAULT 0,
      session_id TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_promo_engagement_post ON promotion_engagement(post_id);
    CREATE INDEX IF NOT EXISTS idx_promo_engagement_user ON promotion_engagement(user_id);
    CREATE INDEX IF NOT EXISTS idx_promo_engagement_action ON promotion_engagement(action);
    CREATE INDEX IF NOT EXISTS idx_promo_engagement_feed_type ON promotion_engagement(feed_type);
    CREATE INDEX IF NOT EXISTS idx_promo_engagement_position ON promotion_engagement(feed_position);
    CREATE INDEX IF NOT EXISTS idx_promo_engagement_created ON promotion_engagement(created_at);
  `);
} catch { /* table or index already exists */ }

// ─── AI Placement Strategy Cache Table ──────────────────────────────
// Caches AI-generated placement strategies to avoid repeated AI calls
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_placement_cache (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      cache_key TEXT NOT NULL UNIQUE,
      strategy TEXT NOT NULL,
      feed_type TEXT NOT NULL DEFAULT 'home',
      user_id TEXT,
      hit_count INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_placement_key ON ai_placement_cache(cache_key);
    CREATE INDEX IF NOT EXISTS idx_ai_placement_expires ON ai_placement_cache(expires_at);
  `);
} catch { /* table or index already exists */ }

// ─── Data Migrations ──────────────────────────────────────────────────
// Add missing columns to existing databases (safe ALTER TABLE for each new column)

// Users table migrations
const userMigrations: [string, string][] = [
  ['avatar_base64', 'TEXT'],
  ['is_deactivated', 'INTEGER DEFAULT 0'],
  ['bio', "TEXT DEFAULT ''"],
  ['cover_photo', "TEXT DEFAULT ''"],
  ['trust_score', 'INTEGER DEFAULT 50'],
  ['show_phone', 'INTEGER DEFAULT 0'],
  ['show_location', 'INTEGER DEFAULT 1'],
  ['phone', "TEXT DEFAULT ''"],
  ['location', "TEXT DEFAULT ''"],
  ['interests', "TEXT DEFAULT '[]'"],
  ['payment_methods', "TEXT DEFAULT '[]'"],
  ['wallet_balance', 'REAL DEFAULT 0'],
  ['is_verified', 'INTEGER DEFAULT 0'],
  ['is_admin', 'INTEGER DEFAULT 0'],
  ['is_trusted', 'INTEGER DEFAULT 0'],
  ['gender', "TEXT DEFAULT 'male'"],
  ['date_of_birth', "TEXT DEFAULT ''"],
  ['join_date', "TEXT DEFAULT (datetime('now'))"],
  ['last_seen_at', "TEXT DEFAULT (datetime('now'))"],
];
for (const [col, def] of userMigrations) {
  try { db.prepare(`ALTER TABLE users ADD COLUMN ${col} ${def}`).run(); } catch { /* already exists */ }
}

// Posts table migrations
const postMigrations: [string, string][] = [
  ['promotion_tier', 'TEXT'],
  ['promotion_status', 'TEXT'],
  ['promotion_package', 'TEXT'],
  ['promotion_started_at', 'TEXT'],
  ['promotion_expires_at', 'TEXT'],
  ['estimated_reach', 'INTEGER'],
  ['reach_count', 'INTEGER DEFAULT 0'],
  ['shares', 'INTEGER DEFAULT 0'],
  ['category', "TEXT DEFAULT ''"],
  ['feeling', "TEXT DEFAULT ''"],
  ['activity', "TEXT DEFAULT ''"],
  ['currency', "TEXT DEFAULT 'ج.م'"],
  ['payment_methods', "TEXT DEFAULT '[]'"],
  ['is_boosted', 'INTEGER DEFAULT 0'],
  ['is_promoted', 'INTEGER DEFAULT 0'],
  ['click_count', 'INTEGER DEFAULT 0'],
  ['smart_link_alias', "TEXT DEFAULT ''"],
  ['target_city', "TEXT DEFAULT ''"],
  ['target_interests', "TEXT DEFAULT '[]'"],
  ['targeting', "TEXT DEFAULT 'all'"],
  ['target_age_min', 'INTEGER DEFAULT 0'],
  ['target_age_max', 'INTEGER DEFAULT 0'],
];
for (const [col, def] of postMigrations) {
  try { db.prepare(`ALTER TABLE posts ADD COLUMN ${col} ${def}`).run(); } catch { /* already exists */ }
}

// Add target_city and target_interests columns to promotion_requests if missing
try {
  db.prepare('ALTER TABLE promotion_requests ADD COLUMN target_city TEXT DEFAULT ""').run();
} catch { /* column already exists */ }
try {
  db.prepare('ALTER TABLE promotion_requests ADD COLUMN target_interests TEXT DEFAULT "[]"').run();
} catch { /* column already exists */ }
try {
  db.prepare('ALTER TABLE promotion_requests ADD COLUMN notifications_sent INTEGER DEFAULT 0').run();
} catch { /* column already exists */ }
try {
  db.prepare('ALTER TABLE promotion_requests ADD COLUMN target_age_min INTEGER DEFAULT 0').run();
} catch { /* column already exists */ }
try {
  db.prepare('ALTER TABLE promotion_requests ADD COLUMN target_age_max INTEGER DEFAULT 0').run();
} catch { /* column already exists */ }
try {
  db.prepare('ALTER TABLE promotion_requests ADD COLUMN city_count INTEGER DEFAULT 1').run();
} catch { /* column already exists */ }

// Add receipt_image column to charging_requests if missing
try {
  db.prepare('ALTER TABLE charging_requests ADD COLUMN receipt_image TEXT DEFAULT ""').run();
} catch { /* column already exists */ }

// Add user_phone column to charging_requests if missing
try {
  db.prepare('ALTER TABLE charging_requests ADD COLUMN user_phone TEXT DEFAULT ""').run();
} catch { /* column already exists */ }

// Add sender_phone column to posts if missing (for support tickets and complaints)
try {
  db.prepare('ALTER TABLE posts ADD COLUMN sender_phone TEXT DEFAULT ""').run();
} catch { /* column already exists */ }

// Add additional_phone column to charging_requests if missing (for alternative sender phone)
try {
  db.prepare('ALTER TABLE charging_requests ADD COLUMN additional_phone TEXT DEFAULT ""').run();
} catch { /* column already exists */ }

// Add UNIQUE index on phone for non-empty values (SQLite doesn't support ALTER TABLE ADD CONSTRAINT)
try {
  db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone) WHERE phone != \'\'').run();
} catch { /* index already exists */ }

// News items table migrations - add category column
try {
  db.prepare("ALTER TABLE news_items ADD COLUMN category TEXT DEFAULT 'general'").run();
} catch { /* column already exists */ }

// Notifications table migrations - add user_id_ref and link columns
try {
  db.prepare('ALTER TABLE notifications ADD COLUMN user_id_ref TEXT').run();
} catch { /* column already exists */ }
try {
  db.prepare('ALTER TABLE notifications ADD COLUMN link TEXT').run();
} catch { /* column already exists */ }

// Ensure friendships table exists (for databases created before it was added)
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      requester_id TEXT NOT NULL REFERENCES users(id),
      addressee_id TEXT NOT NULL REFERENCES users(id),
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(requester_id, addressee_id)
    )
  `);
} catch { /* table already exists */ }

// Ensure friendship indexes exist
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
  `);
} catch { /* index already exists */ }

// Add status column to friendships if missing (for older databases)
try {
  db.prepare("ALTER TABLE friendships ADD COLUMN status TEXT DEFAULT 'pending'").run();
} catch { /* column already exists */ }

// Add created_at column to friendships if missing
try {
  db.prepare("ALTER TABLE friendships ADD COLUMN created_at TEXT DEFAULT (datetime('now'))").run();
} catch { /* column already exists */ }

// Fix existing posts that have promotion_status='pending' but no promotion_tier
// (i.e., they were created before the schema fix and never actually requested promotion)
db.prepare("UPDATE posts SET promotion_status = NULL WHERE promotion_status = 'pending' AND promotion_tier IS NULL").run();
// Fix any posts that have promotion_status set but no corresponding promotion request
db.prepare("UPDATE posts SET promotion_status = NULL, is_promoted = 0 WHERE promotion_status IS NOT NULL AND promotion_status != 'approved' AND promotion_status != 'rejected' AND id NOT IN (SELECT post_id FROM promotion_requests)").run();
// Fix any posts with stale promotion_status='pending' from Prisma's default
db.prepare("UPDATE posts SET promotion_status = NULL WHERE promotion_status = 'pending' AND promotion_tier IS NULL").run();

// ─── Data Integrity Checks ──────────────────────────────────────────
// Fix any posts with missing or corrupted author_id (references non-existent user)
try {
  const orphanPosts = db.prepare(`
    SELECT p.id FROM posts p LEFT JOIN users u ON u.id = p.author_id WHERE u.id IS NULL AND p.author_id IS NOT NULL
  `).all() as any[];
  if (orphanPosts.length > 0) {
    console.log(`[DB] Found ${orphanPosts.length} orphan posts with missing authors, marking as deleted`);
    const markDeleted = db.prepare("UPDATE posts SET status = 'deleted' WHERE id = ?");
    for (const p of orphanPosts) {
      markDeleted.run(p.id);
    }
  }
} catch (err: any) {
  console.log('[DB] Orphan post check skipped:', err.message);
}

// Fix any posts with corrupted payment_methods JSON
try {
  const allPosts = db.prepare('SELECT id, payment_methods FROM posts WHERE status = ?').all('active') as any[];
  let fixedCount = 0;
  const fixPayment = db.prepare("UPDATE posts SET payment_methods = '[]' WHERE id = ?");
  for (const post of allPosts) {
    try {
      const parsed = JSON.parse(post.payment_methods || '[]');
      if (!Array.isArray(parsed)) throw new Error('not array');
    } catch {
      fixPayment.run(post.id);
      fixedCount++;
    }
  }
  if (fixedCount > 0) {
    console.log(`[DB] Fixed ${fixedCount} posts with corrupted payment_methods`);
  }
} catch (err: any) {
  console.log('[DB] Payment methods check skipped:', err.message);
}

// Fix any users with corrupted interests/payment_methods JSON
try {
  const allUsers = db.prepare('SELECT id, interests, payment_methods FROM users').all() as any[];
  let fixedUsers = 0;
  const fixInterests = db.prepare("UPDATE users SET interests = '[]' WHERE id = ?");
  const fixPayments = db.prepare("UPDATE users SET payment_methods = '[]' WHERE id = ?");
  for (const user of allUsers) {
    try {
      const parsed = JSON.parse(user.interests || '[]');
      if (!Array.isArray(parsed)) throw new Error('not array');
    } catch {
      fixInterests.run(user.id);
      fixedUsers++;
    }
    try {
      const parsed = JSON.parse(user.payment_methods || '[]');
      if (!Array.isArray(parsed)) throw new Error('not array');
    } catch {
      fixPayments.run(user.id);
      fixedUsers++;
    }
  }
  if (fixedUsers > 0) {
    console.log(`[DB] Fixed ${fixedUsers} corrupted JSON fields in users`);
  }
} catch (err: any) {
  console.log('[DB] User data check skipped:', err.message);
}

// ─── Seed Default Data ──────────────────────────────────────────────
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  // Read admin credentials from environment variables
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@nawaqes.com';
  // 🔧 FIX: Use a stable default password if ADMIN_PASSWORD not set in env
  // (was previously random — users couldn't log in)
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2024';
  const adminHash = bcrypt.hashSync(adminPassword, 12);

  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password_hash, avatar, is_verified, is_admin, is_trusted, wallet_balance, trust_score, interests, payment_methods, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('admin', 'مدير نواقص', adminEmail, adminHash,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    1, 1, 1, 5000, 100,
    '["تقنية","عقارات","سيارات"]',
    '[{"id":"vfc","name":"Vodafone Cash","icon":"📱","details":"N/A"},{"id":"instapay","name":"InstaPay","icon":"💸","details":"N/A"}]',
    '01000000000'
  );

  console.log('[DB] Admin account created with email:', adminEmail);

  // Seed categories only
  const insertCat = db.prepare('INSERT INTO categories (id, name, icon, sort) VALUES (?, ?, ?, ?)');
  insertCat.run('market', 'السوق الذكي', '🚀', 1);
  insertCat.run('matches', 'متوافق معي', '🎯', 2);
  insertCat.run('wallet', 'محفظتي', '💳', 3);
  insertCat.run('saved', 'المحفوظات', '🔖', 4);

  console.log('[DB] Database seeded with admin user and categories');
}

// --- Ensure owner admin account exists (from env variables) ---
try {
  const ownerEmail = process.env.OWNER_EMAIL || 'owner@nawaqes.com';
  // 🔧 FIX: Use stable default password
  const ownerPassword = process.env.OWNER_PASSWORD || 'Owner@2024';
  const ownerPhone = process.env.OWNER_PHONE || '01000000001';
  const existingOwner = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(ownerEmail, ownerPhone);
  if (!existingOwner) {
    const ownerHash = bcrypt.hashSync(ownerPassword, 12);
    db.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, password_hash, avatar, is_verified, is_admin, is_trusted, wallet_balance, trust_score, interests, payment_methods, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('owner', 'صاحب نواقص', ownerEmail, ownerHash,
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Owner',
      1, 1, 1, 10000, 100,
      '["تقنية","عقارات","سيارات","هواتف","إلكترونيات"]',
      '[{"id":"vfc","name":"Vodafone Cash","icon":"📱","details":"N/A"},{"id":"instapay","name":"InstaPay","icon":"💸","details":"N/A"}]',
      ownerPhone
    );
    console.log('[DB] Owner account created');
  } else {
    // Make sure the owner is admin
    db.prepare('UPDATE users SET is_admin = 1, is_verified = 1 WHERE id = ?').run((existingOwner as any).id);
  }
} catch (err: any) {
  // Only log non-UNIQUE-constraint errors
  if (!err.message?.includes('UNIQUE constraint')) {
    console.log('[DB] Owner account setup:', err.message);
  }
}

// ─── Seed News Data (Egyptian, World, and Breaking News) ────────────
const newsCount = db.prepare('SELECT COUNT(*) as count FROM news_items').get() as { count: number };
if (newsCount.count === 0) {
  const insertNews = db.prepare('INSERT INTO news_items (id, title, content, source, is_alert, category) VALUES (?, ?, ?, ?, ?, ?)');

  // Egyptian News
  insertNews.run('news-eg-1', 'البنك المركزي المصري يقرر تثبيت سعر الفائدة', 'قرر البنك المركزي المصري تثبيت سعر الفائدة عند مستوياتها الحالية خلال اجتماع اللجنة النقدية، مع التأكيد على مراقبة تطورات التضخم عالميا ومحليا واتخاذ السياسات اللازمة لضمان استقرار الأسعار', 'الأهرام', 0, 'egypt');
  insertNews.run('news-eg-2', 'مصر تعلن عن مشروع قومي جديد لتطوير البنية التحتية الرقمية', 'أعلنت الحكومة المصرية عن إطلاق مشروع قومي طموح لتطوير البنية التحتية الرقمية يشمل توسيع شبكات الألياف الضوئية وتحسين خدمات الإنترنت في جميع المحافظات، بتكلفة إجمالية تتجاوز 10 مليارات جنيه', 'المصري اليوم', 0, 'egypt');
  insertNews.run('news-eg-3', 'ارتفاع ملحوظ في حركة السياحة الوافدة إلى مصر خلال الربع الأول', 'شهدت حركة السياحة الوافدة إلى مصر ارتفاعا ملحوظا خلال الربع الأول من العام الجاري، حيث بلغ عدد السياح الوافدين أكثر من 3 ملايين سائح بزيادة قدرها 25% مقارنة بالفترة ذاتها من العام الماضي', 'الوفد', 0, 'egypt');
  insertNews.run('news-eg-4', 'إطلاق مبادرة وطنية لدعم المشروعات الصغيرة والمتوسطة', 'أطلقت وزارة التجارة والصناعة مبادرة وطنية جديدة لدعم المشروعات الصغيرة والمتوسطة تتضمن توفير تمويل ميسر بقيمة 5 مليارات جنيه وتقديم حوافز ضريبية وتدريب مهني لرواد الأعمال في جميع المحافظات', 'الجمهورية', 0, 'egypt');
  insertNews.run('news-eg-5', 'تشغيل أول قطار كهربائي سريع يربط القاهرة بالعاصمة الإدارية الجديدة', 'بدأ تشغيل أول قطار كهربائي سريع يربط بين القاهرة والعاصمة الإدارية الجديدة بطول 90 كيلومترا، بسعة نقل تصل إلى 50 ألف راكب يوميا وسرعة قصوى تبلغ 160 كيلومترا في الساعة', 'الأخبار', 0, 'egypt');

  // World News
  insertNews.run('news-wr-1', 'الأسواق العالمية تشهد تقلبات حادة وسط مخاوف من تباطؤ النمو الاقتصادي', 'شهدت الأسواق المالية العالمية تقلبات حادة خلال تعاملات الأسبوع وسط مخاوف متزايدة من تباطؤ النمو الاقتصادي العالمي، حيث تراجعت المؤشرات الرئيسية في بورصات أوروبا وآسيا بشكل ملحوظ مع ارتفاع أسعار النفط', 'رويترز', 0, 'world');
  insertNews.run('news-wr-2', 'تطورات جديدة في مساعي السلام بالشرق الأوسط', 'شهدت المنطقة تطورات دبلوماسية مكثفة مع استمرار الجهود الدولية لتهدئة الأوضاع واستئناف مسار التفاوض، حيث أجرت عواصم عالمية عدة اتصالات مكثفة لدعم استقرار المنطقة', 'الجزيرة', 0, 'world');
  insertNews.run('news-wr-3', 'الذكاء الاصطناعي يحدث ثورة في قطاع الرعاية الصحية عالميا', 'أحدثت تقنيات الذكاء الاصطناعي طفرة نوعية في قطاع الرعاية الصحية العالمي، حيث أصبحت التطبيقات الذكية قادرة على تشخيص الأمراض بدقة عالية وتطوير علاجات مخصصة وتسريع اكتشاف الأدوية الجديدة', 'بي بي سي', 0, 'world');
  insertNews.run('news-wr-4', 'أوبك تقرر تعديل إنتاج النفط استجابة لمتغيرات السوق العالمية', 'قررت منظمة أوبك تعديل مستويات إنتاج النفط استجابة للتحولات في أسواق الطاقة العالمية، مع التأكيد على التزام المنظمة بضمان استقرار السوق وتلبية الطلب العالمي بشكل مستدام', 'العربية', 0, 'world');
  insertNews.run('news-wr-5', 'اتفاقية دولية جديدة لمكافحة تغير المناخ تعتمد في قمة عالمية', 'تم اعتماد اتفاقية دولية جديدة لمكافحة تغير المناخ خلال قمة عالمية حضرها قادة أكثر من 150 دولة، تتضمن التزامات ملزمة بخفض الانبعاثات الكربونية وتمويل مشاريع الطاقة المتجددة في الدول النامية بمبلغ 100 مليار دولار سنويا', 'فرانس 24', 0, 'world');

  // Urgent/Breaking News
  insertNews.run('news-ur-1', 'تحديث عاجل: تعطل خدمات الدفع الإلكتروني في بعض البنوك المصرية', 'تعرف بعض خدمات الدفع الإلكتروني في عدد من البنوك المصرية على تعطل مؤقت بسبب تحديثات فنية جارية، ويتوقع استئناف الخدمات خلال الساعات القليلة القادمة. ننصح باستخدام البدائل المتاحة حتى عودة الخدمة', 'نواقص عاجل', 1, 'urgent');
  insertNews.run('news-ur-2', 'تنبيه هام: تحديث سياسة الخصوصية وشروط الاستخدام', 'تم تحديث سياسة الخصوصية وشروط الاستخدام على منصة نواقص لحماية بياناتكم بشكل أفضل. يرجى مراجعة التحديثات الجديدة في صفحة الإعدادات للمتابعة', 'نواقص', 1, 'urgent');

  console.log('[DB] Database seeded with Egyptian, World, and Breaking news');
}

// ─── Seed Cities Lookup Table ────────────────────────────────────────
const citiesCount = db.prepare('SELECT COUNT(*) as count FROM cities_lookup').get() as { count: number };
if (citiesCount.count === 0) {
  const insertCity = db.prepare('INSERT INTO cities_lookup (id, name_ar, name_en, region, population) VALUES (?, ?, ?, ?, ?)');
  // Greater Cairo
  insertCity.run('cairo', 'القاهرة', 'Cairo', 'cairo', 10.0);
  insertCity.run('giza', 'الجيزة', 'Giza', 'cairo', 8.8);
  insertCity.run('qalyubia', 'القليوبية', 'Qalyubia', 'cairo', 5.5);
  // Alexandria
  insertCity.run('alexandria', 'الإسكندرية', 'Alexandria', 'alexandria', 5.4);
  // Delta
  insertCity.run('beheira', 'البحيرة', 'Beheira', 'delta', 6.1);
  insertCity.run('kafr_elsheikh', 'كفر الشيخ', 'Kafr El Sheikh', 'delta', 3.2);
  insertCity.run('damietta', 'دمياط', 'Damietta', 'delta', 1.4);
  insertCity.run('dakahlia', 'الدقهلية', 'Dakahlia', 'delta', 6.0);
  insertCity.run('sharqia', 'الشرقية', 'Sharqia', 'delta', 6.7);
  insertCity.run('monufia', 'المنوفية', 'Monufia', 'delta', 4.2);
  insertCity.run('gharbia', 'الغربية', 'Gharbia', 'delta', 4.8);
  // Canal & Sinai
  insertCity.run('suez', 'السويس', 'Suez', 'canal', 0.7);
  insertCity.run('ismailia', 'الإسماعيلية', 'Ismailia', 'canal', 1.3);
  insertCity.run('port_said', 'بورسعيد', 'Port Said', 'canal', 0.7);
  insertCity.run('north_sinai', 'شمال سيناء', 'North Sinai', 'canal', 0.4);
  insertCity.run('south_sinai', 'جنوب سيناء', 'South Sinai', 'canal', 0.1);
  // Upper Egypt
  insertCity.run('fayoum', 'الفيوم', 'Fayoum', 'upper', 3.5);
  insertCity.run('benisuef', 'بني سويف', 'Beni Suef', 'upper', 3.1);
  insertCity.run('minya', 'المنيا', 'Minya', 'upper', 5.5);
  insertCity.run('asyut', 'أسيوط', 'Asyut', 'upper', 4.3);
  insertCity.run('sohag', 'سوهاج', 'Sohag', 'upper', 4.6);
  insertCity.run('qena', 'قنا', 'Qena', 'upper', 3.0);
  insertCity.run('luxor', 'الأقصر', 'Luxor', 'upper', 1.1);
  insertCity.run('aswan', 'أسوان', 'Aswan', 'upper', 1.4);
  // Border
  insertCity.run('new_valley', 'الوادي الجديد', 'New Valley', 'border', 0.2);
  insertCity.run('red_sea', 'البحر الأحمر', 'Red Sea', 'border', 0.4);
  insertCity.run('matrouh', 'مطروح', 'Matrouh', 'border', 0.5);
  console.log('[DB] Database seeded with Egyptian cities lookup table');
}

// ─── Auto-Update Market Trends from Real Post Data ──────────────────
// This function computes trends dynamically from actual posts in the database
function updateMarketTrendsFromRealData() {
  try {
    // Compute category-level stats from real posts
    const categoryStats = db.prepare(`
      SELECT 
        category,
        COUNT(*) as count,
        COALESCE(AVG(price), 0) as avg_price,
        COALESCE(MIN(price), 0) as min_price,
        COALESCE(MAX(price), 0) as max_price,
        COALESCE(SUM(likes), 0) as total_likes
      FROM posts 
      WHERE type = 'ad' AND status = 'active' AND category != '' AND category IS NOT NULL
      GROUP BY category 
      ORDER BY count DESC
    `).all() as any[];

    // Count posts in last 7 days vs previous 7 days per category for trend direction
    const categoryTrendData: Record<string, { recent: number; previous: number; avgPrice: number; count: number; totalLikes: number }> = {};
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
        totalLikes: cat.total_likes,
      };
    }

    // Category display names in Arabic
    const categoryNames: Record<string, string> = {
      phones: 'هواتف', cars: 'سيارات', electronics: 'إلكترونيات', realEstate: 'عقارات',
      games: 'ألعاب', fashion: 'أزياء', services: 'خدمات', books: 'كتب',
      sports: 'رياضة', animals: 'حيوانات', jobs: 'وظائف', other: 'أخرى',
      beauty: 'تجميل', education: 'تعليم', health: 'صحة', food: 'طعام ومطاعم',
      travel: 'سفر وسياحة', photography: 'تصوير',
    };

    // Clear existing trends and repopulate with real data
    db.prepare('DELETE FROM market_trends').run();
    const insertTrend = db.prepare("INSERT INTO market_trends (id, item, trend, change, category, price, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))");

    for (const [cat, data] of Object.entries(categoryTrendData)) {
      if (data.count < 1) continue; // Skip empty categories

      // Determine trend direction based on activity change
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let changePercent = 0;
      if (data.previous > 0) {
        changePercent = Math.round(((data.recent - data.previous) / data.previous) * 100);
        if (changePercent > 3) trend = 'up';
        else if (changePercent < -3) trend = 'down';
      } else if (data.recent > 0) {
        changePercent = 100; // New category activity
        trend = 'up';
      }

      const changeStr = changePercent >= 0 ? `+${changePercent}%` : `${changePercent}%`;
      const displayName = categoryNames[cat] || cat;

      insertTrend.run(
        `trend-real-${cat}`,
        displayName,
        trend,
        changeStr,
        cat,
        Math.round(data.avgPrice)
      );
    }

    // If no real trends exist yet, add placeholder entries
    const newTrendCount = db.prepare('SELECT COUNT(*) as count FROM market_trends').get() as { count: number };
    if (newTrendCount.count === 0) {
      // No posts in database yet - add minimal placeholder
      insertTrend.run('trend-placeholder', 'السوق', 'stable', '0%', '', 0);
    }

    console.log(`[DB] Updated market trends from real data: ${newTrendCount.count} trends`);
  } catch (err: any) {
    console.log('[DB] Market trends update failed:', err.message);
  }
}

// Run the trends update on startup
updateMarketTrendsFromRealData();

// ─── Seed Market Trends Data (only if empty after real-data update) ───
const trendCount = db.prepare('SELECT COUNT(*) as count FROM market_trends').get() as { count: number };
if (trendCount.count === 0) {
  // Only seed with sample data if the real-data update didn't produce any trends
  // (i.e., the database has no posts yet)
  console.log('[DB] No real post data for trends, using placeholder');
}

// ─── Add missing columns to market_trends ───────────────────────────
try {
  db.prepare('ALTER TABLE market_trends ADD COLUMN category TEXT DEFAULT ""').run();
} catch { /* column already exists */ }
try {
  db.prepare('ALTER TABLE market_trends ADD COLUMN price REAL').run();
} catch { /* column already exists */ }
try {
  db.prepare("ALTER TABLE market_trends ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))").run();
} catch { /* column already exists */ }

// ─── Add missing columns to market_listings ─────────────────────────
try {
  db.prepare('ALTER TABLE market_listings ADD COLUMN is_featured INTEGER DEFAULT 0').run();
} catch { /* column already exists */ }
try {
  db.prepare('ALTER TABLE market_listings ADD COLUMN shares_count INTEGER DEFAULT 0').run();
} catch { /* column already exists */ }
try {
  db.prepare('ALTER TABLE market_listings ADD COLUMN reach_count INTEGER DEFAULT 0').run();
} catch { /* column already exists */ }

// ─── Add missing columns to market_promotion_requests ───────────────
try {
  db.prepare("ALTER TABLE market_promotion_requests ADD COLUMN listing_title TEXT NOT NULL DEFAULT ''").run();
} catch { /* column already exists */ }

// ─── Phase 3: Group chats, forwarding, mute, block ────────────────────
try { db.exec(`
  CREATE TABLE IF NOT EXISTS chat_groups (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    description TEXT DEFAULT '',
    creator_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`); } catch {}

try { db.exec(`
  CREATE TABLE IF NOT EXISTS chat_group_members (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    group_id TEXT NOT NULL REFERENCES chat_groups(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(group_id, user_id)
  )
`); } catch {}

// Add group_id to chat_messages
try { db.prepare("ALTER TABLE chat_messages ADD COLUMN group_id TEXT").run(); } catch {}
// Add forwarded fields
try { db.prepare("ALTER TABLE chat_messages ADD COLUMN is_forwarded INTEGER DEFAULT 0").run(); } catch {}
try { db.prepare("ALTER TABLE chat_messages ADD COLUMN forwarded_from TEXT DEFAULT ''").run(); } catch {}

// Chat mutes
try { db.exec(`
  CREATE TABLE IF NOT EXISTS chat_mutes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    target_id TEXT NOT NULL,
    is_group INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, target_id)
  )
`); } catch {}

// User blocks
try { db.exec(`
  CREATE TABLE IF NOT EXISTS user_blocks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    blocker_id TEXT NOT NULL REFERENCES users(id),
    blocked_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(blocker_id, blocked_id)
  )
`); } catch {}

// ─── Phase 3: Devices table for FCM push notifications ───
try { db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    platform TEXT DEFAULT 'web',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
  CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(token);
`); } catch {}

// ─── Phase 3: Story interaction tables ───
try { db.exec(`
  CREATE TABLE IF NOT EXISTS story_replies (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_story_replies_story ON story_replies(story_id);
  CREATE INDEX IF NOT EXISTS idx_story_replies_user ON story_replies(user_id);
`); } catch {}

try { db.exec(`
  CREATE TABLE IF NOT EXISTS story_reactions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    emoji TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(story_id, user_id, emoji)
  );
  CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions(story_id);
`); } catch {}

try { db.exec(`
  CREATE TABLE IF NOT EXISTS story_views (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    story_id TEXT NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(story_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);
`); } catch {}

try { db.exec(`
  CREATE TABLE IF NOT EXISTS story_highlights (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    cover_image TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_story_highlights_user ON story_highlights(user_id);
`); } catch {}

try { db.exec(`
  CREATE TABLE IF NOT EXISTS highlight_stories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    highlight_id TEXT NOT NULL REFERENCES story_highlights(id) ON DELETE CASCADE,
    story_id TEXT NOT NULL REFERENCES stories(id),
    added_at TEXT DEFAULT (datetime('now')),
    UNIQUE(highlight_id, story_id)
  );
  CREATE INDEX IF NOT EXISTS idx_highlight_stories_highlight ON highlight_stories(highlight_id);
`); } catch {}

// ─── Phase 3: Withdrawal requests table ───
try { db.exec(`
  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    account_details TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    admin_note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    processed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawal_requests(user_id);
  CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status);
`); } catch {}

// ─── Phase 3: Stories migrations for video_url and expires_at ───
try { db.prepare("ALTER TABLE stories ADD COLUMN video_url TEXT DEFAULT ''").run(); } catch {}
try { db.prepare("ALTER TABLE stories ADD COLUMN expires_at TEXT").run(); } catch {}

// ─── Email verification ────────────────────────────────────────────
try { db.prepare("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0").run(); } catch {}
try { db.prepare("ALTER TABLE users ADD COLUMN email_verification_code TEXT DEFAULT ''").run(); } catch {}
try { db.prepare("ALTER TABLE users ADD COLUMN email_verification_expires TEXT DEFAULT ''").run(); } catch {}

// ─── Scheduled streams ──────────────────────────────────────────────
try { db.exec(`
  CREATE TABLE IF NOT EXISTS scheduled_streams (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    scheduled_at TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    category TEXT DEFAULT '',
    is_active INTEGER DEFAULT 0,
    reminder_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_scheduled_streams_user ON scheduled_streams(user_id);
  CREATE INDEX IF NOT EXISTS idx_scheduled_streams_time ON scheduled_streams(scheduled_at);
  CREATE INDEX IF NOT EXISTS idx_scheduled_streams_active ON scheduled_streams(is_active);
`); } catch {}

// ─── Stream gifts/tips ──────────────────────────────────────────────
try { db.exec(`
  CREATE TABLE IF NOT EXISTS stream_gifts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    stream_id TEXT NOT NULL,
    sender_id TEXT NOT NULL REFERENCES users(id),
    receiver_id TEXT NOT NULL REFERENCES users(id),
    gift_type TEXT NOT NULL,
    gift_name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    message TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_stream_gifts_stream ON stream_gifts(stream_id);
  CREATE INDEX IF NOT EXISTS idx_stream_gifts_sender ON stream_gifts(sender_id);
  CREATE INDEX IF NOT EXISTS idx_stream_gifts_receiver ON stream_gifts(receiver_id);
`); } catch {}

// ─── Stream reminders ──────────────────────────────────────────────
try { db.exec(`
  CREATE TABLE IF NOT EXISTS stream_reminders (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    stream_id TEXT NOT NULL REFERENCES scheduled_streams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(stream_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_stream_reminders_stream ON stream_reminders(stream_id);
  CREATE INDEX IF NOT EXISTS idx_stream_reminders_user ON stream_reminders(user_id);
`); } catch {}

export default db;

// ─── Force-fix admin password (in case it was created with random password before) ──
try {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@nawaqes.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2024';
  const adminHash = bcrypt.hashSync(adminPassword, 12);
  // Update password_hash for admin user
  const result = db.prepare("UPDATE users SET password_hash = ? WHERE email = ? AND id = 'admin'").run(adminHash, adminEmail);
  if (result.changes > 0) {
    console.log('[DB] ✅ Admin password reset to default (Admin@2024)');
  }
} catch (err: any) {
  console.log('[DB] Admin password reset skipped:', err.message);
}

// Same for owner
try {
  const ownerEmail = process.env.OWNER_EMAIL || 'owner@nawaqes.com';
  const ownerPassword = process.env.OWNER_PASSWORD || 'Owner@2024';
  const ownerHash = bcrypt.hashSync(ownerPassword, 12);
  const result = db.prepare("UPDATE users SET password_hash = ? WHERE email = ? AND id = 'owner'").run(ownerHash, ownerEmail);
  if (result.changes > 0) {
    console.log('[DB] ✅ Owner password reset to default (Owner@2024)');
  }
} catch (err: any) {
  console.log('[DB] Owner password reset skipped:', err.message);
}
