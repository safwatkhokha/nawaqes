var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/middleware/auth.ts
var auth_exports = {};
__export(auth_exports, {
  adminMiddleware: () => adminMiddleware,
  authMiddleware: () => authMiddleware,
  generateToken: () => generateToken,
  optionalAuth: () => optionalAuth,
  verifyToken: () => verifyToken
});
import jwt from "jsonwebtoken";
import crypto from "crypto";
function getJwtSecret() {
  if (_jwtSecret) return _jwtSecret;
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "REPLACE-WITH-YOUR-OWN-SECURE-RANDOM-STRING") {
    const fallback = crypto.randomBytes(64).toString("hex");
    process.env.JWT_SECRET = fallback;
    _jwtSecret = fallback;
    return _jwtSecret;
  }
  _jwtSecret = secret;
  return _jwtSecret;
}
function getJwtExpires() {
  return process.env.JWT_EXPIRES_IN || "7d";
}
function generateToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpires() });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "\u064A\u062C\u0628 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B" });
    return;
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "\u062C\u0644\u0633\u0629 \u0645\u0646\u062A\u0647\u064A\u0629\u060C \u0633\u062C\u0644 \u062F\u062E\u0648\u0644\u0643 \u0645\u062C\u062F\u062F\u0627\u064B" });
    return;
  }
  req.user = payload;
  next();
}
function adminMiddleware(req, res, next) {
  const user = req.user;
  if (!user?.isAdmin) {
    res.status(403).json({ error: "\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0645\u062F\u064A\u0631 \u0645\u0637\u0644\u0648\u0628\u0629" });
    return;
  }
  next();
}
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }
  next();
}
var _jwtSecret;
var init_auth = __esm({
  "src/middleware/auth.ts"() {
    "use strict";
    _jwtSecret = null;
  }
});

// src/server.ts
import express from "express";
import { createServer as createHttpServer } from "http";
import path5 from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import cors from "cors";
import fs5 from "fs";
import crypto6 from "crypto";

// src/websocket/index.ts
init_auth();
import { WebSocketServer, WebSocket } from "ws";

// src/database/index.ts
import Database from "better-sqlite3";
import path from "path";
import crypto2 from "crypto";
import bcrypt from "bcryptjs";
import fs from "fs";
var PERSISTENT_DIR = fs.existsSync("/data") ? "/data" : path.resolve(process.cwd(), "data");
var DB_PATH = path.resolve(PERSISTENT_DIR, "nawaqes.db");
var dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
console.log(`[DB] Database path: ${DB_PATH}`);
console.log(`[DB] Using persistent storage: ${PERSISTENT_DIR === "/data"}`);
var db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
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
    currency TEXT DEFAULT '\u062C.\u0645',
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
    currency TEXT DEFAULT '\u062C.\u0645',
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
try {
  db.prepare('ALTER TABLE posts ADD COLUMN video_url TEXT DEFAULT ""').run();
} catch {
}
try {
  db.prepare("ALTER TABLE chat_messages ADD COLUMN message_type TEXT DEFAULT 'text'").run();
} catch {
}
try {
  db.prepare("ALTER TABLE chat_messages ADD COLUMN image_url TEXT DEFAULT ''").run();
} catch {
}
try {
  db.prepare("ALTER TABLE chat_messages ADD COLUMN reply_to_id TEXT").run();
} catch {
}
try {
  db.prepare("ALTER TABLE chat_messages ADD COLUMN reactions TEXT DEFAULT '{}'").run();
} catch {
}
try {
  db.prepare("ALTER TABLE chat_messages ADD COLUMN deleted_for TEXT DEFAULT ''").run();
} catch {
}
var commentMigrations = [
  ["parent_id", "TEXT DEFAULT ''"],
  ["likes", "INTEGER DEFAULT 0"],
  ["image_url", "TEXT DEFAULT ''"],
  ["updated_at", "TEXT DEFAULT ''"]
];
for (const [col, def] of commentMigrations) {
  try {
    db.prepare(`ALTER TABLE post_comments ADD COLUMN ${col} ${def}`).run();
  } catch {
  }
}
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
} catch {
}
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
} catch {
}
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
} catch {
}
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
} catch {
}
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
} catch {
}
var userMigrations = [
  ["avatar_base64", "TEXT"],
  ["is_deactivated", "INTEGER DEFAULT 0"],
  ["bio", "TEXT DEFAULT ''"],
  ["cover_photo", "TEXT DEFAULT ''"],
  ["trust_score", "INTEGER DEFAULT 50"],
  ["show_phone", "INTEGER DEFAULT 0"],
  ["show_location", "INTEGER DEFAULT 1"],
  ["phone", "TEXT DEFAULT ''"],
  ["location", "TEXT DEFAULT ''"],
  ["interests", "TEXT DEFAULT '[]'"],
  ["payment_methods", "TEXT DEFAULT '[]'"],
  ["wallet_balance", "REAL DEFAULT 0"],
  ["is_verified", "INTEGER DEFAULT 0"],
  ["is_admin", "INTEGER DEFAULT 0"],
  ["is_trusted", "INTEGER DEFAULT 0"],
  ["gender", "TEXT DEFAULT 'male'"],
  ["date_of_birth", "TEXT DEFAULT ''"],
  ["join_date", "TEXT DEFAULT (datetime('now'))"],
  ["last_seen_at", "TEXT DEFAULT (datetime('now'))"]
];
for (const [col, def] of userMigrations) {
  try {
    db.prepare(`ALTER TABLE users ADD COLUMN ${col} ${def}`).run();
  } catch {
  }
}
var postMigrations = [
  ["promotion_tier", "TEXT"],
  ["promotion_status", "TEXT"],
  ["promotion_package", "TEXT"],
  ["promotion_started_at", "TEXT"],
  ["promotion_expires_at", "TEXT"],
  ["estimated_reach", "INTEGER"],
  ["reach_count", "INTEGER DEFAULT 0"],
  ["shares", "INTEGER DEFAULT 0"],
  ["category", "TEXT DEFAULT ''"],
  ["feeling", "TEXT DEFAULT ''"],
  ["activity", "TEXT DEFAULT ''"],
  ["currency", "TEXT DEFAULT '\u062C.\u0645'"],
  ["payment_methods", "TEXT DEFAULT '[]'"],
  ["is_boosted", "INTEGER DEFAULT 0"],
  ["is_promoted", "INTEGER DEFAULT 0"],
  ["click_count", "INTEGER DEFAULT 0"],
  ["smart_link_alias", "TEXT DEFAULT ''"],
  ["target_city", "TEXT DEFAULT ''"],
  ["target_interests", "TEXT DEFAULT '[]'"],
  ["targeting", "TEXT DEFAULT 'all'"],
  ["target_age_min", "INTEGER DEFAULT 0"],
  ["target_age_max", "INTEGER DEFAULT 0"]
];
for (const [col, def] of postMigrations) {
  try {
    db.prepare(`ALTER TABLE posts ADD COLUMN ${col} ${def}`).run();
  } catch {
  }
}
try {
  db.prepare('ALTER TABLE promotion_requests ADD COLUMN target_city TEXT DEFAULT ""').run();
} catch {
}
try {
  db.prepare('ALTER TABLE promotion_requests ADD COLUMN target_interests TEXT DEFAULT "[]"').run();
} catch {
}
try {
  db.prepare("ALTER TABLE promotion_requests ADD COLUMN notifications_sent INTEGER DEFAULT 0").run();
} catch {
}
try {
  db.prepare("ALTER TABLE promotion_requests ADD COLUMN target_age_min INTEGER DEFAULT 0").run();
} catch {
}
try {
  db.prepare("ALTER TABLE promotion_requests ADD COLUMN target_age_max INTEGER DEFAULT 0").run();
} catch {
}
try {
  db.prepare("ALTER TABLE promotion_requests ADD COLUMN city_count INTEGER DEFAULT 1").run();
} catch {
}
try {
  db.prepare('ALTER TABLE charging_requests ADD COLUMN receipt_image TEXT DEFAULT ""').run();
} catch {
}
try {
  db.prepare('ALTER TABLE charging_requests ADD COLUMN user_phone TEXT DEFAULT ""').run();
} catch {
}
try {
  db.prepare('ALTER TABLE posts ADD COLUMN sender_phone TEXT DEFAULT ""').run();
} catch {
}
try {
  db.prepare('ALTER TABLE charging_requests ADD COLUMN additional_phone TEXT DEFAULT ""').run();
} catch {
}
try {
  db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone) WHERE phone != ''").run();
} catch {
}
try {
  db.prepare("ALTER TABLE news_items ADD COLUMN category TEXT DEFAULT 'general'").run();
} catch {
}
try {
  db.prepare("ALTER TABLE notifications ADD COLUMN user_id_ref TEXT").run();
} catch {
}
try {
  db.prepare("ALTER TABLE notifications ADD COLUMN link TEXT").run();
} catch {
}
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
} catch {
}
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
  `);
} catch {
}
try {
  db.prepare("ALTER TABLE friendships ADD COLUMN status TEXT DEFAULT 'pending'").run();
} catch {
}
try {
  db.prepare("ALTER TABLE friendships ADD COLUMN created_at TEXT DEFAULT (datetime('now'))").run();
} catch {
}
db.prepare("UPDATE posts SET promotion_status = NULL WHERE promotion_status = 'pending' AND promotion_tier IS NULL").run();
db.prepare("UPDATE posts SET promotion_status = NULL, is_promoted = 0 WHERE promotion_status IS NOT NULL AND promotion_status != 'approved' AND promotion_status != 'rejected' AND id NOT IN (SELECT post_id FROM promotion_requests)").run();
db.prepare("UPDATE posts SET promotion_status = NULL WHERE promotion_status = 'pending' AND promotion_tier IS NULL").run();
try {
  const orphanPosts = db.prepare(`
    SELECT p.id FROM posts p LEFT JOIN users u ON u.id = p.author_id WHERE u.id IS NULL AND p.author_id IS NOT NULL
  `).all();
  if (orphanPosts.length > 0) {
    console.log(`[DB] Found ${orphanPosts.length} orphan posts with missing authors, marking as deleted`);
    const markDeleted = db.prepare("UPDATE posts SET status = 'deleted' WHERE id = ?");
    for (const p of orphanPosts) {
      markDeleted.run(p.id);
    }
  }
} catch (err) {
  console.log("[DB] Orphan post check skipped:", err.message);
}
try {
  const allPosts = db.prepare("SELECT id, payment_methods FROM posts WHERE status = ?").all("active");
  let fixedCount = 0;
  const fixPayment = db.prepare("UPDATE posts SET payment_methods = '[]' WHERE id = ?");
  for (const post of allPosts) {
    try {
      const parsed = JSON.parse(post.payment_methods || "[]");
      if (!Array.isArray(parsed)) throw new Error("not array");
    } catch {
      fixPayment.run(post.id);
      fixedCount++;
    }
  }
  if (fixedCount > 0) {
    console.log(`[DB] Fixed ${fixedCount} posts with corrupted payment_methods`);
  }
} catch (err) {
  console.log("[DB] Payment methods check skipped:", err.message);
}
try {
  const allUsers = db.prepare("SELECT id, interests, payment_methods FROM users").all();
  let fixedUsers = 0;
  const fixInterests = db.prepare("UPDATE users SET interests = '[]' WHERE id = ?");
  const fixPayments = db.prepare("UPDATE users SET payment_methods = '[]' WHERE id = ?");
  for (const user of allUsers) {
    try {
      const parsed = JSON.parse(user.interests || "[]");
      if (!Array.isArray(parsed)) throw new Error("not array");
    } catch {
      fixInterests.run(user.id);
      fixedUsers++;
    }
    try {
      const parsed = JSON.parse(user.payment_methods || "[]");
      if (!Array.isArray(parsed)) throw new Error("not array");
    } catch {
      fixPayments.run(user.id);
      fixedUsers++;
    }
  }
  if (fixedUsers > 0) {
    console.log(`[DB] Fixed ${fixedUsers} corrupted JSON fields in users`);
  }
} catch (err) {
  console.log("[DB] User data check skipped:", err.message);
}
var userCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
if (userCount.count === 0) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@nawaqes.com";
  let adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    adminPassword = "Nawaqes@" + crypto2.randomBytes(8).toString("hex");
    process.env.ADMIN_PASSWORD = adminPassword;
    try {
      const envPath2 = path.resolve(process.cwd(), ".env");
      const envContent = fs.existsSync(envPath2) ? fs.readFileSync(envPath2, "utf-8") : "";
      const lines = envContent.split("\n");
      const existing = lines.findIndex((l) => /^ADMIN_PASSWORD=/.test(l));
      if (existing >= 0) lines[existing] = `ADMIN_PASSWORD=${adminPassword}`;
      else lines.push(`ADMIN_PASSWORD=${adminPassword}`);
      fs.writeFileSync(envPath2, lines.join("\n"), "utf-8");
    } catch {
    }
    console.log("[CONFIG] ADMIN_PASSWORD auto-generated and saved to .env");
  }
  const adminHash = bcrypt.hashSync(adminPassword, 12);
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password_hash, avatar, is_verified, is_admin, is_trusted, wallet_balance, trust_score, interests, payment_methods, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "admin",
    "\u0645\u062F\u064A\u0631 \u0646\u0648\u0627\u0642\u0635",
    adminEmail,
    adminHash,
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
    1,
    1,
    1,
    5e3,
    100,
    '["\u062A\u0642\u0646\u064A\u0629","\u0639\u0642\u0627\u0631\u0627\u062A","\u0633\u064A\u0627\u0631\u0627\u062A"]',
    '[{"id":"vfc","name":"Vodafone Cash","icon":"\u{1F4F1}","details":"N/A"},{"id":"instapay","name":"InstaPay","icon":"\u{1F4B8}","details":"N/A"}]',
    "01000000000"
  );
  console.log("[DB] Admin account created");
  const insertCat = db.prepare("INSERT INTO categories (id, name, icon, sort) VALUES (?, ?, ?, ?)");
  insertCat.run("market", "\u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0630\u0643\u064A", "\u{1F680}", 1);
  insertCat.run("matches", "\u0645\u062A\u0648\u0627\u0641\u0642 \u0645\u0639\u064A", "\u{1F3AF}", 2);
  insertCat.run("wallet", "\u0645\u062D\u0641\u0638\u062A\u064A", "\u{1F4B3}", 3);
  insertCat.run("saved", "\u0627\u0644\u0645\u062D\u0641\u0648\u0638\u0627\u062A", "\u{1F516}", 4);
  console.log("[DB] Database seeded with admin user and categories");
}
try {
  const ownerEmail = process.env.OWNER_EMAIL || "owner@nawaqes.com";
  let ownerPassword = process.env.OWNER_PASSWORD;
  const ownerPhone = process.env.OWNER_PHONE || "01000000001";
  const existingOwner = db.prepare("SELECT id FROM users WHERE email = ? OR phone = ?").get(ownerEmail, ownerPhone);
  if (!existingOwner) {
    if (!ownerPassword) {
      ownerPassword = "Owner@" + crypto2.randomBytes(8).toString("hex");
      process.env.OWNER_PASSWORD = ownerPassword;
      try {
        const envPath2 = path.resolve(process.cwd(), ".env");
        const envContent = fs.existsSync(envPath2) ? fs.readFileSync(envPath2, "utf-8") : "";
        const lines = envContent.split("\n");
        const existing = lines.findIndex((l) => /^OWNER_PASSWORD=/.test(l));
        if (existing >= 0) lines[existing] = `OWNER_PASSWORD=${ownerPassword}`;
        else lines.push(`OWNER_PASSWORD=${ownerPassword}`);
        fs.writeFileSync(envPath2, lines.join("\n"), "utf-8");
      } catch {
      }
      console.log("[CONFIG] OWNER_PASSWORD auto-generated and saved to .env");
    }
    const ownerHash = bcrypt.hashSync(ownerPassword, 12);
    db.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, password_hash, avatar, is_verified, is_admin, is_trusted, wallet_balance, trust_score, interests, payment_methods, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "owner",
      "\u0635\u0627\u062D\u0628 \u0646\u0648\u0627\u0642\u0635",
      ownerEmail,
      ownerHash,
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Owner",
      1,
      1,
      1,
      1e4,
      100,
      '["\u062A\u0642\u0646\u064A\u0629","\u0639\u0642\u0627\u0631\u0627\u062A","\u0633\u064A\u0627\u0631\u0627\u062A","\u0647\u0648\u0627\u062A\u0641","\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A"]',
      '[{"id":"vfc","name":"Vodafone Cash","icon":"\u{1F4F1}","details":"N/A"},{"id":"instapay","name":"InstaPay","icon":"\u{1F4B8}","details":"N/A"}]',
      ownerPhone
    );
    console.log("[DB] Owner account created");
  } else {
    db.prepare("UPDATE users SET is_admin = 1, is_verified = 1 WHERE id = ?").run(existingOwner.id);
  }
} catch (err) {
  if (!err.message?.includes("UNIQUE constraint")) {
    console.log("[DB] Owner account setup:", err.message);
  }
}
var newsCount = db.prepare("SELECT COUNT(*) as count FROM news_items").get();
if (newsCount.count === 0) {
  const insertNews = db.prepare("INSERT INTO news_items (id, title, content, source, is_alert, category) VALUES (?, ?, ?, ?, ?, ?)");
  insertNews.run("news-eg-1", "\u0627\u0644\u0628\u0646\u0643 \u0627\u0644\u0645\u0631\u0643\u0632\u064A \u0627\u0644\u0645\u0635\u0631\u064A \u064A\u0642\u0631\u0631 \u062A\u062B\u0628\u064A\u062A \u0633\u0639\u0631 \u0627\u0644\u0641\u0627\u0626\u062F\u0629", "\u0642\u0631\u0631 \u0627\u0644\u0628\u0646\u0643 \u0627\u0644\u0645\u0631\u0643\u0632\u064A \u0627\u0644\u0645\u0635\u0631\u064A \u062A\u062B\u0628\u064A\u062A \u0633\u0639\u0631 \u0627\u0644\u0641\u0627\u0626\u062F\u0629 \u0639\u0646\u062F \u0645\u0633\u062A\u0648\u064A\u0627\u062A\u0647\u0627 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u062E\u0644\u0627\u0644 \u0627\u062C\u062A\u0645\u0627\u0639 \u0627\u0644\u0644\u062C\u0646\u0629 \u0627\u0644\u0646\u0642\u062F\u064A\u0629\u060C \u0645\u0639 \u0627\u0644\u062A\u0623\u0643\u064A\u062F \u0639\u0644\u0649 \u0645\u0631\u0627\u0642\u0628\u0629 \u062A\u0637\u0648\u0631\u0627\u062A \u0627\u0644\u062A\u0636\u062E\u0645 \u0639\u0627\u0644\u0645\u064A\u0627 \u0648\u0645\u062D\u0644\u064A\u0627 \u0648\u0627\u062A\u062E\u0627\u0630 \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0644\u0627\u0632\u0645\u0629 \u0644\u0636\u0645\u0627\u0646 \u0627\u0633\u062A\u0642\u0631\u0627\u0631 \u0627\u0644\u0623\u0633\u0639\u0627\u0631", "\u0627\u0644\u0623\u0647\u0631\u0627\u0645", 0, "egypt");
  insertNews.run("news-eg-2", "\u0645\u0635\u0631 \u062A\u0639\u0644\u0646 \u0639\u0646 \u0645\u0634\u0631\u0648\u0639 \u0642\u0648\u0645\u064A \u062C\u062F\u064A\u062F \u0644\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0628\u0646\u064A\u0629 \u0627\u0644\u062A\u062D\u062A\u064A\u0629 \u0627\u0644\u0631\u0642\u0645\u064A\u0629", "\u0623\u0639\u0644\u0646\u062A \u0627\u0644\u062D\u0643\u0648\u0645\u0629 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 \u0639\u0646 \u0625\u0637\u0644\u0627\u0642 \u0645\u0634\u0631\u0648\u0639 \u0642\u0648\u0645\u064A \u0637\u0645\u0648\u062D \u0644\u062A\u0637\u0648\u064A\u0631 \u0627\u0644\u0628\u0646\u064A\u0629 \u0627\u0644\u062A\u062D\u062A\u064A\u0629 \u0627\u0644\u0631\u0642\u0645\u064A\u0629 \u064A\u0634\u0645\u0644 \u062A\u0648\u0633\u064A\u0639 \u0634\u0628\u0643\u0627\u062A \u0627\u0644\u0623\u0644\u064A\u0627\u0641 \u0627\u0644\u0636\u0648\u0626\u064A\u0629 \u0648\u062A\u062D\u0633\u064A\u0646 \u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A \u0641\u064A \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u062D\u0627\u0641\u0638\u0627\u062A\u060C \u0628\u062A\u0643\u0644\u0641\u0629 \u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u062A\u062A\u062C\u0627\u0648\u0632 10 \u0645\u0644\u064A\u0627\u0631\u0627\u062A \u062C\u0646\u064A\u0647", "\u0627\u0644\u0645\u0635\u0631\u064A \u0627\u0644\u064A\u0648\u0645", 0, "egypt");
  insertNews.run("news-eg-3", "\u0627\u0631\u062A\u0641\u0627\u0639 \u0645\u0644\u062D\u0648\u0638 \u0641\u064A \u062D\u0631\u0643\u0629 \u0627\u0644\u0633\u064A\u0627\u062D\u0629 \u0627\u0644\u0648\u0627\u0641\u062F\u0629 \u0625\u0644\u0649 \u0645\u0635\u0631 \u062E\u0644\u0627\u0644 \u0627\u0644\u0631\u0628\u0639 \u0627\u0644\u0623\u0648\u0644", "\u0634\u0647\u062F\u062A \u062D\u0631\u0643\u0629 \u0627\u0644\u0633\u064A\u0627\u062D\u0629 \u0627\u0644\u0648\u0627\u0641\u062F\u0629 \u0625\u0644\u0649 \u0645\u0635\u0631 \u0627\u0631\u062A\u0641\u0627\u0639\u0627 \u0645\u0644\u062D\u0648\u0638\u0627 \u062E\u0644\u0627\u0644 \u0627\u0644\u0631\u0628\u0639 \u0627\u0644\u0623\u0648\u0644 \u0645\u0646 \u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u062C\u0627\u0631\u064A\u060C \u062D\u064A\u062B \u0628\u0644\u063A \u0639\u062F\u062F \u0627\u0644\u0633\u064A\u0627\u062D \u0627\u0644\u0648\u0627\u0641\u062F\u064A\u0646 \u0623\u0643\u062B\u0631 \u0645\u0646 3 \u0645\u0644\u0627\u064A\u064A\u0646 \u0633\u0627\u0626\u062D \u0628\u0632\u064A\u0627\u062F\u0629 \u0642\u062F\u0631\u0647\u0627 25% \u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0641\u062A\u0631\u0629 \u0630\u0627\u062A\u0647\u0627 \u0645\u0646 \u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u0645\u0627\u0636\u064A", "\u0627\u0644\u0648\u0641\u062F", 0, "egypt");
  insertNews.run("news-eg-4", "\u0625\u0637\u0644\u0627\u0642 \u0645\u0628\u0627\u062F\u0631\u0629 \u0648\u0637\u0646\u064A\u0629 \u0644\u062F\u0639\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639\u0627\u062A \u0627\u0644\u0635\u063A\u064A\u0631\u0629 \u0648\u0627\u0644\u0645\u062A\u0648\u0633\u0637\u0629", "\u0623\u0637\u0644\u0642\u062A \u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062A\u062C\u0627\u0631\u0629 \u0648\u0627\u0644\u0635\u0646\u0627\u0639\u0629 \u0645\u0628\u0627\u062F\u0631\u0629 \u0648\u0637\u0646\u064A\u0629 \u062C\u062F\u064A\u062F\u0629 \u0644\u062F\u0639\u0645 \u0627\u0644\u0645\u0634\u0631\u0648\u0639\u0627\u062A \u0627\u0644\u0635\u063A\u064A\u0631\u0629 \u0648\u0627\u0644\u0645\u062A\u0648\u0633\u0637\u0629 \u062A\u062A\u0636\u0645\u0646 \u062A\u0648\u0641\u064A\u0631 \u062A\u0645\u0648\u064A\u0644 \u0645\u064A\u0633\u0631 \u0628\u0642\u064A\u0645\u0629 5 \u0645\u0644\u064A\u0627\u0631\u0627\u062A \u062C\u0646\u064A\u0647 \u0648\u062A\u0642\u062F\u064A\u0645 \u062D\u0648\u0627\u0641\u0632 \u0636\u0631\u064A\u0628\u064A\u0629 \u0648\u062A\u062F\u0631\u064A\u0628 \u0645\u0647\u0646\u064A \u0644\u0631\u0648\u0627\u062F \u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0641\u064A \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u062D\u0627\u0641\u0638\u0627\u062A", "\u0627\u0644\u062C\u0645\u0647\u0648\u0631\u064A\u0629", 0, "egypt");
  insertNews.run("news-eg-5", "\u062A\u0634\u063A\u064A\u0644 \u0623\u0648\u0644 \u0642\u0637\u0627\u0631 \u0643\u0647\u0631\u0628\u0627\u0626\u064A \u0633\u0631\u064A\u0639 \u064A\u0631\u0628\u0637 \u0627\u0644\u0642\u0627\u0647\u0631\u0629 \u0628\u0627\u0644\u0639\u0627\u0635\u0645\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u0627\u0644\u062C\u062F\u064A\u062F\u0629", "\u0628\u062F\u0623 \u062A\u0634\u063A\u064A\u0644 \u0623\u0648\u0644 \u0642\u0637\u0627\u0631 \u0643\u0647\u0631\u0628\u0627\u0626\u064A \u0633\u0631\u064A\u0639 \u064A\u0631\u0628\u0637 \u0628\u064A\u0646 \u0627\u0644\u0642\u0627\u0647\u0631\u0629 \u0648\u0627\u0644\u0639\u0627\u0635\u0645\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u064A\u0629 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0628\u0637\u0648\u0644 90 \u0643\u064A\u0644\u0648\u0645\u062A\u0631\u0627\u060C \u0628\u0633\u0639\u0629 \u0646\u0642\u0644 \u062A\u0635\u0644 \u0625\u0644\u0649 50 \u0623\u0644\u0641 \u0631\u0627\u0643\u0628 \u064A\u0648\u0645\u064A\u0627 \u0648\u0633\u0631\u0639\u0629 \u0642\u0635\u0648\u0649 \u062A\u0628\u0644\u063A 160 \u0643\u064A\u0644\u0648\u0645\u062A\u0631\u0627 \u0641\u064A \u0627\u0644\u0633\u0627\u0639\u0629", "\u0627\u0644\u0623\u062E\u0628\u0627\u0631", 0, "egypt");
  insertNews.run("news-wr-1", "\u0627\u0644\u0623\u0633\u0648\u0627\u0642 \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u0629 \u062A\u0634\u0647\u062F \u062A\u0642\u0644\u0628\u0627\u062A \u062D\u0627\u062F\u0629 \u0648\u0633\u0637 \u0645\u062E\u0627\u0648\u0641 \u0645\u0646 \u062A\u0628\u0627\u0637\u0624 \u0627\u0644\u0646\u0645\u0648 \u0627\u0644\u0627\u0642\u062A\u0635\u0627\u062F\u064A", "\u0634\u0647\u062F\u062A \u0627\u0644\u0623\u0633\u0648\u0627\u0642 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u0629 \u062A\u0642\u0644\u0628\u0627\u062A \u062D\u0627\u062F\u0629 \u062E\u0644\u0627\u0644 \u062A\u0639\u0627\u0645\u0644\u0627\u062A \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0648\u0633\u0637 \u0645\u062E\u0627\u0648\u0641 \u0645\u062A\u0632\u0627\u064A\u062F\u0629 \u0645\u0646 \u062A\u0628\u0627\u0637\u0624 \u0627\u0644\u0646\u0645\u0648 \u0627\u0644\u0627\u0642\u062A\u0635\u0627\u062F\u064A \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u060C \u062D\u064A\u062B \u062A\u0631\u0627\u062C\u0639\u062A \u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0641\u064A \u0628\u0648\u0631\u0635\u0627\u062A \u0623\u0648\u0631\u0648\u0628\u0627 \u0648\u0622\u0633\u064A\u0627 \u0628\u0634\u0643\u0644 \u0645\u0644\u062D\u0648\u0638 \u0645\u0639 \u0627\u0631\u062A\u0641\u0627\u0639 \u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0646\u0641\u0637", "\u0631\u0648\u064A\u062A\u0631\u0632", 0, "world");
  insertNews.run("news-wr-2", "\u062A\u0637\u0648\u0631\u0627\u062A \u062C\u062F\u064A\u062F\u0629 \u0641\u064A \u0645\u0633\u0627\u0639\u064A \u0627\u0644\u0633\u0644\u0627\u0645 \u0628\u0627\u0644\u0634\u0631\u0642 \u0627\u0644\u0623\u0648\u0633\u0637", "\u0634\u0647\u062F\u062A \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u062A\u0637\u0648\u0631\u0627\u062A \u062F\u0628\u0644\u0648\u0645\u0627\u0633\u064A\u0629 \u0645\u0643\u062B\u0641\u0629 \u0645\u0639 \u0627\u0633\u062A\u0645\u0631\u0627\u0631 \u0627\u0644\u062C\u0647\u0648\u062F \u0627\u0644\u062F\u0648\u0644\u064A\u0629 \u0644\u062A\u0647\u062F\u0626\u0629 \u0627\u0644\u0623\u0648\u0636\u0627\u0639 \u0648\u0627\u0633\u062A\u0626\u0646\u0627\u0641 \u0645\u0633\u0627\u0631 \u0627\u0644\u062A\u0641\u0627\u0648\u0636\u060C \u062D\u064A\u062B \u0623\u062C\u0631\u062A \u0639\u0648\u0627\u0635\u0645 \u0639\u0627\u0644\u0645\u064A\u0629 \u0639\u062F\u0629 \u0627\u062A\u0635\u0627\u0644\u0627\u062A \u0645\u0643\u062B\u0641\u0629 \u0644\u062F\u0639\u0645 \u0627\u0633\u062A\u0642\u0631\u0627\u0631 \u0627\u0644\u0645\u0646\u0637\u0642\u0629", "\u0627\u0644\u062C\u0632\u064A\u0631\u0629", 0, "world");
  insertNews.run("news-wr-3", "\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u064A\u062D\u062F\u062B \u062B\u0648\u0631\u0629 \u0641\u064A \u0642\u0637\u0627\u0639 \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629 \u0639\u0627\u0644\u0645\u064A\u0627", "\u0623\u062D\u062F\u062B\u062A \u062A\u0642\u0646\u064A\u0627\u062A \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0637\u0641\u0631\u0629 \u0646\u0648\u0639\u064A\u0629 \u0641\u064A \u0642\u0637\u0627\u0639 \u0627\u0644\u0631\u0639\u0627\u064A\u0629 \u0627\u0644\u0635\u062D\u064A\u0629 \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u060C \u062D\u064A\u062B \u0623\u0635\u0628\u062D\u062A \u0627\u0644\u062A\u0637\u0628\u064A\u0642\u0627\u062A \u0627\u0644\u0630\u0643\u064A\u0629 \u0642\u0627\u062F\u0631\u0629 \u0639\u0644\u0649 \u062A\u0634\u062E\u064A\u0635 \u0627\u0644\u0623\u0645\u0631\u0627\u0636 \u0628\u062F\u0642\u0629 \u0639\u0627\u0644\u064A\u0629 \u0648\u062A\u0637\u0648\u064A\u0631 \u0639\u0644\u0627\u062C\u0627\u062A \u0645\u062E\u0635\u0635\u0629 \u0648\u062A\u0633\u0631\u064A\u0639 \u0627\u0643\u062A\u0634\u0627\u0641 \u0627\u0644\u0623\u062F\u0648\u064A\u0629 \u0627\u0644\u062C\u062F\u064A\u062F\u0629", "\u0628\u064A \u0628\u064A \u0633\u064A", 0, "world");
  insertNews.run("news-wr-4", "\u0623\u0648\u0628\u0643 \u062A\u0642\u0631\u0631 \u062A\u0639\u062F\u064A\u0644 \u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0646\u0641\u0637 \u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0644\u0645\u062A\u063A\u064A\u0631\u0627\u062A \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u0629", "\u0642\u0631\u0631\u062A \u0645\u0646\u0638\u0645\u0629 \u0623\u0648\u0628\u0643 \u062A\u0639\u062F\u064A\u0644 \u0645\u0633\u062A\u0648\u064A\u0627\u062A \u0625\u0646\u062A\u0627\u062C \u0627\u0644\u0646\u0641\u0637 \u0627\u0633\u062A\u062C\u0627\u0628\u0629 \u0644\u0644\u062A\u062D\u0648\u0644\u0627\u062A \u0641\u064A \u0623\u0633\u0648\u0627\u0642 \u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u0639\u0627\u0644\u0645\u064A\u0629\u060C \u0645\u0639 \u0627\u0644\u062A\u0623\u0643\u064A\u062F \u0639\u0644\u0649 \u0627\u0644\u062A\u0632\u0627\u0645 \u0627\u0644\u0645\u0646\u0638\u0645\u0629 \u0628\u0636\u0645\u0627\u0646 \u0627\u0633\u062A\u0642\u0631\u0627\u0631 \u0627\u0644\u0633\u0648\u0642 \u0648\u062A\u0644\u0628\u064A\u0629 \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0639\u0627\u0644\u0645\u064A \u0628\u0634\u0643\u0644 \u0645\u0633\u062A\u062F\u0627\u0645", "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", 0, "world");
  insertNews.run("news-wr-5", "\u0627\u062A\u0641\u0627\u0642\u064A\u0629 \u062F\u0648\u0644\u064A\u0629 \u062C\u062F\u064A\u062F\u0629 \u0644\u0645\u0643\u0627\u0641\u062D\u0629 \u062A\u063A\u064A\u0631 \u0627\u0644\u0645\u0646\u0627\u062E \u062A\u0639\u062A\u0645\u062F \u0641\u064A \u0642\u0645\u0629 \u0639\u0627\u0644\u0645\u064A\u0629", "\u062A\u0645 \u0627\u0639\u062A\u0645\u0627\u062F \u0627\u062A\u0641\u0627\u0642\u064A\u0629 \u062F\u0648\u0644\u064A\u0629 \u062C\u062F\u064A\u062F\u0629 \u0644\u0645\u0643\u0627\u0641\u062D\u0629 \u062A\u063A\u064A\u0631 \u0627\u0644\u0645\u0646\u0627\u062E \u062E\u0644\u0627\u0644 \u0642\u0645\u0629 \u0639\u0627\u0644\u0645\u064A\u0629 \u062D\u0636\u0631\u0647\u0627 \u0642\u0627\u062F\u0629 \u0623\u0643\u062B\u0631 \u0645\u0646 150 \u062F\u0648\u0644\u0629\u060C \u062A\u062A\u0636\u0645\u0646 \u0627\u0644\u062A\u0632\u0627\u0645\u0627\u062A \u0645\u0644\u0632\u0645\u0629 \u0628\u062E\u0641\u0636 \u0627\u0644\u0627\u0646\u0628\u0639\u0627\u062B\u0627\u062A \u0627\u0644\u0643\u0631\u0628\u0648\u0646\u064A\u0629 \u0648\u062A\u0645\u0648\u064A\u0644 \u0645\u0634\u0627\u0631\u064A\u0639 \u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u0645\u062A\u062C\u062F\u062F\u0629 \u0641\u064A \u0627\u0644\u062F\u0648\u0644 \u0627\u0644\u0646\u0627\u0645\u064A\u0629 \u0628\u0645\u0628\u0644\u063A 100 \u0645\u0644\u064A\u0627\u0631 \u062F\u0648\u0644\u0627\u0631 \u0633\u0646\u0648\u064A\u0627", "\u0641\u0631\u0627\u0646\u0633 24", 0, "world");
  insertNews.run("news-ur-1", "\u062A\u062D\u062F\u064A\u062B \u0639\u0627\u062C\u0644: \u062A\u0639\u0637\u0644 \u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0641\u064A \u0628\u0639\u0636 \u0627\u0644\u0628\u0646\u0648\u0643 \u0627\u0644\u0645\u0635\u0631\u064A\u0629", "\u062A\u0639\u0631\u0641 \u0628\u0639\u0636 \u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0641\u064A \u0639\u062F\u062F \u0645\u0646 \u0627\u0644\u0628\u0646\u0648\u0643 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 \u0639\u0644\u0649 \u062A\u0639\u0637\u0644 \u0645\u0624\u0642\u062A \u0628\u0633\u0628\u0628 \u062A\u062D\u062F\u064A\u062B\u0627\u062A \u0641\u0646\u064A\u0629 \u062C\u0627\u0631\u064A\u0629\u060C \u0648\u064A\u062A\u0648\u0642\u0639 \u0627\u0633\u062A\u0626\u0646\u0627\u0641 \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u062E\u0644\u0627\u0644 \u0627\u0644\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0642\u0644\u064A\u0644\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629. \u0646\u0646\u0635\u062D \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0628\u062F\u0627\u0626\u0644 \u0627\u0644\u0645\u062A\u0627\u062D\u0629 \u062D\u062A\u0649 \u0639\u0648\u062F\u0629 \u0627\u0644\u062E\u062F\u0645\u0629", "\u0646\u0648\u0627\u0642\u0635 \u0639\u0627\u062C\u0644", 1, "urgent");
  insertNews.run("news-ur-2", "\u062A\u0646\u0628\u064A\u0647 \u0647\u0627\u0645: \u062A\u062D\u062F\u064A\u062B \u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 \u0648\u0634\u0631\u0648\u0637 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645", "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 \u0648\u0634\u0631\u0648\u0637 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0639\u0644\u0649 \u0645\u0646\u0635\u0629 \u0646\u0648\u0627\u0642\u0635 \u0644\u062D\u0645\u0627\u064A\u0629 \u0628\u064A\u0627\u0646\u0627\u062A\u0643\u0645 \u0628\u0634\u0643\u0644 \u0623\u0641\u0636\u0644. \u064A\u0631\u062C\u0649 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u062A\u062D\u062F\u064A\u062B\u0627\u062A \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0641\u064A \u0635\u0641\u062D\u0629 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0644\u0644\u0645\u062A\u0627\u0628\u0639\u0629", "\u0646\u0648\u0627\u0642\u0635", 1, "urgent");
  console.log("[DB] Database seeded with Egyptian, World, and Breaking news");
}
var citiesCount = db.prepare("SELECT COUNT(*) as count FROM cities_lookup").get();
if (citiesCount.count === 0) {
  const insertCity = db.prepare("INSERT INTO cities_lookup (id, name_ar, name_en, region, population) VALUES (?, ?, ?, ?, ?)");
  insertCity.run("cairo", "\u0627\u0644\u0642\u0627\u0647\u0631\u0629", "Cairo", "cairo", 10);
  insertCity.run("giza", "\u0627\u0644\u062C\u064A\u0632\u0629", "Giza", "cairo", 8.8);
  insertCity.run("qalyubia", "\u0627\u0644\u0642\u0644\u064A\u0648\u0628\u064A\u0629", "Qalyubia", "cairo", 5.5);
  insertCity.run("alexandria", "\u0627\u0644\u0625\u0633\u0643\u0646\u062F\u0631\u064A\u0629", "Alexandria", "alexandria", 5.4);
  insertCity.run("beheira", "\u0627\u0644\u0628\u062D\u064A\u0631\u0629", "Beheira", "delta", 6.1);
  insertCity.run("kafr_elsheikh", "\u0643\u0641\u0631 \u0627\u0644\u0634\u064A\u062E", "Kafr El Sheikh", "delta", 3.2);
  insertCity.run("damietta", "\u062F\u0645\u064A\u0627\u0637", "Damietta", "delta", 1.4);
  insertCity.run("dakahlia", "\u0627\u0644\u062F\u0642\u0647\u0644\u064A\u0629", "Dakahlia", "delta", 6);
  insertCity.run("sharqia", "\u0627\u0644\u0634\u0631\u0642\u064A\u0629", "Sharqia", "delta", 6.7);
  insertCity.run("monufia", "\u0627\u0644\u0645\u0646\u0648\u0641\u064A\u0629", "Monufia", "delta", 4.2);
  insertCity.run("gharbia", "\u0627\u0644\u063A\u0631\u0628\u064A\u0629", "Gharbia", "delta", 4.8);
  insertCity.run("suez", "\u0627\u0644\u0633\u0648\u064A\u0633", "Suez", "canal", 0.7);
  insertCity.run("ismailia", "\u0627\u0644\u0625\u0633\u0645\u0627\u0639\u064A\u0644\u064A\u0629", "Ismailia", "canal", 1.3);
  insertCity.run("port_said", "\u0628\u0648\u0631\u0633\u0639\u064A\u062F", "Port Said", "canal", 0.7);
  insertCity.run("north_sinai", "\u0634\u0645\u0627\u0644 \u0633\u064A\u0646\u0627\u0621", "North Sinai", "canal", 0.4);
  insertCity.run("south_sinai", "\u062C\u0646\u0648\u0628 \u0633\u064A\u0646\u0627\u0621", "South Sinai", "canal", 0.1);
  insertCity.run("fayoum", "\u0627\u0644\u0641\u064A\u0648\u0645", "Fayoum", "upper", 3.5);
  insertCity.run("benisuef", "\u0628\u0646\u064A \u0633\u0648\u064A\u0641", "Beni Suef", "upper", 3.1);
  insertCity.run("minya", "\u0627\u0644\u0645\u0646\u064A\u0627", "Minya", "upper", 5.5);
  insertCity.run("asyut", "\u0623\u0633\u064A\u0648\u0637", "Asyut", "upper", 4.3);
  insertCity.run("sohag", "\u0633\u0648\u0647\u0627\u062C", "Sohag", "upper", 4.6);
  insertCity.run("qena", "\u0642\u0646\u0627", "Qena", "upper", 3);
  insertCity.run("luxor", "\u0627\u0644\u0623\u0642\u0635\u0631", "Luxor", "upper", 1.1);
  insertCity.run("aswan", "\u0623\u0633\u0648\u0627\u0646", "Aswan", "upper", 1.4);
  insertCity.run("new_valley", "\u0627\u0644\u0648\u0627\u062F\u064A \u0627\u0644\u062C\u062F\u064A\u062F", "New Valley", "border", 0.2);
  insertCity.run("red_sea", "\u0627\u0644\u0628\u062D\u0631 \u0627\u0644\u0623\u062D\u0645\u0631", "Red Sea", "border", 0.4);
  insertCity.run("matrouh", "\u0645\u0637\u0631\u0648\u062D", "Matrouh", "border", 0.5);
  console.log("[DB] Database seeded with Egyptian cities lookup table");
}
function updateMarketTrendsFromRealData() {
  try {
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
    `).all();
    const categoryTrendData = {};
    for (const cat of categoryStats) {
      const recent = db.prepare(`
        SELECT COUNT(*) as count FROM posts 
        WHERE type = 'ad' AND status = 'active' AND category = ? 
        AND created_at >= datetime('now', '-7 days')
      `).get(cat.category);
      const previous = db.prepare(`
        SELECT COUNT(*) as count FROM posts 
        WHERE type = 'ad' AND status = 'active' AND category = ? 
        AND created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')
      `).get(cat.category);
      categoryTrendData[cat.category] = {
        recent: recent.count || 0,
        previous: previous.count || 0,
        avgPrice: cat.avg_price,
        count: cat.count,
        totalLikes: cat.total_likes
      };
    }
    const categoryNames = {
      phones: "\u0647\u0648\u0627\u062A\u0641",
      cars: "\u0633\u064A\u0627\u0631\u0627\u062A",
      electronics: "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A",
      realEstate: "\u0639\u0642\u0627\u0631\u0627\u062A",
      games: "\u0623\u0644\u0639\u0627\u0628",
      fashion: "\u0623\u0632\u064A\u0627\u0621",
      services: "\u062E\u062F\u0645\u0627\u062A",
      books: "\u0643\u062A\u0628",
      sports: "\u0631\u064A\u0627\u0636\u0629",
      animals: "\u062D\u064A\u0648\u0627\u0646\u0627\u062A",
      jobs: "\u0648\u0638\u0627\u0626\u0641",
      other: "\u0623\u062E\u0631\u0649",
      beauty: "\u062A\u062C\u0645\u064A\u0644",
      education: "\u062A\u0639\u0644\u064A\u0645",
      health: "\u0635\u062D\u0629",
      food: "\u0637\u0639\u0627\u0645 \u0648\u0645\u0637\u0627\u0639\u0645",
      travel: "\u0633\u0641\u0631 \u0648\u0633\u064A\u0627\u062D\u0629",
      photography: "\u062A\u0635\u0648\u064A\u0631"
    };
    db.prepare("DELETE FROM market_trends").run();
    const insertTrend = db.prepare("INSERT INTO market_trends (id, item, trend, change, category, price, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))");
    for (const [cat, data] of Object.entries(categoryTrendData)) {
      if (data.count < 1) continue;
      let trend = "stable";
      let changePercent = 0;
      if (data.previous > 0) {
        changePercent = Math.round((data.recent - data.previous) / data.previous * 100);
        if (changePercent > 3) trend = "up";
        else if (changePercent < -3) trend = "down";
      } else if (data.recent > 0) {
        changePercent = 100;
        trend = "up";
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
    const newTrendCount = db.prepare("SELECT COUNT(*) as count FROM market_trends").get();
    if (newTrendCount.count === 0) {
      insertTrend.run("trend-placeholder", "\u0627\u0644\u0633\u0648\u0642", "stable", "0%", "", 0);
    }
    console.log(`[DB] Updated market trends from real data: ${newTrendCount.count} trends`);
  } catch (err) {
    console.log("[DB] Market trends update failed:", err.message);
  }
}
updateMarketTrendsFromRealData();
var trendCount = db.prepare("SELECT COUNT(*) as count FROM market_trends").get();
if (trendCount.count === 0) {
  console.log("[DB] No real post data for trends, using placeholder");
}
try {
  db.prepare('ALTER TABLE market_trends ADD COLUMN category TEXT DEFAULT ""').run();
} catch {
}
try {
  db.prepare("ALTER TABLE market_trends ADD COLUMN price REAL").run();
} catch {
}
try {
  db.prepare("ALTER TABLE market_trends ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))").run();
} catch {
}
try {
  db.prepare("ALTER TABLE market_listings ADD COLUMN is_featured INTEGER DEFAULT 0").run();
} catch {
}
try {
  db.prepare("ALTER TABLE market_listings ADD COLUMN shares_count INTEGER DEFAULT 0").run();
} catch {
}
try {
  db.prepare("ALTER TABLE market_listings ADD COLUMN reach_count INTEGER DEFAULT 0").run();
} catch {
}
try {
  db.prepare("ALTER TABLE market_promotion_requests ADD COLUMN listing_title TEXT NOT NULL DEFAULT ''").run();
} catch {
}
var database_default = db;

// src/websocket/index.ts
var WebSocketManager = class {
  wss = null;
  clients = /* @__PURE__ */ new Map();
  // userId → ClientInfo
  userIdToSockets = /* @__PURE__ */ new Map();
  // userId → Set of sockets
  // Track active livestreams: userId → { hostId, hostName, hostAvatar, startedAt }
  activeStreams = /* @__PURE__ */ new Map();
  /**
   * Initialize the WebSocket server, attached to an existing HTTP server
   */
  initialize(server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.wss.on("connection", (ws, req) => {
      console.log("[WS] New connection attempt");
      let authenticated = false;
      let userId = "";
      let isAdmin = false;
      let authTimeout;
      authTimeout = setTimeout(() => {
        if (!authenticated) {
          console.log("[WS] Connection timed out - no auth");
          ws.close(4001, "Authentication timeout");
        }
      }, 1e4);
      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "auth" && msg.token) {
            try {
              const payload = verifyToken(msg.token);
              if (!payload || !payload.userId) {
                ws.close(4003, "Invalid token");
                return;
              }
              authenticated = true;
              userId = payload.userId;
              isAdmin = !!payload.isAdmin;
              clearTimeout(authTimeout);
              this.clients.set(userId, {
                ws,
                userId,
                isAdmin,
                connectedAt: Date.now()
              });
              if (!this.userIdToSockets.has(userId)) {
                this.userIdToSockets.set(userId, /* @__PURE__ */ new Set());
              }
              this.userIdToSockets.get(userId).add(ws);
              this.sendToSocket(ws, { type: "auth:success", data: { userId, isAdmin } });
              this.broadcast({ type: "presence:online", data: { userId } }, { excludeUserId: userId });
              console.log(`[WS] User ${userId} connected (admin: ${isAdmin})`);
            } catch (err) {
              console.error("[WS] Auth failed:", err);
              ws.close(4003, "Authentication failed");
            }
            return;
          }
          if (msg.type === "presence:heartbeat" && authenticated) {
            try {
              database_default.prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?").run(userId);
            } catch {
            }
            this.sendToSocket(ws, { type: "presence:ack", data: {} });
            return;
          }
          if (msg.type === "chat:typing" && authenticated) {
            const { receiverId } = msg.data || {};
            if (receiverId) {
              this.sendToUser(receiverId, {
                type: "chat:typing",
                data: { senderId: userId }
              });
            }
            return;
          }
          if (msg.type === "chat:read" && authenticated) {
            const { contactId } = msg.data || {};
            if (contactId) {
              this.sendToUser(contactId, {
                type: "chat:read",
                data: { readerId: userId }
              });
            }
            return;
          }
          if (msg.type === "presence:get-online" && authenticated) {
            const onlineUsersList = Array.from(this.userIdToSockets.keys());
            this.sendToSocket(ws, { type: "presence:online-list", data: { users: onlineUsersList } });
            return;
          }
          if (msg.type === "call:signal" && authenticated) {
            const { targetUserId, signal } = msg.data || {};
            if (targetUserId) {
              this.sendToUser(targetUserId, {
                type: "call:signal",
                data: { signal, fromId: userId }
              });
            }
            return;
          }
          if (msg.type === "livestream:start" && authenticated) {
            const { streamId, title, userName, userAvatar } = msg.data || {};
            let name = userName;
            let avatar = userAvatar;
            if (!name) {
              try {
                const user = database_default.prepare("SELECT name, avatar FROM users WHERE id = ?").get(userId);
                name = user?.name || "\u0645\u0633\u062A\u062E\u062F\u0645";
                avatar = user?.avatar || "";
              } catch {
                name = "\u0645\u0633\u062A\u062E\u062F\u0645";
              }
            }
            this.broadcast({
              type: "livestream:started",
              data: { streamId: streamId || userId, hostId: userId, hostName: name, hostAvatar: avatar, title: title || "" }
            }, { excludeUserId: userId });
            this.activeStreams.set(userId, { hostId: userId, hostName: name || "\u0645\u0633\u062A\u062E\u062F\u0645", hostAvatar: avatar || "", startedAt: Date.now() });
            return;
          }
          if (msg.type === "livestream:end" && authenticated) {
            const { streamId } = msg.data || {};
            this.broadcast({
              type: "livestream:ended",
              data: { streamId: streamId || userId, hostId: userId }
            }, { excludeUserId: userId });
            this.activeStreams.delete(userId);
            return;
          }
          if (msg.type === "livestream:chat" && authenticated) {
            const { streamId, text } = msg.data || {};
            let name = "";
            let avatar = "";
            try {
              const user = database_default.prepare("SELECT name, avatar FROM users WHERE id = ?").get(userId);
              name = user?.name || "\u0645\u0633\u062A\u062E\u062F\u0645";
              avatar = user?.avatar || "";
            } catch {
              name = "\u0645\u0633\u062A\u062E\u062F\u0645";
            }
            this.broadcast({
              type: "livestream:chat",
              data: { streamId: streamId || userId, userId, userName: name, userAvatar: avatar, text, time: (/* @__PURE__ */ new Date()).toISOString() }
            });
            return;
          }
          if (msg.type === "livestream:join" && authenticated) {
            const { streamId } = msg.data || {};
            this.sendToUser(streamId, {
              type: "livestream:viewer-joined",
              data: { streamId, viewerId: userId }
            });
            return;
          }
          if (msg.type === "livestream:leave" && authenticated) {
            const { streamId } = msg.data || {};
            this.sendToUser(streamId, {
              type: "livestream:viewer-left",
              data: { streamId, viewerId: userId }
            });
            return;
          }
          if (msg.type === "livestream:signal" && authenticated) {
            const { streamId, signal } = msg.data || {};
            if (signal?.targetViewer) {
              this.sendToUser(signal.targetViewer, {
                type: "livestream:signal",
                data: { streamId: streamId || userId, fromId: userId, signal }
              });
            } else if (signal?.type === "answer") {
              this.sendToUser(streamId, {
                type: "livestream:signal",
                data: { streamId, fromId: userId, signal }
              });
            } else {
              this.broadcast({
                type: "livestream:signal",
                data: { streamId: streamId || userId, fromId: userId, signal }
              }, { excludeUserId: userId });
            }
            return;
          }
        } catch (err) {
          console.error("[WS] Message parse error:", err);
        }
      });
      ws.on("close", () => {
        clearTimeout(authTimeout);
        if (userId) {
          const sockets = this.userIdToSockets.get(userId);
          if (sockets) {
            sockets.delete(ws);
            if (sockets.size === 0) {
              this.userIdToSockets.delete(userId);
              this.clients.delete(userId);
              this.broadcast({ type: "presence:offline", data: { userId } });
            }
          }
          console.log(`[WS] User ${userId} disconnected`);
        }
      });
      ws.on("error", (err) => {
        console.error(`[WS] Error for user ${userId}:`, err.message);
      });
    });
    console.log("[WS] WebSocket server initialized on /ws");
  }
  /**
   * Send a message to a specific WebSocket connection
   */
  sendToSocket(ws, event) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }
  /**
   * Send an event to a specific user (all their connections)
   */
  sendToUser(userId, event) {
    const sockets = this.userIdToSockets.get(userId);
    if (sockets) {
      const data = JSON.stringify(event);
      for (const ws of sockets) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      }
    }
  }
  /**
   * Broadcast an event to all connected clients, with optional filtering
   */
  broadcast(event, options) {
    if (!this.wss) return;
    const data = JSON.stringify(event);
    const excludeId = event.excludeUserId || options?.excludeUserId;
    for (const [uid, client] of this.clients) {
      if (uid === excludeId) continue;
      if (event.adminOnly && !client.isAdmin) continue;
      if (event.targetUserIds && !event.targetUserIds.includes(uid)) continue;
      if (event.targetUserId && uid !== event.targetUserId) continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }
  /**
   * Get list of online user IDs
   */
  getOnlineUsers() {
    return Array.from(this.userIdToSockets.keys());
  }
  /**
   * Get count of connected clients
   */
  getConnectionCount() {
    return this.clients.size;
  }
  /**
   * Check if a user is online
   */
  isUserOnline(userId) {
    const sockets = this.userIdToSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }
  /**
   * Emit a notification event to a specific user
   */
  emitNotification(userId, notification) {
    this.sendToUser(userId, {
      type: "notification:new",
      data: notification
    });
  }
  /**
   * Emit a new chat message event
   */
  emitChatMessage(receiverId, message) {
    this.sendToUser(receiverId, {
      type: "chat:message",
      data: message
    });
  }
  /**
   * Emit a friend request event
   */
  emitFriendRequest(addresseeId, requestData) {
    this.sendToUser(addresseeId, {
      type: "friend:request",
      data: requestData
    });
  }
  /**
   * Emit a friend request accepted event
   */
  emitFriendAccepted(requesterId, data) {
    this.sendToUser(requesterId, {
      type: "friend:accepted",
      data
    });
  }
  /**
   * Emit a call signal to a specific user (WebRTC signaling)
   */
  emitCallSignal(targetUserId, signalData) {
    this.sendToUser(targetUserId, {
      type: "call:signal",
      data: signalData
    });
  }
  /**
   * Emit admin event to all admin users
   */
  emitAdminEvent(eventType, data) {
    this.broadcast({
      type: `admin:${eventType}`,
      data,
      adminOnly: true
    });
  }
  /**
   * Emit admin alert to ALL connected users (not just admins)
   * Used for the admin alert bar that appears at the top of every page
   */
  emitAdminAlert(alertData) {
    this.broadcast({
      type: "admin:alert",
      data: alertData
    });
  }
  /**
   * Emit livestream event (started/ended/chat)
   */
  emitLivestreamEvent(eventType, data, excludeUserId) {
    this.broadcast({
      type: `livestream:${eventType}`,
      data
    }, { excludeUserId });
  }
};
var wsManager = new WebSocketManager();

// src/middleware/validation.ts
var XSS_PATTERNS = /<script|javascript:|on\w+=|eval\(|document\.|window\.|alert\(|prompt\(|confirm\(|expression\(|url\(|import\(|require\(|fetch\(|xmlhttprequest|\.cookie|\.location|\.href|data:\s*text\/html|vbscript:|livescript:|mocha:|<iframe|<object|<embed|<link|<meta|<base|<form/i;
var EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
var PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
function validateInput(req, res, next) {
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 50 * 1024 * 1024) {
    res.status(413).json({ error: "\u062D\u062C\u0645 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0643\u0628\u064A\u0631 \u062C\u062F\u0627\u064B" });
    return;
  }
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.is("application/json")) {
    if (!req.body || typeof req.body !== "object") {
      res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      return;
    }
    const bodyStr = JSON.stringify(req.body);
    if (XSS_PATTERNS.test(bodyStr)) {
      res.status(400).json({ error: "\u064A\u062D\u062A\u0648\u064A \u0627\u0644\u0646\u0635 \u0639\u0644\u0649 \u0645\u062D\u062A\u0648\u0649 \u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u0647" });
      return;
    }
    if (req.body.email && !EMAIL_REGEX.test(req.body.email)) {
      res.status(400).json({ error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
      return;
    }
    if (req.body.password && (req.path.includes("register") || req.path.includes("signup") || req.path.includes("change-password"))) {
      if (!PASSWORD_REGEX.test(req.body.password)) {
        res.status(400).json({
          error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0648\u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062D\u0631\u0641 \u0643\u0628\u064A\u0631 \u0648\u062D\u0631\u0641 \u0635\u063A\u064A\u0631 \u0648\u0631\u0642\u0645"
        });
        return;
      }
    }
    if (req.body.phone && req.body.phone.trim() !== "") {
      const phone = req.body.phone.replace(/[\s\-+]/g, "");
      if (!/^(01[0-9]{9}|0[2-9][0-9]{7,8})$/.test(phone)) {
        res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
        return;
      }
    }
    const MAX_STRING_LENGTH = 5e3;
    const MAX_CONTENT_LENGTH = 2e4;
    const MAX_IMAGE_LENGTH = 7e7;
    const IMAGE_FIELDS = /* @__PURE__ */ new Set([
      "image",
      "avatar",
      "avatarBase64",
      "avatar_base64",
      "coverPhoto",
      "cover_photo",
      "imageUrl",
      "image_url",
      "receipt_image",
      "thumbnail_url",
      "video_url",
      "videoUrl",
      "video",
      "videoUrl",
      "media",
      "mediaUrl"
    ]);
    for (const key of Object.keys(req.body)) {
      const val = req.body[key];
      if (typeof val === "string") {
        let maxLen;
        if (IMAGE_FIELDS.has(key) || val.startsWith("data:image/") || val.startsWith("data:video/")) {
          maxLen = MAX_IMAGE_LENGTH;
        } else if (key === "content" || key === "bio" || key === "description" || key === "text" || key === "message") {
          maxLen = MAX_CONTENT_LENGTH;
        } else {
          maxLen = MAX_STRING_LENGTH;
        }
        if (val.length > maxLen) {
          res.status(400).json({ error: `\u0627\u0644\u062D\u0642\u0644 "${key}" \u064A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D` });
          return;
        }
      }
    }
    req.body = trimStrings(req.body);
  }
  next();
}
function trimStrings(obj, skipTrim = /* @__PURE__ */ new Set(["content", "bio", "text", "message", "password", "image", "avatar", "avatarBase64", "avatar_base64", "coverPhoto", "cover_photo", "imageUrl", "image_url"])) {
  if (typeof obj === "string") return obj;
  if (Array.isArray(obj)) return obj.map((item) => trimStrings(item, skipTrim));
  if (obj && typeof obj === "object") {
    const result = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === "string" && !skipTrim.has(key)) {
        result[key] = val.trim();
      } else if (typeof val === "object" && val !== null) {
        result[key] = trimStrings(val, skipTrim);
      } else {
        result[key] = val;
      }
    }
    return result;
  }
  return obj;
}
var rateLimitMap = /* @__PURE__ */ new Map();
function rateLimit(req, res, next) {
  const vitePaths = ["/@", "/node_modules", "/src/", "/@id/", "/@fs/", "/@vite/", "/@react-refresh"];
  if (process.env.NODE_ENV !== "production" && vitePaths.some((p) => req.path.startsWith(p))) {
    next();
    return;
  }
  if (req.path.match(/\.(js|css|map|ico|png|jpg|svg|woff2?|ttf|eot)$/)) {
    next();
    return;
  }
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const isDev = process.env.NODE_ENV !== "production";
  const windowMs = isDev ? 1e4 : 6e4;
  const maxRequests = isDev ? 500 : 100;
  if (rateLimitMap.size > 1e3) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  res.setHeader("X-RateLimit-Limit", maxRequests);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count));
  if (entry.count > maxRequests) {
    res.status(429).json({ error: "\u0637\u0644\u0628\u0627\u062A \u0643\u062B\u064A\u0631\u0629 \u062C\u062F\u0627\u064B\u060C \u062D\u0627\u0648\u0644 \u0628\u0639\u062F \u062F\u0642\u064A\u0642\u0629" });
    return;
  }
  next();
}
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  const frameAncestors = process.env.NODE_ENV === "production" ? "frame-ancestors 'self' https://*.huggingface.co https://huggingface.co" : "frame-ancestors 'self'";
  res.removeHeader("X-Frame-Options");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self)");
  res.setHeader("Content-Security-Policy", `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' ws: wss: https:; ${frameAncestors};`);
  res.removeHeader("X-Powered-By");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
}

// src/routes/auth.ts
import { Router } from "express";
import bcrypt2 from "bcryptjs";
import crypto3 from "crypto";
init_auth();

// src/utils/serverAvatar.ts
function getDefaultAvatar(seed, gender) {
  const encodedSeed = encodeURIComponent(seed || "default");
  if (gender === "female") {
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodedSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodedSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

// src/routes/auth.ts
var router = Router();
var resetTokens = /* @__PURE__ */ new Map();
function parseUser(row) {
  if (!row) return null;
  let interests = [];
  try {
    interests = JSON.parse(row.interests || "[]");
  } catch {
    interests = [];
  }
  let paymentMethods = [];
  try {
    paymentMethods = JSON.parse(row.payment_methods || "[]");
  } catch {
    paymentMethods = [];
  }
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
    gender: row.gender || "male",
    password_hash: void 0,
    // excluded from response
    avatar_base64: row.avatar_base64 || void 0
  };
}
router.post("/register", (req, res) => {
  try {
    const { name, email, password, phone, interests, gender, dateOfBirth } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "\u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0628\u0631\u064A\u062F \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0648\u0646" });
      return;
    }
    if (!phone || phone.trim().length < 11) {
      res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0645\u0637\u0644\u0648\u0628 \u0648\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 11 \u0631\u0642\u0645\u0627\u064B \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" });
      return;
    }
    if (!dateOfBirth) {
      res.status(400).json({ error: "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0645\u064A\u0644\u0627\u062F \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    const birthDate = new Date(dateOfBirth);
    const today = /* @__PURE__ */ new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || monthDiff === 0 && today.getDate() < birthDate.getDate()) {
      age--;
    }
    if (age < 13 || age > 120) {
      res.status(400).json({ error: "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0639\u0645\u0631\u0643 13 \u0633\u0646\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "\u0635\u064A\u063A\u0629 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      return;
    }
    if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      res.status(400).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0648\u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062D\u0631\u0641 \u0643\u0628\u064A\u0631 \u0648\u062D\u0631\u0641 \u0635\u063A\u064A\u0631 \u0648\u0631\u0642\u0645" });
      return;
    }
    if (name.trim().length < 2) {
      res.status(400).json({ error: "\u0627\u0644\u0627\u0633\u0645 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u062D\u0631\u0641\u064A\u0646 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644" });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();
    const phoneRegex = /^01[0-2,5]{1}[0-9]{8}$/;
    if (!phoneRegex.test(normalizedPhone)) {
      res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0631\u0642\u0645 \u0645\u0635\u0631\u064A \u0635\u062D\u064A\u062D (01xxxxxxxxx)" });
      return;
    }
    const existingEmail = database_default.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
    if (existingEmail) {
      res.status(409).json({ error: "\u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u0645\u0633\u062C\u0644 \u0628\u0627\u0644\u0641\u0639\u0644" });
      return;
    }
    const existingPhone = database_default.prepare("SELECT id FROM users WHERE phone = ?").get(normalizedPhone);
    if (existingPhone) {
      res.status(409).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0645\u0633\u062C\u0644 \u0628\u0627\u0644\u0641\u0639\u0644 \u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0622\u062E\u0631" });
      return;
    }
    const passwordHash = bcrypt2.hashSync(password, 12);
    const avatarSeed = name.trim();
    const userGenderValue = gender === "male" || gender === "female" ? gender : "male";
    const avatar = getDefaultAvatar(avatarSeed, userGenderValue);
    const userGender = gender === "male" || gender === "female" ? gender : "male";
    try {
      database_default.prepare("ALTER TABLE users ADD COLUMN gender TEXT DEFAULT 'male'").run();
    } catch {
    }
    try {
      database_default.prepare("ALTER TABLE users ADD COLUMN date_of_birth TEXT DEFAULT ''").run();
    } catch {
    }
    database_default.prepare(`
      INSERT INTO users (name, email, password_hash, avatar, phone, interests, gender, date_of_birth)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name.trim(), normalizedEmail, passwordHash, avatar, normalizedPhone, JSON.stringify(interests || []), userGender, dateOfBirth);
    const user = database_default.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);
    const token = generateToken({ userId: user.id, email: user.email, isAdmin: !!user.is_admin });
    res.status(201).json({ user: parseUser(user), token });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062D\u0633\u0627\u0628", details: err.message });
  }
});
router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = database_default.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail);
    if (!user || !bcrypt2.compareSync(password, user.password_hash)) {
      res.status(401).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u062E\u0648\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      return;
    }
    if (user.is_deactivated) {
      res.status(403).json({ error: "\u0647\u0630\u0627 \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0639\u0637\u0644" });
      return;
    }
    const token = generateToken({ userId: user.id, email: user.email, isAdmin: !!user.is_admin });
    res.json({ user: parseUser(user), token });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644", details: err.message });
  }
});
router.post("/forgot-password", (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = database_default.prepare("SELECT id, name FROM users WHERE email = ?").get(normalizedEmail);
    if (!user) {
      res.json({ message: "\u0625\u0630\u0627 \u0643\u0627\u0646 \u0627\u0644\u0628\u0631\u064A\u062F \u0645\u0633\u062C\u0644\u0627\u064B\u060C \u0633\u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646" });
      return;
    }
    const resetCode = crypto3.randomInt(1e5, 999999).toString();
    const expiresAt = Date.now() + 15 * 60 * 1e3;
    resetTokens.set(resetCode, { userId: user.id, expiresAt });
    console.log(`[RESET] Password reset code for ${normalizedEmail}: ${resetCode}`);
    res.json({
      message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631",
      // Only include reset code in development mode (no email infrastructure yet)
      ...process.env.NODE_ENV !== "production" && { resetCode }
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646", details: err.message });
  }
});
router.post("/reset-password", (req, res) => {
  try {
    const { code, newPassword } = req.body;
    if (!code || !newPassword) {
      res.status(400).json({ error: "\u0631\u0645\u0632 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      return;
    }
    if (newPassword.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      res.status(400).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0648\u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062D\u0631\u0641 \u0643\u0628\u064A\u0631 \u0648\u062D\u0631\u0641 \u0635\u063A\u064A\u0631 \u0648\u0631\u0642\u0645" });
      return;
    }
    const tokenData = resetTokens.get(code);
    if (!tokenData || Date.now() > tokenData.expiresAt) {
      resetTokens.delete(code);
      res.status(400).json({ error: "\u0631\u0645\u0632 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D \u0623\u0648 \u0645\u0646\u062A\u0647\u064A \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0629" });
      return;
    }
    const newHash = bcrypt2.hashSync(newPassword, 12);
    database_default.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, tokenData.userId);
    resetTokens.delete(code);
    const user = database_default.prepare("SELECT * FROM users WHERE id = ?").get(tokenData.userId);
    const token = generateToken({ userId: user.id, email: user.email, isAdmin: !!user.is_admin });
    res.json({ message: "\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062C\u0627\u062D", user: parseUser(user), token });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631", details: err.message });
  }
});
router.get("/me", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const user = database_default.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId);
    if (!user) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    res.json(parseUser(user));
  } catch (err) {
    console.error("[API] /auth/me error:", err.message);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A", details: err.message });
  }
});
router.put("/profile", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const camelToSnake = {
      coverPhoto: "cover_photo",
      showPhone: "show_phone",
      showLocation: "show_location",
      avatarBase64: "avatar_base64",
      paymentMethods: "payment_methods"
    };
    const allowed = [
      "name",
      "phone",
      "location",
      "bio",
      "show_phone",
      "show_location",
      "interests",
      "payment_methods",
      "avatar_base64",
      "avatar",
      "cover_photo",
      "gender",
      "date_of_birth"
    ];
    const updates = [];
    const values = [];
    const booleanColumns = ["show_phone", "show_location", "is_verified", "is_admin", "is_trusted", "is_deactivated"];
    for (const [key, value] of Object.entries(req.body)) {
      const dbKey = camelToSnake[key] || key;
      if (allowed.includes(dbKey) && value !== void 0) {
        updates.push(`${dbKey} = ?`);
        if (booleanColumns.includes(dbKey) && typeof value === "boolean") {
          values.push(value ? 1 : 0);
        } else if (typeof value === "object") {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }
    if (updates.length === 0) {
      res.status(400).json({ error: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0644\u0644\u062A\u062D\u062F\u064A\u062B" });
      return;
    }
    updates.push("updated_at = datetime('now')");
    values.push(payload.userId);
    database_default.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    const user = database_default.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId);
    res.json(parseUser(user));
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A", details: err.message });
  }
});
router.put("/change-password", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0648\u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u0645\u0637\u0644\u0648\u0628\u062A\u0627\u0646" });
      return;
    }
    if (newPassword.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      res.status(400).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062C\u062F\u064A\u062F\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 8 \u0623\u062D\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0648\u062A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062D\u0631\u0641 \u0643\u0628\u064A\u0631 \u0648\u062D\u0631\u0641 \u0635\u063A\u064A\u0631 \u0648\u0631\u0642\u0645" });
      return;
    }
    const user = database_default.prepare("SELECT password_hash FROM users WHERE id = ?").get(payload.userId);
    if (!bcrypt2.compareSync(currentPassword, user.password_hash)) {
      res.status(401).json({ error: "\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D\u0629" });
      return;
    }
    const newHash = bcrypt2.hashSync(newPassword, 12);
    database_default.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, payload.userId);
    res.json({ message: "\u062A\u0645 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062C\u0627\u062D" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631", details: err.message });
  }
});
var auth_default = router;

// src/routes/posts.ts
import { Router as Router2 } from "express";
init_auth();
var router2 = Router2();
function parsePost(row) {
  if (!row) return null;
  let paymentMethods = [];
  try {
    paymentMethods = JSON.parse(row.payment_methods || "[]");
  } catch {
    paymentMethods = [];
  }
  let targetInterests = [];
  try {
    targetInterests = JSON.parse(row.target_interests || "[]");
  } catch {
    targetInterests = [];
  }
  return {
    ...row,
    payment_methods: Array.isArray(paymentMethods) ? paymentMethods : [],
    is_boosted: !!row.is_boosted,
    is_promoted: !!row.is_promoted,
    target_interests: targetInterests
  };
}
function attachAuthor(post) {
  if (!post || !post.author_id) return { ...post, author: null };
  try {
    const author = database_default.prepare("SELECT id, name, avatar, avatar_base64, is_verified, is_trusted, trust_score, interests FROM users WHERE id = ?").get(post.author_id);
    if (author) {
      try {
        author.interests = JSON.parse(author.interests || "[]");
      } catch {
        author.interests = [];
      }
      author.is_verified = !!author.is_verified;
      author.is_trusted = !!author.is_trusted;
      if (author.avatar_base64) author.avatar = author.avatar_base64;
      delete author.avatar_base64;
    }
    return { ...post, author };
  } catch {
    return { ...post, author: { id: post.author_id, name: "\u0645\u0633\u062A\u062E\u062F\u0645", avatar: getDefaultAvatar(post.author_id), is_verified: false, is_trusted: false, trust_score: 50, interests: [] } };
  }
}
router2.get("/promoted", optionalAuth, (req, res) => {
  try {
    try {
      database_default.prepare(`
        UPDATE posts SET is_promoted = 0, promotion_status = 'expired', updated_at = datetime('now')
        WHERE is_promoted = 1 AND promotion_expires_at IS NOT NULL AND promotion_expires_at < datetime('now')
      `).run();
    } catch {
    }
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const userId = req.user?.userId || null;
    let userLocation = "";
    let userInterests = [];
    let userAge = 0;
    if (userId) {
      try {
        const userInfo = database_default.prepare("SELECT location, interests, date_of_birth FROM users WHERE id = ?").get(userId);
        if (userInfo) {
          userLocation = userInfo.location || "";
          try {
            userInterests = JSON.parse(userInfo.interests || "[]");
          } catch {
            userInterests = [];
          }
          if (userInfo.date_of_birth) {
            const birthDate = new Date(userInfo.date_of_birth);
            const today = /* @__PURE__ */ new Date();
            userAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || monthDiff === 0 && today.getDate() < birthDate.getDate()) {
              userAge--;
            }
          }
        }
      } catch {
      }
    }
    const allPromoted = database_default.prepare(`
      SELECT * FROM posts
      WHERE status = 'active' AND is_promoted = 1 AND promotion_status = 'approved'
        AND (promotion_expires_at IS NULL OR promotion_expires_at >= datetime('now'))
      ORDER BY promotion_tier = 'vip' DESC, promotion_tier = 'premium' DESC,
               promotion_tier = 'standard' DESC, promotion_tier = 'basic' DESC,
               reach_count DESC, created_at DESC
      LIMIT ?
    `).all(limit * 3);
    const matchedPosts = [];
    const allTargetingPosts = [];
    for (const row of allPromoted) {
      const parsed = parsePost(row);
      if (!parsed) continue;
      const targeting = parsed.targeting || "all";
      let isMatch = true;
      let matchScore = 0;
      if (targeting === "city" && parsed.target_city) {
        let targetCities = [];
        try {
          const parsedCities = JSON.parse(parsed.target_city);
          if (Array.isArray(parsedCities)) targetCities = parsedCities;
        } catch {
          if (parsed.target_city) targetCities = [parsed.target_city];
        }
        if (targetCities.length > 0) {
          if (userId && userLocation) {
            const cityMatch = targetCities.some(
              (tc) => userLocation.includes(tc) || tc.includes(userLocation)
            );
            if (cityMatch) {
              isMatch = true;
              matchScore += 10;
            } else {
              isMatch = false;
            }
          }
        }
      }
      if (targeting === "interests" && parsed.target_interests && parsed.target_interests.length > 0) {
        if (userId && userInterests.length > 0) {
          const hasExactMatch = parsed.target_interests.some(
            (interest) => userInterests.some(
              (ui) => ui === interest || // Exact match
              ui.toLowerCase() === interest.toLowerCase() || // Case-insensitive
              ui.includes(interest) || interest.includes(ui) || // Substring
              ui === "\u0647\u0648\u0627\u062A\u0641" && interest === "phones" || // Arabic-English mapping
              ui === "phones" && interest === "\u0647\u0648\u0627\u062A\u0641" || ui === "\u0633\u064A\u0627\u0631\u0627\u062A" && interest === "cars" || ui === "cars" && interest === "\u0633\u064A\u0627\u0631\u0627\u062A" || ui === "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A" && interest === "electronics" || ui === "electronics" && interest === "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A" || ui === "\u0639\u0642\u0627\u0631\u0627\u062A" && interest === "realEstate" || ui === "realEstate" && interest === "\u0639\u0642\u0627\u0631\u0627\u062A" || ui === "\u0623\u0632\u064A\u0627\u0621" && interest === "fashion" || ui === "fashion" && interest === "\u0623\u0632\u064A\u0627\u0621" || ui === "\u0623\u0644\u0639\u0627\u0628" && interest === "games" || ui === "games" && interest === "\u0623\u0644\u0639\u0627\u0628" || ui === "\u0631\u064A\u0627\u0636\u0629" && interest === "sports" || ui === "sports" && interest === "\u0631\u064A\u0627\u0636\u0629" || ui === "\u0643\u062A\u0628" && interest === "books" || ui === "books" && interest === "\u0643\u062A\u0628" || ui === "\u0648\u0638\u0627\u0626\u0641" && interest === "jobs" || ui === "jobs" && interest === "\u0648\u0638\u0627\u0626\u0641" || ui === "\u062E\u062F\u0645\u0627\u062A" && interest === "services" || ui === "services" && interest === "\u062E\u062F\u0645\u0627\u062A" || ui === "\u062D\u064A\u0648\u0627\u0646\u0627\u062A" && interest === "animals" || ui === "animals" && interest === "\u062D\u064A\u0648\u0627\u0646\u0627\u062A"
            )
          );
          const categoryMatch = parsed.category && userInterests.includes(parsed.category);
          if (hasExactMatch || categoryMatch) {
            isMatch = true;
            matchScore += 20;
          } else {
            isMatch = false;
          }
        }
      }
      if (parsed.target_age_min && parsed.target_age_max && parsed.target_age_min > 0 && parsed.target_age_max > 0) {
        if (userId && userAge > 0) {
          if (userAge >= parsed.target_age_min && userAge <= parsed.target_age_max) {
            isMatch = true;
            matchScore += 5;
          } else {
            isMatch = false;
          }
        }
      }
      if (targeting === "all") {
        isMatch = true;
        matchScore += 30;
      }
      const postWithAuthor = attachAuthor(parsed);
      const enrichedPost = { ...postWithAuthor, _matchScore: matchScore, _isTargetMatch: isMatch };
      if (isMatch) {
        matchedPosts.push(enrichedPost);
      } else {
        allTargetingPosts.push(enrichedPost);
      }
    }
    matchedPosts.sort((a, b) => {
      if (b._matchScore !== a._matchScore) return b._matchScore - a._matchScore;
      return new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime();
    });
    const remaining = limit - matchedPosts.length;
    if (remaining > 0 && allTargetingPosts.length > 0) {
      allTargetingPosts.sort(
        (a, b) => new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime()
      );
      matchedPosts.push(...allTargetingPosts.slice(0, remaining));
    }
    const finalPosts = matchedPosts.slice(0, limit).map((p) => {
      const { _matchScore, _isTargetMatch, ...rest } = p;
      return rest;
    });
    res.json({ posts: finalPosts });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0631\u0648\u062C\u0629", details: err.message });
  }
});
router2.get("/", optionalAuth, (req, res) => {
  try {
    try {
      database_default.prepare(`
        UPDATE posts SET is_promoted = 0, promotion_status = 'expired', updated_at = datetime('now')
        WHERE is_promoted = 1 AND promotion_expires_at IS NOT NULL AND promotion_expires_at < datetime('now')
      `).run();
    } catch {
    }
    const { type, location, category, min_price, max_price, sort, page = "1", limit = "20" } = req.query;
    const userId = req.user?.userId || null;
    let userLocation = "";
    let userInterests = [];
    let userAge = 0;
    if (userId) {
      try {
        const userInfo = database_default.prepare("SELECT location, interests, date_of_birth FROM users WHERE id = ?").get(userId);
        if (userInfo) {
          userLocation = userInfo.location || "";
          try {
            userInterests = JSON.parse(userInfo.interests || "[]");
          } catch {
            userInterests = [];
          }
          if (userInfo.date_of_birth) {
            const birthDate = new Date(userInfo.date_of_birth);
            const today = /* @__PURE__ */ new Date();
            userAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || monthDiff === 0 && today.getDate() < birthDate.getDate()) {
              userAge--;
            }
          }
        }
      } catch {
      }
    }
    let query = "SELECT * FROM posts WHERE status = ?";
    const params = ["active"];
    if (type) {
      query += " AND type = ?";
      params.push(type);
    }
    if (location) {
      query += " AND location = ?";
      params.push(location);
    }
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    if (min_price) {
      query += " AND price >= ?";
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      query += " AND price <= ?";
      params.push(parseFloat(max_price));
    }
    query += " ORDER BY is_promoted DESC, created_at DESC";
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);
    const rawPosts = database_default.prepare(query).all(...params);
    const filteredPosts = rawPosts.map((row) => {
      try {
        const parsed = parsePost(row);
        if (!parsed) return null;
        let targetMatchScore = 0;
        const isOwnPost = userId && parsed.author_id === userId;
        if (parsed.is_promoted && parsed.promotion_tier) {
          const targeting = parsed.targeting || "all";
          targetMatchScore = 1;
          if (targeting === "all") {
            targetMatchScore = 30;
          } else {
            let matched = false;
            if (targeting === "city" && parsed.target_city) {
              let targetCities = [];
              try {
                const parsedCities = JSON.parse(parsed.target_city);
                if (Array.isArray(parsedCities)) targetCities = parsedCities;
              } catch {
                if (parsed.target_city) targetCities = [parsed.target_city];
              }
              if (userId && userLocation && targetCities.length > 0) {
                const cityMatch = targetCities.some(
                  (tc) => userLocation.includes(tc) || tc.includes(userLocation)
                );
                if (cityMatch) {
                  matched = true;
                  targetMatchScore += 10;
                }
              } else {
                matched = true;
                targetMatchScore += 5;
              }
            }
            if (targeting === "interests" && parsed.target_interests && parsed.target_interests.length > 0) {
              if (userId && userInterests.length > 0) {
                const hasMatch = parsed.target_interests.some(
                  (interest) => userInterests.some(
                    (ui) => ui === interest || ui.toLowerCase() === interest.toLowerCase() || ui.includes(interest) || interest.includes(ui) || ui === "\u0647\u0648\u0627\u062A\u0641" && interest === "phones" || ui === "phones" && interest === "\u0647\u0648\u0627\u062A\u0641" || ui === "\u0633\u064A\u0627\u0631\u0627\u062A" && interest === "cars" || ui === "cars" && interest === "\u0633\u064A\u0627\u0631\u0627\u062A" || ui === "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A" && interest === "electronics" || ui === "electronics" && interest === "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A" || ui === "\u0639\u0642\u0627\u0631\u0627\u062A" && interest === "realEstate" || ui === "realEstate" && interest === "\u0639\u0642\u0627\u0631\u0627\u062A" || ui === "\u0623\u0632\u064A\u0627\u0621" && interest === "fashion" || ui === "fashion" && interest === "\u0623\u0632\u064A\u0627\u0621" || ui === "\u0623\u0644\u0639\u0627\u0628" && interest === "games" || ui === "games" && interest === "\u0623\u0644\u0639\u0627\u0628" || ui === "\u0631\u064A\u0627\u0636\u0629" && interest === "sports" || ui === "sports" && interest === "\u0631\u064A\u0627\u0636\u0629" || ui === "\u0643\u062A\u0628" && interest === "books" || ui === "books" && interest === "\u0643\u062A\u0628" || ui === "\u0648\u0638\u0627\u0626\u0641" && interest === "jobs" || ui === "jobs" && interest === "\u0648\u0638\u0627\u0626\u0641" || ui === "\u062E\u062F\u0645\u0627\u062A" && interest === "services" || ui === "services" && interest === "\u062E\u062F\u0645\u0627\u062A" || ui === "\u062D\u064A\u0648\u0627\u0646\u0627\u062A" && interest === "animals" || ui === "animals" && interest === "\u062D\u064A\u0648\u0627\u0646\u0627\u062A"
                  )
                );
                const categoryMatch = parsed.category && userInterests.includes(parsed.category);
                if (hasMatch || categoryMatch) {
                  matched = true;
                  targetMatchScore += 20;
                }
              } else {
                matched = true;
                targetMatchScore += 5;
              }
            }
            if (parsed.target_age_min && parsed.target_age_max && parsed.target_age_min > 0 && parsed.target_age_max > 0) {
              if (userId && userAge > 0) {
                if (userAge >= parsed.target_age_min && userAge <= parsed.target_age_max) {
                  matched = true;
                  targetMatchScore += 5;
                }
              } else {
                matched = true;
                targetMatchScore += 2;
              }
            }
            if (!matched && targeting !== "all") {
              targetMatchScore = -1;
            }
          }
          if (isOwnPost) {
            targetMatchScore = 50;
          }
        }
        const postWithAuthor = attachAuthor(parsed);
        return { ...postWithAuthor, _targetMatchScore: targetMatchScore, _isOwnPost: isOwnPost };
      } catch {
        return null;
      }
    }).filter(Boolean);
    filteredPosts.sort((a, b) => {
      const scoreA = a._targetMatchScore || 0;
      const scoreB = b._targetMatchScore || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.created_at || b.timestamp || 0).getTime() - new Date(a.created_at || a.timestamp || 0).getTime();
    });
    const finalFilteredPosts = filteredPosts.map((p) => {
      const { _targetMatchScore, _isOwnPost, ...rest } = p;
      return rest;
    });
    const total = database_default.prepare("SELECT COUNT(*) as count FROM posts WHERE status = ?").get("active");
    res.json({ posts: finalFilteredPosts, total: total.count, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A", details: err.message });
  }
});
router2.get("/:id", optionalAuth, (req, res) => {
  try {
    const post = database_default.prepare("SELECT * FROM posts WHERE id = ? AND status = ?").get(req.params.id, "active");
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const parsed = parsePost(post);
    const result = attachAuthor(parsed);
    if (post.is_promoted) {
      const userId = req.user?.userId || null;
      const visitorIp = req.ip || req.socket.remoteAddress || "";
      const isAuthor = userId && userId === post.author_id;
      const isAdmin = userId && (() => {
        try {
          const u = database_default.prepare("SELECT is_admin FROM users WHERE id = ?").get(userId);
          return !!u?.is_admin;
        } catch {
          return false;
        }
      })();
      try {
        if (!isAuthor && !isAdmin) {
          if (userId) {
            const existingView = database_default.prepare("SELECT id FROM post_views WHERE post_id = ? AND user_id = ?").get(req.params.id, userId);
            if (!existingView) {
              database_default.prepare("INSERT OR IGNORE INTO post_views (post_id, user_id, visitor_ip) VALUES (?, ?, ?)").run(req.params.id, userId, visitorIp);
              database_default.prepare("UPDATE posts SET reach_count = COALESCE(reach_count, 0) + 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
            }
          } else {
            const existingAnonView = database_default.prepare("SELECT id FROM post_views WHERE post_id = ? AND user_id IS NULL AND visitor_ip = ?").get(req.params.id, visitorIp);
            if (!existingAnonView) {
              database_default.prepare("INSERT OR IGNORE INTO post_views (post_id, user_id, visitor_ip) VALUES (?, NULL, ?)").run(req.params.id, visitorIp);
              database_default.prepare("UPDATE posts SET reach_count = COALESCE(reach_count, 0) + 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
            }
          }
        }
      } catch {
      }
    }
    const comments = database_default.prepare("SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json({ ...result, commentsList: comments });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0645\u0646\u0634\u0648\u0631", details: err.message });
  }
});
router2.post("/", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { content, image, type, price, currency, location, payment_methods, category, feeling, activity, sender_phone } = req.body;
    if (!content) {
      res.status(400).json({ error: "\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    let finalSenderPhone = sender_phone || "";
    if (!finalSenderPhone && (category === "support_ticket" || category && category.startsWith("complaint_"))) {
      try {
        const user = database_default.prepare("SELECT phone FROM users WHERE id = ?").get(payload.userId);
        if (user && user.phone) finalSenderPhone = user.phone;
      } catch {
      }
    }
    database_default.prepare(`
      INSERT INTO posts (author_id, content, image, type, price, currency, location, payment_methods, category, feeling, activity, sender_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.userId,
      content,
      image || "",
      type || "ad",
      price || null,
      currency || "\u062C.\u0645",
      location || "",
      JSON.stringify(payment_methods || []),
      category || "",
      feeling || "",
      activity || "",
      finalSenderPhone
    );
    const post = database_default.prepare("SELECT * FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 1").get(payload.userId);
    const postWithAuthor = attachAuthor(parsePost(post));
    try {
      const wsManager2 = req.app.locals.wsManager;
      if (wsManager2) {
        wsManager2.broadcast({ type: "post:created", data: postWithAuthor }, { excludeUserId: payload.userId });
      }
    } catch (wsErr) {
      console.error("[WS] Failed to emit post created:", wsErr.message);
    }
    res.status(201).json(postWithAuthor);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0646\u0634\u0648\u0631", details: err.message });
  }
});
router2.put("/:id", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const post = database_default.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (post.author_id !== payload.userId && !payload.isAdmin) {
      res.status(403).json({ error: "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u062A\u0639\u062F\u064A\u0644 \u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u0634\u0648\u0631" });
      return;
    }
    const allowed = ["content", "image", "type", "price", "currency", "location", "payment_methods", "category", "feeling", "activity", "status"];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (req.body[key] !== void 0) {
        updates.push(`${key} = ?`);
        values.push(typeof req.body[key] === "object" ? JSON.stringify(req.body[key]) : req.body[key]);
      }
    }
    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(req.params.id);
      database_default.prepare(`UPDATE posts SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }
    const updated = database_default.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
    res.json(attachAuthor(parsePost(updated)));
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0645\u0646\u0634\u0648\u0631", details: err.message });
  }
});
router2.delete("/:id", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const post = database_default.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (post.author_id !== payload.userId && !payload.isAdmin) {
      res.status(403).json({ error: "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u062D\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u0634\u0648\u0631" });
      return;
    }
    database_default.prepare("UPDATE posts SET status = 'deleted', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    try {
      const wsManager2 = req.app.locals.wsManager;
      if (wsManager2) {
        wsManager2.broadcast({ type: "post:deleted", data: { postId: req.params.id } }, { excludeUserId: payload.userId });
      }
    } catch (wsErr) {
      console.error("[WS] Failed to emit post deleted:", wsErr.message);
    }
    res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0628\u0646\u062C\u0627\u062D" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0645\u0646\u0634\u0648\u0631", details: err.message });
  }
});
router2.post("/:id/like", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const existing = database_default.prepare("SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?").get(payload.userId, req.params.id);
    let liked;
    if (existing) {
      database_default.prepare("DELETE FROM post_likes WHERE user_id = ? AND post_id = ?").run(payload.userId, req.params.id);
      database_default.prepare("UPDATE posts SET likes = MAX(likes - 1, 0), updated_at = datetime('now') WHERE id = ?").run(req.params.id);
      liked = false;
    } else {
      database_default.prepare("INSERT OR IGNORE INTO post_likes (user_id, post_id) VALUES (?, ?)").run(payload.userId, req.params.id);
      database_default.prepare("UPDATE posts SET likes = likes + 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
      liked = true;
      const post2 = database_default.prepare("SELECT likes, author_id FROM posts WHERE id = ?").get(req.params.id);
      if (post2 && post2.author_id !== payload.userId) {
        const user = database_default.prepare("SELECT name FROM users WHERE id = ?").get(payload.userId);
        if (user) {
          database_default.prepare("INSERT INTO notifications (user_id, type, message, post_id, user_id_ref) VALUES (?, ?, ?, ?, ?)").run(post2.author_id, "like", `\u0623\u0639\u062C\u0628 ${user.name} \u0628\u0645\u0646\u0634\u0648\u0631\u0643`, req.params.id, payload.userId);
        }
        try {
          const wsManager2 = req.app.locals.wsManager;
          if (wsManager2) {
            wsManager2.emitNotification(post2.author_id, {
              type: "like",
              message: `\u0623\u0639\u062C\u0628 ${user?.name || "\u0645\u0633\u062A\u062E\u062F\u0645"} \u0628\u0645\u0646\u0634\u0648\u0631\u0643`,
              postId: req.params.id,
              userId: payload.userId,
              link: `/post/${req.params.id}`,
              time: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        } catch (wsErr) {
          console.error("[WS] Failed to emit like notification:", wsErr.message);
        }
      }
    }
    const post = database_default.prepare("SELECT likes FROM posts WHERE id = ?").get(req.params.id);
    res.json({ likes: post?.likes || 0, liked });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0627\u0644\u0625\u0639\u062C\u0627\u0628", details: err.message });
  }
});
router2.post("/:id/comment", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { content, parentId, imageUrl } = req.body;
    if (!content && !imageUrl) {
      res.status(400).json({ error: "\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u062A\u0639\u0644\u064A\u0642 \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    const user = database_default.prepare("SELECT name, avatar FROM users WHERE id = ?").get(payload.userId);
    const parent_id = parentId || "";
    const image_url = imageUrl || "";
    const comment_content = content || "";
    database_default.prepare("INSERT INTO post_comments (post_id, author_id, author_name, author_avatar, content, parent_id, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)").run(req.params.id, payload.userId, user.name, user.avatar, comment_content, parent_id, image_url);
    database_default.prepare("UPDATE posts SET comments = comments + 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const post = database_default.prepare("SELECT author_id FROM posts WHERE id = ?").get(req.params.id);
    if (post && post.author_id !== payload.userId) {
      database_default.prepare("INSERT INTO notifications (user_id, type, message, post_id, user_id_ref) VALUES (?, ?, ?, ?, ?)").run(post.author_id, "comment", `\u0639\u0644\u0642 ${user.name} \u0639\u0644\u0649 \u0645\u0646\u0634\u0648\u0631\u0643`, req.params.id, payload.userId);
    }
    if (parent_id) {
      const parentComment = database_default.prepare("SELECT author_id FROM post_comments WHERE id = ?").get(parent_id);
      if (parentComment && parentComment.author_id !== payload.userId) {
        database_default.prepare("INSERT INTO notifications (user_id, type, message, post_id, user_id_ref) VALUES (?, ?, ?, ?, ?)").run(parentComment.author_id, "comment", `\u0631\u062F ${user.name} \u0639\u0644\u0649 \u062A\u0639\u0644\u064A\u0642\u0643`, req.params.id, payload.userId);
      }
    }
    const comment = database_default.prepare("SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at DESC LIMIT 1").get(req.params.id);
    try {
      const wsManager2 = req.app.locals.wsManager;
      if (wsManager2) {
        if (post && post.author_id !== payload.userId) {
          wsManager2.emitNotification(post.author_id, {
            type: "comment",
            message: `\u0639\u0644\u0642 ${user.name} \u0639\u0644\u0649 \u0645\u0646\u0634\u0648\u0631\u0643`,
            postId: req.params.id,
            userId: payload.userId,
            link: `/post/${req.params.id}`,
            time: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        if (parent_id) {
          const parentComment = database_default.prepare("SELECT author_id FROM post_comments WHERE id = ?").get(parent_id);
          if (parentComment && parentComment.author_id !== payload.userId) {
            wsManager2.emitNotification(parentComment.author_id, {
              type: "comment",
              message: `\u0631\u062F ${user.name} \u0639\u0644\u0649 \u062A\u0639\u0644\u064A\u0642\u0643`,
              postId: req.params.id,
              userId: payload.userId,
              link: `/post/${req.params.id}`,
              time: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        }
        wsManager2.broadcast({ type: "post:commented", data: { postId: req.params.id, comment } }, { excludeUserId: payload.userId });
      }
    } catch (wsErr) {
      console.error("[WS] Failed to emit comment notification:", wsErr.message);
    }
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0642", details: err.message });
  }
});
router2.post("/:id/comment/:commentId/like", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { commentId } = req.params;
    const existing = database_default.prepare("SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?").get(commentId, payload.userId);
    if (existing) {
      database_default.prepare("DELETE FROM comment_likes WHERE id = ?").run(existing.id);
      database_default.prepare("UPDATE post_comments SET likes = MAX(0, likes - 1) WHERE id = ?").run(commentId);
      const updated = database_default.prepare("SELECT likes FROM post_comments WHERE id = ?").get(commentId);
      res.json({ liked: false, likes: updated?.likes || 0 });
    } else {
      database_default.prepare("INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)").run(commentId, payload.userId);
      database_default.prepare("UPDATE post_comments SET likes = likes + 1 WHERE id = ?").run(commentId);
      const comment = database_default.prepare("SELECT author_id FROM post_comments WHERE id = ?").get(commentId);
      if (comment && comment.author_id !== payload.userId) {
        const user = database_default.prepare("SELECT name FROM users WHERE id = ?").get(payload.userId);
        if (user) {
          database_default.prepare("INSERT INTO notifications (user_id, type, message, post_id, user_id_ref) VALUES (?, ?, ?, ?, ?)").run(comment.author_id, "like", `\u0623\u0639\u062C\u0628 ${user.name} \u0628\u062A\u0639\u0644\u064A\u0642\u0643`, req.params.id, payload.userId);
        }
        try {
          const wsManager2 = req.app.locals.wsManager;
          if (wsManager2) {
            wsManager2.emitNotification(comment.author_id, {
              type: "like",
              message: `\u0623\u0639\u062C\u0628 ${user?.name || "\u0645\u0633\u062A\u062E\u062F\u0645"} \u0628\u062A\u0639\u0644\u064A\u0642\u0643`,
              postId: req.params.id,
              userId: payload.userId,
              link: `/post/${req.params.id}`,
              time: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        } catch (wsErr) {
          console.error("[WS] Failed to emit comment like notification:", wsErr.message);
        }
      }
      const updated = database_default.prepare("SELECT likes FROM post_comments WHERE id = ?").get(commentId);
      res.json({ liked: true, likes: updated?.likes || 1 });
    }
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0627\u0644\u0625\u0639\u062C\u0627\u0628 \u0628\u0627\u0644\u062A\u0639\u0644\u064A\u0642", details: err.message });
  }
});
router2.delete("/:id/comment/:commentId", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { commentId } = req.params;
    const comment = database_default.prepare("SELECT * FROM post_comments WHERE id = ?").get(commentId);
    if (!comment) {
      res.status(404).json({ error: "\u0627\u0644\u062A\u0639\u0644\u064A\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (comment.author_id !== payload.userId && !payload.isAdmin) {
      res.status(403).json({ error: "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u062D\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u062A\u0639\u0644\u064A\u0642" });
      return;
    }
    const replyCount = database_default.prepare("SELECT COUNT(*) as count FROM post_comments WHERE parent_id = ?").get(commentId).count;
    database_default.prepare("DELETE FROM comment_likes WHERE comment_id = ?").run(commentId);
    if (replyCount > 0) {
      const replies = database_default.prepare("SELECT id FROM post_comments WHERE parent_id = ?").all(commentId);
      for (const reply of replies) {
        database_default.prepare("DELETE FROM comment_likes WHERE comment_id = ?").run(reply.id);
      }
      database_default.prepare("DELETE FROM post_comments WHERE parent_id = ?").run(commentId);
    }
    database_default.prepare("DELETE FROM post_comments WHERE id = ?").run(commentId);
    const totalDeleted = 1 + replyCount;
    database_default.prepare(`UPDATE posts SET comments = MAX(0, comments - ?), updated_at = datetime('now') WHERE id = ?`).run(totalDeleted, req.params.id);
    try {
      const wsManager2 = req.app.locals.wsManager;
      if (wsManager2) {
        wsManager2.broadcast({ type: "post:comment_deleted", data: { postId: req.params.id, commentId } }, { excludeUserId: payload.userId });
      }
    } catch (wsErr) {
      console.error("[WS] Failed to emit comment deleted:", wsErr.message);
    }
    res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062A\u0639\u0644\u064A\u0642 \u0628\u0646\u062C\u0627\u062D" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u062A\u0639\u0644\u064A\u0642", details: err.message });
  }
});
router2.get("/:id/comments", optionalAuth, (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const allComments = database_default.prepare("SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC").all(req.params.id);
    const commentIds = allComments.map((c) => c.id);
    let userLikes = /* @__PURE__ */ new Set();
    if (userId && commentIds.length > 0) {
      const placeholders = commentIds.map(() => "?").join(",");
      const likes = database_default.prepare(`SELECT comment_id FROM comment_likes WHERE user_id = ? AND comment_id IN (${placeholders})`).all(userId, ...commentIds);
      userLikes = new Set(likes.map((l) => l.comment_id));
    }
    const commentMap = /* @__PURE__ */ new Map();
    const topLevel = [];
    for (const c of allComments) {
      commentMap.set(c.id, {
        ...c,
        isLiked: userLikes.has(c.id),
        replies: []
      });
    }
    for (const c of allComments) {
      const node = commentMap.get(c.id);
      if (c.parent_id && commentMap.has(c.parent_id)) {
        commentMap.get(c.parent_id).replies.push(node);
      } else {
        topLevel.push(node);
      }
    }
    res.json(topLevel);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A", details: err.message });
  }
});
router2.post("/:id/click", authMiddleware, (req, res) => {
  try {
    const post = database_default.prepare("SELECT is_promoted, click_count FROM posts WHERE id = ? AND status = ?").get(req.params.id, "active");
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (post.is_promoted) {
      database_default.prepare("UPDATE posts SET click_count = COALESCE(click_count, 0) + 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    }
    const updated = database_default.prepare("SELECT click_count FROM posts WHERE id = ?").get(req.params.id);
    res.json({ clicks: updated?.click_count || 0 });
  } catch (err) {
    res.json({ clicks: 0 });
  }
});
router2.post("/track-impressions", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const userId = payload.userId;
    const { postIds } = req.body;
    if (!Array.isArray(postIds) || postIds.length === 0) {
      res.json({ tracked: 0 });
      return;
    }
    const placeholders = postIds.map(() => "?").join(",");
    const promotedIds = database_default.prepare(
      `SELECT id, author_id FROM posts WHERE id IN (${placeholders}) AND is_promoted = 1 AND status = 'active'`
    ).all(...postIds);
    let isUserAdmin = false;
    try {
      const u = database_default.prepare("SELECT is_admin FROM users WHERE id = ?").get(userId);
      isUserAdmin = !!u?.is_admin;
    } catch {
    }
    let trackedCount = 0;
    for (const p of promotedIds) {
      try {
        if (p.author_id === userId || isUserAdmin) continue;
        const existingView = database_default.prepare("SELECT id FROM post_views WHERE post_id = ? AND user_id = ?").get(p.id, userId);
        if (!existingView) {
          database_default.prepare("INSERT OR IGNORE INTO post_views (post_id, user_id) VALUES (?, ?)").run(p.id, userId);
          database_default.prepare("UPDATE posts SET reach_count = COALESCE(reach_count, 0) + 1, updated_at = datetime('now') WHERE id = ? AND is_promoted = 1").run(p.id);
          trackedCount++;
        }
      } catch {
      }
    }
    res.json({ tracked: trackedCount });
  } catch (err) {
    res.json({ tracked: 0 });
  }
});
var posts_default = router2;

// src/routes/chat.ts
import { Router as Router3 } from "express";
import crypto4 from "crypto";
import multer from "multer";
import path2 from "path";
import fs2 from "fs";
init_auth();
var router3 = Router3();
var chatImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path2.resolve("uploads/chat");
    if (!fs2.existsSync(uploadDir)) fs2.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path2.extname(file.originalname);
    cb(null, `${crypto4.randomBytes(16).toString("hex")}${ext}`);
  }
});
var chatImageUpload = multer({
  storage: chatImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedExt = /jpeg|jpg|png|gif|webp|bmp|svg|tiff|tif|avif|heic|heif|ico|jfif|pjpeg|pjp/;
    const allowedMime = /^image\//;
    const ext = allowedExt.test(path2.extname(file.originalname).toLowerCase());
    const mime = allowedMime.test(file.mimetype);
    cb(null, ext || mime);
  }
});
router3.get("/contacts", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const userId = payload.userId;
    const contacts = database_default.prepare(`
      SELECT DISTINCT
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as contact_id,
        u.name, u.avatar, u.is_verified
      FROM chat_messages cm
      JOIN users u ON u.id = CASE WHEN cm.sender_id = ? THEN cm.receiver_id ELSE cm.sender_id END
      WHERE sender_id = ? OR receiver_id = ?
      ORDER BY cm.created_at DESC
    `).all(userId, userId, userId, userId);
    const enriched = contacts.map((c) => {
      const lastMsg = database_default.prepare(`
        SELECT text, message_type, created_at FROM chat_messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at DESC LIMIT 1
      `).get(userId, c.contact_id, c.contact_id, userId);
      const unread = database_default.prepare(`
        SELECT COUNT(*) as count FROM chat_messages
        WHERE sender_id = ? AND receiver_id = ? AND read = 0
      `).get(c.contact_id, userId);
      let lastMessageText = lastMsg?.text || "";
      if (lastMsg?.message_type === "image") {
        lastMessageText = "\u{1F4F7} \u0635\u0648\u0631\u0629";
      }
      return {
        id: c.contact_id,
        name: c.name,
        avatar: c.avatar,
        isVerified: !!c.is_verified,
        lastMessage: lastMessageText,
        lastTime: lastMsg?.created_at || "",
        unread: unread?.count || 0,
        online: req.app.locals.wsManager?.isUserOnline(c.contact_id) || false
      };
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u062C\u0647\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644", details: err.message });
  }
});
router3.get("/messages/:contactId", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { contactId } = req.params;
    const { limit = "50", before } = req.query;
    let query = `
      SELECT * FROM chat_messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `;
    const params = [payload.userId, contactId, contactId, payload.userId];
    if (before) {
      query += " AND created_at < ?";
      params.push(before);
    }
    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(parseInt(limit));
    const messages = database_default.prepare(query).all(...params).reverse();
    const filteredMessages = messages.filter((m) => {
      if (!m.deleted_for) return true;
      const deletedForUsers = m.deleted_for.split(",").map((id) => id.trim()).filter(Boolean);
      return !deletedForUsers.includes(payload.userId);
    });
    database_default.prepare("UPDATE chat_messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0").run(contactId, payload.userId);
    res.json(filteredMessages);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0631\u0633\u0627\u0626\u0644", details: err.message });
  }
});
router3.post("/send", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { receiverId, text, postId, messageType, imageUrl, replyToId } = req.body;
    const msgType = messageType || "text";
    if (!receiverId) {
      res.status(400).json({ error: "\u0627\u0644\u0645\u0633\u062A\u0644\u0645 \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    if (msgType === "text" && !text) {
      res.status(400).json({ error: "\u0627\u0644\u0646\u0635 \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    if (msgType === "image" && !imageUrl) {
      res.status(400).json({ error: "\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0648\u0631\u0629 \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    const messageId = crypto4.randomBytes(16).toString("hex").toLowerCase();
    database_default.prepare(`
      INSERT INTO chat_messages (id, sender_id, receiver_id, text, post_id, message_type, image_url, reply_to_id, reactions, deleted_for)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageId,
      payload.userId,
      receiverId,
      text || "",
      postId || null,
      msgType,
      imageUrl || "",
      replyToId || null,
      "{}",
      ""
    );
    const sender = database_default.prepare("SELECT name FROM users WHERE id = ?").get(payload.userId);
    if (sender) {
      const notifText = msgType === "image" ? `\u0631\u0633\u0627\u0644\u0629 \u062C\u062F\u064A\u062F\u0629 \u0645\u0646 ${sender.name}: \u{1F4F7} \u0635\u0648\u0631\u0629` : `\u0631\u0633\u0627\u0644\u0629 \u062C\u062F\u064A\u062F\u0629 \u0645\u0646 ${sender.name}: ${(text || "").slice(0, 50)}${(text || "").length > 50 ? "..." : ""}`;
      database_default.prepare("INSERT INTO notifications (user_id, type, message, user_id_ref, link) VALUES (?, ?, ?, ?, ?)").run(receiverId, "message", notifText, payload.userId, "/messages");
    }
    const message = database_default.prepare("SELECT * FROM chat_messages WHERE id = ?").get(messageId);
    try {
      const wsManager2 = req.app.locals.wsManager;
      if (wsManager2) {
        const senderUser = database_default.prepare("SELECT name, avatar FROM users WHERE id = ?").get(payload.userId);
        wsManager2.emitChatMessage(receiverId, {
          id: messageId,
          senderId: payload.userId,
          receiverId,
          text: text || "",
          messageType: msgType,
          imageUrl: imageUrl || "",
          postId: postId || null,
          replyToId: replyToId || null,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          senderName: senderUser?.name || "",
          senderAvatar: senderUser?.avatar || ""
        });
      }
    } catch (wsErr) {
      console.error("[WS] Failed to emit chat message:", wsErr.message);
    }
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0644\u0629", details: err.message });
  }
});
router3.delete("/messages/:messageId", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { messageId } = req.params;
    const message = database_default.prepare("SELECT * FROM chat_messages WHERE id = ?").get(messageId);
    if (!message) {
      res.status(404).json({ error: "\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    if (message.sender_id !== payload.userId && message.receiver_id !== payload.userId) {
      res.status(403).json({ error: "\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u062D\u0630\u0641 \u0647\u0630\u0647 \u0627\u0644\u0631\u0633\u0627\u0644\u0629" });
      return;
    }
    const deletedFor = message.deleted_for ? message.deleted_for.split(",").map((id) => id.trim()).filter(Boolean) : [];
    if (!deletedFor.includes(payload.userId)) {
      deletedFor.push(payload.userId);
    }
    const newDeletedFor = deletedFor.join(",");
    database_default.prepare("UPDATE chat_messages SET deleted_for = ? WHERE id = ?").run(newDeletedFor, messageId);
    res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0631\u0633\u0627\u0644\u0629" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0631\u0633\u0627\u0644\u0629", details: err.message });
  }
});
router3.post("/messages/:messageId/react", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) {
      res.status(400).json({ error: "\u0627\u0644\u0631\u0645\u0632 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    const message = database_default.prepare("SELECT * FROM chat_messages WHERE id = ?").get(messageId);
    if (!message) {
      res.status(404).json({ error: "\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    if (message.sender_id !== payload.userId && message.receiver_id !== payload.userId) {
      res.status(403).json({ error: "\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u0645\u0639 \u0647\u0630\u0647 \u0627\u0644\u0631\u0633\u0627\u0644\u0629" });
      return;
    }
    let reactions = {};
    try {
      reactions = JSON.parse(message.reactions || "{}");
    } catch {
      reactions = {};
    }
    if (reactions[payload.userId] === emoji) {
      delete reactions[payload.userId];
    } else {
      reactions[payload.userId] = emoji;
    }
    database_default.prepare("UPDATE chat_messages SET reactions = ? WHERE id = ?").run(JSON.stringify(reactions), messageId);
    res.json({ message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062A\u0641\u0627\u0639\u0644", reactions });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062A\u0641\u0627\u0639\u0644", details: err.message });
  }
});
router3.post("/upload-image", authMiddleware, chatImageUpload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u0631\u0641\u0639 \u0623\u064A \u0645\u0644\u0641" });
    return;
  }
  const url = `/uploads/chat/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});
var chat_default = router3;

// src/routes/wallet.ts
import { Router as Router4 } from "express";
init_auth();
var router4 = Router4();
router4.get("/balance", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const user = database_default.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(payload.userId);
    res.json({ balance: user?.wallet_balance || 0 });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0631\u0635\u064A\u062F", details: err.message });
  }
});
router4.get("/transactions", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const transactions = database_default.prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC").all(payload.userId);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A", details: err.message });
  }
});
router4.post("/charge-request", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { amount, method, receiptImage, additionalPhone } = req.body;
    if (!amount || !method) {
      res.status(400).json({ error: "\u0627\u0644\u0645\u0628\u0644\u063A \u0648\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      return;
    }
    if (amount <= 0) {
      res.status(400).json({ error: "\u0627\u0644\u0645\u0628\u0644\u063A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0635\u0641\u0631" });
      return;
    }
    if (!receiptImage || receiptImage.trim() === "") {
      res.status(400).json({ error: "\u0635\u0648\u0631\u0629 \u0627\u0644\u0625\u064A\u0635\u0627\u0644 \u0645\u0637\u0644\u0648\u0628\u0629 - \u064A\u0631\u062C\u0649 \u0631\u0641\u0639 \u0635\u0648\u0631\u0629 \u0625\u064A\u0635\u0627\u0644 \u0627\u0644\u062A\u062D\u0648\u064A\u0644" });
      return;
    }
    const user = database_default.prepare("SELECT name, avatar, phone FROM users WHERE id = ?").get(payload.userId);
    if (!user.phone || user.phone.trim() === "") {
      res.status(400).json({ error: "\u064A\u062C\u0628 \u0625\u0636\u0627\u0641\u0629 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0644\u062D\u0633\u0627\u0628\u0643 \u0623\u0648\u0644\u0627\u064B \u0644\u0634\u062D\u0646 \u0627\u0644\u0645\u062D\u0641\u0638\u0629" });
      return;
    }
    database_default.prepare("INSERT INTO transactions (user_id, type, amount, method, status) VALUES (?, ?, ?, ?, ?)").run(payload.userId, "charge_request", amount, method, "pending");
    const result = database_default.prepare("INSERT INTO charging_requests (user_id, user_name, user_avatar, user_phone, additional_phone, amount, method, receipt_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(payload.userId, user.name, user.avatar, user.phone, additionalPhone || "", amount, method, receiptImage || "");
    database_default.prepare("INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)").run(payload.userId, "payment", `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0634\u062D\u0646 ${Number(amount).toLocaleString()} \u062C.\u0645 \u0648\u0633\u064A\u062A\u0645 \u0645\u0631\u0627\u062C\u0639\u062A\u0647 \u0645\u0646 \u0627\u0644\u0625\u062F\u0627\u0631\u0629`, "/wallet");
    const hasReceipt = receiptImage && receiptImage.trim() !== "";
    const phoneInfo = additionalPhone && additionalPhone.trim() !== "" ? `${user.phone} / \u0631\u0642\u0645 \u0622\u062E\u0631: ${additionalPhone}` : user.phone;
    const adminMessage = hasReceipt ? `\u0637\u0644\u0628 \u0634\u062D\u0646 \u062C\u062F\u064A\u062F \u0645\u0646 ${user.name} (${phoneInfo}) \u0628\u0645\u0628\u0644\u063A ${Number(amount).toLocaleString()} \u062C.\u0645 \u0639\u0628\u0631 ${method} \u0645\u0639 \u0635\u0648\u0631\u0629 \u0625\u064A\u0635\u0627\u0644` : `\u0637\u0644\u0628 \u0634\u062D\u0646 \u062C\u062F\u064A\u062F \u0645\u0646 ${user.name} (${phoneInfo}) \u0628\u0645\u0628\u0644\u063A ${Number(amount).toLocaleString()} \u062C.\u0645 \u0639\u0628\u0631 ${method} \u0628\u062F\u0648\u0646 \u0635\u0648\u0631\u0629 \u0625\u064A\u0635\u0627\u0644`;
    const admins = database_default.prepare("SELECT id FROM users WHERE is_admin = 1").all();
    const insertNotif = database_default.prepare("INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)");
    for (const admin of admins) {
      insertNotif.run(admin.id, "payment", adminMessage, "/admin/charging");
    }
    res.status(201).json({ message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u0634\u062D\u0646 \u0628\u0646\u062C\u0627\u062D", requestId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u0634\u062D\u0646", details: err.message });
  }
});
router4.get("/admin/charging-requests", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const requests = database_default.prepare("SELECT * FROM charging_requests ORDER BY created_at DESC").all();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0634\u062D\u0646", details: err.message });
  }
});
router4.post("/admin/charging-requests/:id/approve", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const cr = database_default.prepare("SELECT * FROM charging_requests WHERE id = ?").get(req.params.id);
    if (!cr) {
      res.status(404).json({ error: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (cr.status !== "pending") {
      res.status(400).json({ error: "\u062A\u0645 \u0645\u0639\u0627\u0644\u062C\u0629 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0628\u0627\u0644\u0641\u0639\u0644" });
      return;
    }
    database_default.prepare("UPDATE charging_requests SET status = 'approved' WHERE id = ?").run(req.params.id);
    const pendingTx = database_default.prepare("SELECT id FROM transactions WHERE user_id = ? AND type = 'charge_request' AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(cr.user_id);
    if (pendingTx) {
      database_default.prepare("UPDATE transactions SET status = 'approved' WHERE id = ?").run(pendingTx.id);
    }
    database_default.prepare("UPDATE users SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?").run(cr.amount, cr.user_id);
    database_default.prepare("INSERT INTO transactions (user_id, type, amount, method, status) VALUES (?, ?, ?, ?, ?)").run(cr.user_id, "deposit", cr.amount, cr.method, "completed");
    database_default.prepare("INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)").run(cr.user_id, "payment", `\u062A\u0645 \u0634\u062D\u0646 ${cr.amount.toLocaleString()} \u062C.\u0645 \u0641\u064A \u0645\u062D\u0641\u0638\u062A\u0643 \u0628\u0646\u062C\u0627\u062D`, "/wallet");
    res.json({ message: "\u062A\u0645 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0637\u0644\u0628 \u0627\u0644\u0634\u062D\u0646" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0637\u0644\u0628", details: err.message });
  }
});
router4.post("/admin/charging-requests/:id/reject", authMiddleware, adminMiddleware, (req, res) => {
  try {
    const cr = database_default.prepare("SELECT * FROM charging_requests WHERE id = ?").get(req.params.id);
    if (!cr) {
      res.status(404).json({ error: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    database_default.prepare("UPDATE charging_requests SET status = 'rejected' WHERE id = ?").run(req.params.id);
    const pendingTx = database_default.prepare("SELECT id FROM transactions WHERE user_id = ? AND type = 'charge_request' AND status = 'pending' ORDER BY created_at DESC LIMIT 1").get(cr.user_id);
    if (pendingTx) {
      database_default.prepare("UPDATE transactions SET status = 'rejected' WHERE id = ?").run(pendingTx.id);
    }
    database_default.prepare("INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)").run(cr.user_id, "payment", `\u062A\u0645 \u0631\u0641\u0636 \u0637\u0644\u0628 \u0634\u062D\u0646 ${cr.amount.toLocaleString()} \u062C.\u0645`, "/wallet");
    res.json({ message: "\u062A\u0645 \u0631\u0641\u0636 \u0637\u0644\u0628 \u0627\u0644\u0634\u062D\u0646" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0631\u0641\u0636 \u0627\u0644\u0637\u0644\u0628", details: err.message });
  }
});
var wallet_default = router4;

// src/routes/admin.ts
import { Router as Router5 } from "express";
import fs3 from "fs";
import path3 from "path";
init_auth();
var dbPath = path3.resolve(process.cwd(), "data", "nawaqes.db");
var router5 = Router5();
router5.use(authMiddleware, adminMiddleware);
router5.get("/stats", (req, res) => {
  try {
    const totalUsers = database_default.prepare("SELECT COUNT(*) as count FROM users WHERE is_deactivated = 0").get();
    const activeAds = database_default.prepare("SELECT COUNT(*) as count FROM posts WHERE type = 'ad' AND status = 'active'").get();
    const totalTransactions = database_default.prepare("SELECT COUNT(*) as count FROM transactions").get();
    const revenue = database_default.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'promotion_debit' AND status = 'completed'").get();
    const pendingCharging = database_default.prepare("SELECT COUNT(*) as count FROM charging_requests WHERE status = 'pending'").get();
    const pendingPromotions = database_default.prepare("SELECT COUNT(*) as count FROM promotion_requests WHERE status = 'pending'").get();
    const pendingMarketPromotions = database_default.prepare("SELECT COUNT(*) as count FROM market_promotion_requests WHERE status = 'pending'").get();
    const newsItems = database_default.prepare("SELECT COUNT(*) as count FROM news_items").get();
    res.json({
      totalUsers: totalUsers.count,
      activeAds: activeAds.count,
      totalTransactions: totalTransactions.count,
      revenue: revenue.total,
      pendingCharging: pendingCharging.count,
      pendingPromotions: pendingPromotions.count,
      pendingMarketPromotions: pendingMarketPromotions.count,
      newsItems: newsItems.count
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A", details: err.message });
  }
});
router5.get("/detailed-stats", (req, res) => {
  try {
    const totalUsers = database_default.prepare("SELECT COUNT(*) as count FROM users").get();
    const activeUsers = database_default.prepare("SELECT COUNT(*) as count FROM users WHERE is_deactivated = 0").get();
    const deactivatedUsers = database_default.prepare("SELECT COUNT(*) as count FROM users WHERE is_deactivated = 1").get();
    const verifiedUsers = database_default.prepare("SELECT COUNT(*) as count FROM users WHERE is_verified = 1").get();
    const adminUsers = database_default.prepare("SELECT COUNT(*) as count FROM users WHERE is_admin = 1").get();
    const activeAds = database_default.prepare("SELECT COUNT(*) as count FROM posts WHERE type = 'ad' AND status = 'active'").get();
    const flaggedPosts = database_default.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'flagged'").get();
    const featuredPosts = database_default.prepare("SELECT COUNT(*) as count FROM posts WHERE is_featured = 1").get();
    const promotedPosts = database_default.prepare("SELECT COUNT(*) as count FROM posts WHERE is_promoted = 1").get();
    const totalRevenue = database_default.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'promotion_debit' AND status = 'completed'").get();
    const pendingCharging = database_default.prepare("SELECT COUNT(*) as count FROM charging_requests WHERE status = 'pending'").get();
    const pendingChargingAmount = database_default.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM charging_requests WHERE status = 'pending'").get();
    const pendingPromotions = database_default.prepare("SELECT COUNT(*) as count FROM promotion_requests WHERE status = 'pending'").get();
    const pendingMarketPromotions = database_default.prepare("SELECT COUNT(*) as count FROM market_promotion_requests WHERE status = 'pending'").get();
    const newsCount2 = database_default.prepare("SELECT COUNT(*) as count FROM news_items").get();
    const alertCount = database_default.prepare("SELECT COUNT(*) as count FROM news_items WHERE is_alert = 1").get();
    const totalWalletBalance = database_default.prepare("SELECT COALESCE(SUM(wallet_balance), 0) as total FROM users").get();
    const dailyNewUsers = database_default.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at) ORDER BY date DESC
    `).all();
    const dailyNewPosts = database_default.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM posts WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at) ORDER BY date DESC
    `).all();
    res.json({
      totalUsers: totalUsers.count,
      activeUsers: activeUsers.count,
      deactivatedUsers: deactivatedUsers.count,
      verifiedUsers: verifiedUsers.count,
      adminUsers: adminUsers.count,
      activeAds: activeAds.count,
      flaggedPosts: flaggedPosts.count,
      featuredPosts: featuredPosts.count,
      promotedPosts: promotedPosts.count,
      totalRevenue: totalRevenue.total,
      pendingCharging: pendingCharging.count,
      pendingChargingAmount: pendingChargingAmount.total,
      pendingPromotions: pendingPromotions.count,
      pendingMarketPromotions: pendingMarketPromotions.count,
      newsItems: newsCount2.count,
      alertItems: alertCount.count,
      totalWalletBalance: totalWalletBalance.total,
      dailyNewUsers,
      dailyNewPosts
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062A\u0641\u0635\u064A\u0644\u064A\u0629", details: err.message });
  }
});
router5.get("/chart", (req, res) => {
  try {
    const chartData = database_default.prepare(`
      SELECT strftime('%w', created_at) as day_num,
        CASE strftime('%w', created_at)
          WHEN '6' THEN '\u0627\u0644\u0633\u0628\u062A' WHEN '0' THEN '\u0627\u0644\u0623\u062D\u062F' WHEN '1' THEN '\u0627\u0644\u0627\u062B\u0646\u064A\u0646'
          WHEN '2' THEN '\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621' WHEN '3' THEN '\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621' WHEN '4' THEN '\u0627\u0644\u062E\u0645\u064A\u0633'
          WHEN '5' THEN '\u0627\u0644\u062C\u0645\u0639\u0629'
        END as name,
        COUNT(*) as ads
      FROM posts WHERE created_at >= datetime('now', '-7 days') AND status = 'active'
      GROUP BY day_num ORDER BY day_num
    `).all();
    res.json(chartData);
  } catch (err) {
    res.json([]);
  }
});
router5.get("/promotion-requests", (req, res) => {
  try {
    const requests = database_default.prepare("SELECT * FROM promotion_requests ORDER BY created_at DESC").all();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062A\u0631\u0648\u064A\u062C", details: err.message });
  }
});
router5.post("/promotion-requests/:id/approve", (req, res) => {
  try {
    const pr = database_default.prepare("SELECT * FROM promotion_requests WHERE id = ?").get(req.params.id);
    if (!pr) {
      res.status(404).json({ error: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    database_default.prepare("UPDATE promotion_requests SET status = 'approved' WHERE id = ?").run(req.params.id);
    const expiresAt = new Date(Date.now() + (pr.duration || 3) * 864e5).toISOString();
    database_default.prepare(`UPDATE posts SET is_promoted = 1, promotion_status = 'approved', promotion_tier = ?,
      promotion_package = ?, promotion_started_at = datetime('now'), promotion_expires_at = ?,
      estimated_reach = ?, updated_at = datetime('now') WHERE id = ?`).run(pr.tier, pr.package_name, expiresAt, pr.estimated_reach, pr.post_id);
    database_default.prepare("INSERT INTO notifications (user_id, type, message, post_id, link) VALUES (?, ?, ?, ?, ?)").run(pr.author_id, "promotion", `\u062A\u0645 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u062A\u0631\u0648\u064A\u062C \u0645\u0646\u0634\u0648\u0631\u0643 - \u0628\u0627\u0642\u0629 ${pr.package_name}`, pr.post_id, `/post/${pr.post_id}`);
    try {
      const maxNotifications = pr.max_notifications || 100;
      let targetUsers = [];
      let targetingQuery = "SELECT id FROM users WHERE id != ? AND is_deactivated = 0";
      const targetParams = [pr.author_id];
      if (pr.targeting === "city" && pr.target_city) {
        let cities = [];
        try {
          const parsed = JSON.parse(pr.target_city);
          if (Array.isArray(parsed)) cities = parsed;
        } catch {
          cities = [pr.target_city];
        }
        if (cities.length > 0) {
          const cityConditions = cities.map(() => "(location LIKE ? OR location LIKE ?)").join(" OR ");
          targetingQuery += ` AND (${cityConditions})`;
          for (const city of cities) {
            targetParams.push(`%${city}%`, `${city}%`);
          }
        }
      }
      if (pr.targeting === "interests" && pr.target_interests) {
        let interests = [];
        try {
          const parsed = JSON.parse(pr.target_interests);
          if (Array.isArray(parsed)) interests = parsed;
        } catch {
          interests = [pr.target_interests];
        }
        if (interests.length > 0) {
          const interestConditions = [];
          for (const interest of interests) {
            interestConditions.push("interests LIKE ?");
            targetParams.push(`%"${interest}"%`);
            const equivalents = {
              "phones": ["\u0647\u0648\u0627\u062A\u0641"],
              "\u0647\u0648\u0627\u062A\u0641": ["phones"],
              "cars": ["\u0633\u064A\u0627\u0631\u0627\u062A"],
              "\u0633\u064A\u0627\u0631\u0627\u062A": ["cars"],
              "electronics": ["\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A"],
              "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A": ["electronics"],
              "realEstate": ["\u0639\u0642\u0627\u0631\u0627\u062A"],
              "\u0639\u0642\u0627\u0631\u0627\u062A": ["realEstate"],
              "fashion": ["\u0623\u0632\u064A\u0627\u0621"],
              "\u0623\u0632\u064A\u0627\u0621": ["fashion"],
              "games": ["\u0623\u0644\u0639\u0627\u0628"],
              "\u0623\u0644\u0639\u0627\u0628": ["games"],
              "sports": ["\u0631\u064A\u0627\u0636\u0629"],
              "\u0631\u064A\u0627\u0636\u0629": ["sports"],
              "books": ["\u0643\u062A\u0628"],
              "\u0643\u062A\u0628": ["books"],
              "jobs": ["\u0648\u0638\u0627\u0626\u0641"],
              "\u0648\u0638\u0627\u0626\u0641": ["jobs"],
              "services": ["\u062E\u062F\u0645\u0627\u062A"],
              "\u062E\u062F\u0645\u0627\u062A": ["services"],
              "animals": ["\u062D\u064A\u0648\u0627\u0646\u0627\u062A"],
              "\u062D\u064A\u0648\u0627\u0646\u0627\u062A": ["animals"]
            };
            if (equivalents[interest]) {
              for (const eq of equivalents[interest]) {
                interestConditions.push("interests LIKE ?");
                targetParams.push(`%"${eq}"%`);
              }
            }
          }
          targetingQuery += ` AND (${interestConditions.join(" OR ")})`;
        }
      }
      if (pr.target_age_min && pr.target_age_max && pr.target_age_min > 0 && pr.target_age_max > 0) {
        const today = /* @__PURE__ */ new Date();
        const maxBirthYear = today.getFullYear() - pr.target_age_min;
        const minBirthYear = today.getFullYear() - pr.target_age_max;
        targetingQuery += " AND date_of_birth IS NOT NULL AND date_of_birth != ''";
        targetingQuery += ` AND strftime('%Y', date_of_birth) <= ? AND strftime('%Y', date_of_birth) >= ?`;
        targetParams.push(String(maxBirthYear), String(minBirthYear));
      }
      targetingQuery += ` ORDER BY RANDOM() LIMIT ?`;
      targetParams.push(String(maxNotifications));
      targetUsers = database_default.prepare(targetingQuery).all(...targetParams);
      const postContent = pr.post_content || "";
      const shortContent = postContent.length > 50 ? postContent.substring(0, 50) + "..." : postContent;
      const insertNotif = database_default.prepare("INSERT INTO notifications (user_id, type, message, post_id, link) VALUES (?, ?, ?, ?, ?)");
      for (const user of targetUsers) {
        insertNotif.run(user.id, "promotion", `\u0625\u0639\u0644\u0627\u0646 \u062C\u062F\u064A\u062F \u0642\u062F \u064A\u0647\u0645\u0643: ${shortContent}`, pr.post_id, `/post/${pr.post_id}`);
      }
      database_default.prepare("UPDATE promotion_requests SET notifications_sent = ? WHERE id = ?").run(targetUsers.length, req.params.id);
    } catch (notifErr) {
      console.error("Error sending targeted notifications:", notifErr.message);
    }
    try {
      const wsManager2 = req.app.locals.wsManager;
      if (wsManager2) {
        wsManager2.emitAdminEvent("promotion-approved", { id: req.params.id, postId: pr?.post_id });
        wsManager2.emitNotification(pr?.author_id, {
          type: "promotion",
          message: `\u062A\u0645 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u062A\u0631\u0648\u064A\u062C \u0645\u0646\u0634\u0648\u0631\u0643 - \u0628\u0627\u0642\u0629 ${pr?.package_name}`,
          postId: pr?.post_id,
          time: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    } catch (wsErr) {
      console.error("[WS] Failed to emit admin event:", wsErr.message);
    }
    res.json({ message: "\u062A\u0645 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0637\u0644\u0628 \u0627\u0644\u062A\u0631\u0648\u064A\u062C" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u062A\u0631\u0648\u064A\u062C", details: err.message });
  }
});
router5.post("/promotion-requests/:id/reject", (req, res) => {
  try {
    const pr = database_default.prepare("SELECT * FROM promotion_requests WHERE id = ?").get(req.params.id);
    if (!pr) {
      res.status(404).json({ error: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    database_default.prepare("UPDATE promotion_requests SET status = 'rejected' WHERE id = ?").run(req.params.id);
    database_default.prepare("UPDATE posts SET promotion_status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(pr.post_id);
    database_default.prepare("UPDATE users SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?").run(pr.price, pr.author_id);
    database_default.prepare("INSERT INTO transactions (user_id, type, amount, method, status) VALUES (?, ?, ?, ?, ?)").run(pr.author_id, "promotion_refund", pr.price, "\u0645\u062D\u0641\u0638\u0629", "completed");
    database_default.prepare("INSERT INTO notifications (user_id, type, message, post_id, link) VALUES (?, ?, ?, ?, ?)").run(pr.author_id, "promotion", `\u062A\u0645 \u0631\u0641\u0636 \u0637\u0644\u0628 \u062A\u0631\u0648\u064A\u062C \u0645\u0646\u0634\u0648\u0631\u0643 \u0648\u062A\u0645 \u0627\u0633\u062A\u0631\u062F\u0627\u062F ${pr.price} \u062C.\u0645`, pr.post_id, `/post/${pr.post_id}`);
    res.json({ message: "\u062A\u0645 \u0631\u0641\u0636 \u0637\u0644\u0628 \u0627\u0644\u062A\u0631\u0648\u064A\u062C" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0631\u0641\u0636 \u0627\u0644\u062A\u0631\u0648\u064A\u062C", details: err.message });
  }
});
router5.get("/users", (req, res) => {
  try {
    const users = database_default.prepare("SELECT id, name, email, avatar, is_verified, is_admin, is_trusted, trust_score, wallet_balance, is_deactivated, phone, location, join_date, show_phone, gender, date_of_birth, interests FROM users ORDER BY created_at DESC").all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646", details: err.message });
  }
});
router5.patch("/users/:id/verify", (req, res) => {
  try {
    const user = database_default.prepare("SELECT is_verified FROM users WHERE id = ?").get(req.params.id);
    if (!user) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const newStatus = user.is_verified ? 0 : 1;
    database_default.prepare("UPDATE users SET is_verified = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, req.params.id);
    res.json({ id: req.params.id, is_verified: !!newStatus, message: newStatus ? "\u062A\u0645 \u062A\u0648\u062B\u064A\u0642 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645" : "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u062A\u0648\u062B\u064A\u0642 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u062A\u0648\u062B\u064A\u0642", details: err.message });
  }
});
router5.patch("/users/:id/toggle-admin", (req, res) => {
  try {
    const user = database_default.prepare("SELECT is_admin FROM users WHERE id = ?").get(req.params.id);
    if (!user) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const newStatus = user.is_admin ? 0 : 1;
    database_default.prepare("UPDATE users SET is_admin = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, req.params.id);
    res.json({ id: req.params.id, is_admin: !!newStatus, message: newStatus ? "\u062A\u0645 \u0645\u0646\u062D \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0645\u062F\u064A\u0631" : "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0645\u062F\u064A\u0631" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0627\u0644\u0645\u062F\u064A\u0631", details: err.message });
  }
});
router5.patch("/users/:id/toggle-active", (req, res) => {
  try {
    const user = database_default.prepare("SELECT is_deactivated FROM users WHERE id = ?").get(req.params.id);
    if (!user) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const newStatus = user.is_deactivated ? 0 : 1;
    database_default.prepare("UPDATE users SET is_deactivated = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, req.params.id);
    res.json({ id: req.params.id, is_deactivated: !!newStatus, message: newStatus ? "\u062A\u0645 \u062A\u0639\u0637\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628" : "\u062A\u0645 \u062A\u0641\u0639\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u062D\u0633\u0627\u0628", details: err.message });
  }
});
router5.post("/users/:id/adjust-wallet", (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (typeof amount !== "number" || amount === 0) {
      res.status(400).json({ error: "\u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062F \u0645\u0628\u0644\u063A \u0635\u062D\u064A\u062D (\u063A\u064A\u0631 \u0635\u0641\u0631\u064A)" });
      return;
    }
    const user = database_default.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(req.params.id);
    if (!user) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const newBalance = (user.wallet_balance || 0) + amount;
    if (newBalance < 0) {
      res.status(400).json({ error: "\u0627\u0644\u0631\u0635\u064A\u062F \u0644\u0627 \u064A\u0645\u0643\u0646 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0633\u0627\u0644\u0628\u0627\u064B" });
      return;
    }
    database_default.prepare("UPDATE users SET wallet_balance = ?, updated_at = datetime('now') WHERE id = ?").run(newBalance, req.params.id);
    const txType = amount > 0 ? "admin_deposit" : "admin_withdrawal";
    database_default.prepare("INSERT INTO transactions (user_id, type, amount, method, status) VALUES (?, ?, ?, ?, ?)").run(req.params.id, txType, Math.abs(amount), reason || "\u062A\u0639\u062F\u064A\u0644 \u064A\u062F\u0648\u064A \u0645\u0646 \u0627\u0644\u0645\u062F\u064A\u0631", "completed");
    const notifyMsg = amount > 0 ? `\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 ${amount} \u062C.\u0645 \u0644\u0645\u062D\u0641\u0638\u062A\u0643${reason ? ` (${reason})` : ""}` : `\u062A\u0645 \u062E\u0635\u0645 ${Math.abs(amount)} \u062C.\u0645 \u0645\u0646 \u0645\u062D\u0641\u0638\u062A\u0643${reason ? ` (${reason})` : ""}`;
    database_default.prepare("INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)").run(req.params.id, "payment", notifyMsg, "/wallet");
    res.json({
      message: amount > 0 ? `\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 ${amount} \u062C.\u0645 \u0644\u0644\u0645\u062D\u0641\u0638\u0629` : `\u062A\u0645 \u062E\u0635\u0645 ${Math.abs(amount)} \u062C.\u0645 \u0645\u0646 \u0627\u0644\u0645\u062D\u0641\u0638\u0629`,
      newBalance
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u062D\u0641\u0638\u0629", details: err.message });
  }
});
router5.delete("/users/:id", (req, res) => {
  try {
    const user = database_default.prepare("SELECT is_admin FROM users WHERE id = ?").get(req.params.id);
    if (!user) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (user.is_admin) {
      res.status(403).json({ error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0645\u062F\u064A\u0631" });
      return;
    }
    database_default.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645", details: err.message });
  }
});
router5.post("/alerts", (req, res) => {
  try {
    const { title, content, source, category } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      return;
    }
    const newsCategory = category || "urgent";
    const result = database_default.prepare("INSERT INTO news_items (title, content, source, is_alert, category) VALUES (?, ?, ?, 1, ?)").run(title, content, source || "\u0625\u062F\u0627\u0631\u0629 \u0646\u0648\u0627\u0642\u0635", newsCategory);
    const alertId = result.lastInsertRowid;
    try {
      const users = database_default.prepare("SELECT id FROM users WHERE is_deactivated = 0").all();
      const insertNotif = database_default.prepare("INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)");
      const insertMany = database_default.transaction((userList) => {
        for (const user of userList) {
          insertNotif.run(user.id, "alert", `\u062A\u0646\u0628\u064A\u0647 \u0625\u062F\u0627\u0631\u064A: ${title}`, "/notifications?filter=alert");
        }
      });
      insertMany(users);
    } catch {
    }
    try {
      const wsManager2 = req.app.locals.wsManager;
      if (wsManager2) {
        wsManager2.emitAdminAlert({
          id: String(alertId),
          title,
          content,
          source: source || "\u0625\u062F\u0627\u0631\u0629 \u0646\u0648\u0627\u0642\u0635",
          isAlert: true,
          category: newsCategory,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    } catch {
    }
    res.status(201).json({ id: alertId, message: "\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062A\u0646\u0628\u064A\u0647" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062A\u0646\u0628\u064A\u0647", details: err.message });
  }
});
router5.delete("/alerts/:id", (req, res) => {
  try {
    database_default.prepare("DELETE FROM news_items WHERE id = ?").run(req.params.id);
    res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062A\u0646\u0628\u064A\u0647" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u062A\u0646\u0628\u064A\u0647", details: err.message });
  }
});
router5.post("/news", (req, res) => {
  try {
    const { title, content, source, category, isAlert } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      return;
    }
    const newsCategory = category || "general";
    const alertFlag = isAlert ? 1 : 0;
    const result = database_default.prepare("INSERT INTO news_items (title, content, source, is_alert, category) VALUES (?, ?, ?, ?, ?)").run(title, content, source || "\u0646\u0648\u0627\u0642\u0635", alertFlag, newsCategory);
    const newsId = result.lastInsertRowid;
    if (alertFlag) {
      try {
        const users = database_default.prepare("SELECT id FROM users WHERE is_deactivated = 0").all();
        const insertNotif = database_default.prepare("INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)");
        const insertMany = database_default.transaction((userList) => {
          for (const user of userList) {
            insertNotif.run(user.id, "alert", `\u062A\u0646\u0628\u064A\u0647 \u0625\u062F\u0627\u0631\u064A: ${title}`, "/notifications?filter=alert");
          }
        });
        insertMany(users);
      } catch {
      }
      try {
        const wsManager2 = req.app.locals.wsManager;
        if (wsManager2) {
          wsManager2.emitAdminAlert({
            id: String(newsId),
            title,
            content,
            source: source || "\u0646\u0648\u0627\u0642\u0635",
            isAlert: true,
            category: newsCategory,
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      } catch {
      }
    }
    res.status(201).json({ id: newsId, message: "\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062E\u0628\u0631" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062E\u0628\u0631", details: err.message });
  }
});
router5.put("/news/:id", (req, res) => {
  try {
    const existing = database_default.prepare("SELECT id FROM news_items WHERE id = ?").get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "\u0627\u0644\u062E\u0628\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const { title, content, source, category, isAlert } = req.body;
    const updates = [];
    const values = [];
    if (title !== void 0) {
      updates.push("title = ?");
      values.push(title);
    }
    if (content !== void 0) {
      updates.push("content = ?");
      values.push(content);
    }
    if (source !== void 0) {
      updates.push("source = ?");
      values.push(source);
    }
    if (category !== void 0) {
      updates.push("category = ?");
      values.push(category);
    }
    if (isAlert !== void 0) {
      updates.push("is_alert = ?");
      values.push(isAlert ? 1 : 0);
    }
    if (updates.length === 0) {
      res.status(400).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0642\u062F\u064A\u0645 \u0623\u064A \u062A\u062D\u062F\u064A\u062B\u0627\u062A" });
      return;
    }
    values.push(req.params.id);
    database_default.prepare(`UPDATE news_items SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    res.json({ message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062E\u0628\u0631" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u062E\u0628\u0631", details: err.message });
  }
});
router5.delete("/news/:id", (req, res) => {
  try {
    database_default.prepare("DELETE FROM news_items WHERE id = ?").run(req.params.id);
    res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062E\u0628\u0631" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u062E\u0628\u0631", details: err.message });
  }
});
router5.get("/reports", (req, res) => {
  try {
    const flaggedPosts = database_default.prepare(`
      SELECT p.id, p.content as post_content, p.author_id as user_id, u.name as user_name,
             p.status, p.created_at, '\u0645\u062D\u062A\u0648\u0649 \u0645\u062E\u0627\u0644\u0641' as reason
      FROM posts p
      LEFT JOIN users u ON u.id = p.author_id
      WHERE p.status = 'flagged'
      ORDER BY p.created_at DESC
    `).all();
    let manualReports = [];
    try {
      manualReports = database_default.prepare(`
        SELECT r.id, r.post_id, r.user_id, r.reporter_id, u.name as reporter_name,
               r.reason, r.status, r.created_at,
               p.content as post_content, p2.name as user_name
        FROM reports r
        LEFT JOIN users u ON u.id = r.reporter_id
        LEFT JOIN posts p ON p.id = r.post_id
        LEFT JOIN users p2 ON p2.id = r.user_id
        ORDER BY r.created_at DESC
      `).all();
    } catch {
    }
    const combined = [
      ...flaggedPosts.map((fp) => ({
        id: `flagged_${fp.id}`,
        post_id: fp.id,
        user_id: fp.user_id,
        user_name: fp.user_name,
        post_content: fp.post_content,
        reason: fp.reason,
        status: "flagged",
        created_at: fp.created_at
      })),
      ...manualReports
    ];
    res.json(combined);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0628\u0644\u0627\u063A\u0627\u062A", details: err.message });
  }
});
router5.delete("/reports/:id/dismiss", (req, res) => {
  try {
    const reportId = req.params.id;
    if (reportId.startsWith("flagged_")) {
      const postId = reportId.replace("flagged_", "");
      database_default.prepare("UPDATE posts SET status = 'active', updated_at = datetime('now') WHERE id = ?").run(postId);
      res.json({ message: "\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u0628\u0644\u0627\u063A \u0648\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u0646\u0634\u0648\u0631" });
      return;
    }
    try {
      database_default.prepare("DELETE FROM reports WHERE id = ?").run(reportId);
      res.json({ message: "\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u0628\u0644\u0627\u063A" });
    } catch {
      res.json({ message: "\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u0628\u0644\u0627\u063A" });
    }
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0631\u0641\u0636 \u0627\u0644\u0628\u0644\u0627\u063A", details: err.message });
  }
});
router5.post("/categories", (req, res) => {
  try {
    const { name, icon, sort } = req.body;
    if (!name) {
      res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0641\u0626\u0629 \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    const maxSort = database_default.prepare("SELECT COALESCE(MAX(sort), 0) as maxSort FROM categories").get();
    const sortValue = sort || maxSort.maxSort + 1;
    const result = database_default.prepare("INSERT INTO categories (name, icon, sort) VALUES (?, ?, ?)").run(name, icon || "\u{1F4C1}", sortValue);
    res.status(201).json({ id: result.lastInsertRowid, name, icon: icon || "\u{1F4C1}", sort: sortValue, message: "\u062A\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0641\u0626\u0629" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0641\u0626\u0629", details: err.message });
  }
});
router5.put("/categories/:id", (req, res) => {
  try {
    const existing = database_default.prepare("SELECT id FROM categories WHERE id = ?").get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "\u0627\u0644\u0641\u0626\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    const { name, icon, sort } = req.body;
    const updates = [];
    const values = [];
    if (name !== void 0) {
      updates.push("name = ?");
      values.push(name);
    }
    if (icon !== void 0) {
      updates.push("icon = ?");
      values.push(icon);
    }
    if (sort !== void 0) {
      updates.push("sort = ?");
      values.push(sort);
    }
    if (updates.length === 0) {
      res.status(400).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0642\u062F\u064A\u0645 \u0623\u064A \u062A\u062D\u062F\u064A\u062B\u0627\u062A" });
      return;
    }
    values.push(req.params.id);
    database_default.prepare(`UPDATE categories SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    res.json({ message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0641\u0626\u0629" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0641\u0626\u0629", details: err.message });
  }
});
router5.delete("/categories/:id", (req, res) => {
  try {
    const existing = database_default.prepare("SELECT id FROM categories WHERE id = ?").get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "\u0627\u0644\u0641\u0626\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    database_default.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
    res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0641\u0626\u0629" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0641\u0626\u0629", details: err.message });
  }
});
router5.put("/posts/:id/feature", (req, res) => {
  try {
    const post = database_default.prepare("SELECT id FROM posts WHERE id = ?").get(req.params.id);
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    try {
      database_default.prepare("ALTER TABLE posts ADD COLUMN is_featured INTEGER DEFAULT 0").run();
    } catch {
    }
    database_default.prepare("UPDATE posts SET is_featured = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ message: "\u062A\u0645 \u062A\u0645\u064A\u064A\u0632 \u0627\u0644\u0645\u0646\u0634\u0648\u0631" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0645\u064A\u064A\u0632 \u0627\u0644\u0645\u0646\u0634\u0648\u0631", details: err.message });
  }
});
router5.delete("/posts/:id/feature", (req, res) => {
  try {
    const post = database_default.prepare("SELECT id FROM posts WHERE id = ?").get(req.params.id);
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    database_default.prepare("UPDATE posts SET is_featured = 0, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ message: "\u062A\u0645 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u062A\u0645\u064A\u064A\u0632 \u0645\u0646 \u0627\u0644\u0645\u0646\u0634\u0648\u0631" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0632\u0627\u0644\u0629 \u0627\u0644\u062A\u0645\u064A\u064A\u0632", details: err.message });
  }
});
router5.patch("/posts/:id/flag", (req, res) => {
  try {
    const post = database_default.prepare("SELECT id FROM posts WHERE id = ?").get(req.params.id);
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    database_default.prepare("UPDATE posts SET status = 'flagged', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ message: "\u062A\u0645 \u0648\u0636\u0639 \u0639\u0644\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0634\u0648\u0631" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0648\u0636\u0639 \u0627\u0644\u0639\u0644\u0627\u0645\u0629", details: err.message });
  }
});
router5.get("/settings", (req, res) => {
  try {
    database_default.exec(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    const settings = database_default.prepare("SELECT key, value FROM site_settings").all();
    const defaults = {
      siteName: "\u0646\u0648\u0627\u0642\u0635",
      maintenanceMode: "false",
      maxUploadSize: "5",
      defaultWalletBalance: "0"
    };
    const result = {};
    for (const row of settings) {
      result[row.key] = row.value;
    }
    for (const [key, defaultValue] of Object.entries(defaults)) {
      if (!(key in result)) {
        result[key] = defaultValue;
        try {
          database_default.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)").run(key, defaultValue);
        } catch {
        }
      }
    }
    result.maintenanceMode = result.maintenanceMode === "true";
    result.maxUploadSize = parseInt(result.maxUploadSize) || 5;
    result.defaultWalletBalance = parseFloat(result.defaultWalletBalance) || 0;
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A", details: err.message });
  }
});
router5.put("/settings", (req, res) => {
  try {
    database_default.exec(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    const upsert = database_default.prepare(`
      INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);
    const allowedKeys = ["siteName", "maintenanceMode", "maxUploadSize", "defaultWalletBalance"];
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedKeys.includes(key)) {
        const stringValue = typeof value === "boolean" ? String(value) : String(value);
        upsert.run(key, stringValue);
      }
    }
    if (req.body.defaultWalletBalance !== void 0) {
    }
    res.json({ message: "\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0628\u0646\u062C\u0627\u062D" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A", details: err.message });
  }
});
try {
  database_default.prepare("ALTER TABLE posts ADD COLUMN is_featured INTEGER DEFAULT 0").run();
} catch {
}
try {
  database_default.prepare("ALTER TABLE users ADD COLUMN gender TEXT DEFAULT 'male'").run();
} catch {
}
try {
  database_default.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      post_id TEXT,
      user_id TEXT,
      reporter_id TEXT NOT NULL,
      reason TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
} catch {
}
try {
  database_default.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
} catch {
}
router5.get("/all-posts", (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const type = req.query.type;
    const search = req.query.search;
    let whereClause = "1=1";
    const params = [];
    if (status && status !== "all") {
      whereClause += " AND p.status = ?";
      params.push(status);
    }
    if (type && type !== "all") {
      whereClause += " AND p.type = ?";
      params.push(type);
    }
    if (search) {
      whereClause += " AND (p.content LIKE ? OR u.name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    const posts = database_default.prepare(`
      SELECT p.*, u.name as author_name, u.avatar as author_avatar, u.is_verified as author_verified,
             u.phone as author_phone,
             c.name as category_name
      FROM posts p
      LEFT JOIN users u ON u.id = p.author_id
      LEFT JOIN categories c ON c.id = p.category
      WHERE ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    const total = database_default.prepare(`
      SELECT COUNT(*) as count FROM posts p
      LEFT JOIN users u ON u.id = p.author_id
      WHERE ${whereClause}
    `).get(...params);
    res.json({ posts, total: total.count, page, limit });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A", details: err.message });
  }
});
router5.get("/transactions", (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const type = req.query.type;
    let whereClause = "1=1";
    const params = [];
    if (type && type !== "all") {
      whereClause += " AND t.type = ?";
      params.push(type);
    }
    const transactions = database_default.prepare(`
      SELECT t.*, u.name as user_name, u.email as user_email
      FROM transactions t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    const total = database_default.prepare(`
      SELECT COUNT(*) as count FROM transactions t WHERE ${whereClause}
    `).get(...params);
    res.json({ transactions, total: total.count, page, limit });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A", details: err.message });
  }
});
router5.get("/activity-log", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activities = [];
    const recentPosts = database_default.prepare(`
      SELECT p.id, p.content, p.type, p.status, p.created_at,
             u.name as user_name, u.id as user_id, 'post' as activity_type
      FROM posts p LEFT JOIN users u ON u.id = p.author_id
      ORDER BY p.created_at DESC LIMIT ?
    `).all(limit);
    const recentUsers = database_default.prepare(`
      SELECT id, name, email, created_at, 'user_register' as activity_type
      FROM users ORDER BY created_at DESC LIMIT ?
    `).all(limit);
    const recentTx = database_default.prepare(`
      SELECT t.id, t.type, t.amount, t.status, t.created_at,
             u.name as user_name, t.type as tx_type, 'transaction' as activity_type
      FROM transactions t LEFT JOIN users u ON u.id = t.user_id
      ORDER BY t.created_at DESC LIMIT ?
    `).all(limit);
    const recentPromos = database_default.prepare(`
      SELECT pr.id, pr.status, pr.created_at, pr.price, pr.package_name,
             u.name as user_name, 'promotion' as activity_type
      FROM promotion_requests pr LEFT JOIN users u ON u.id = pr.author_id
      ORDER BY pr.created_at DESC LIMIT ?
    `).all(limit);
    const all = [
      ...recentPosts.map((p) => ({ ...p, sortDate: new Date(p.created_at).getTime() })),
      ...recentUsers.map((u) => ({ ...u, sortDate: new Date(u.created_at).getTime() })),
      ...recentTx.map((t) => ({ ...t, sortDate: new Date(t.created_at).getTime() })),
      ...recentPromos.map((p) => ({ ...p, sortDate: new Date(p.created_at).getTime() }))
    ].sort((a, b) => b.sortDate - a.sortDate).slice(0, limit);
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0633\u062C\u0644 \u0627\u0644\u0646\u0634\u0627\u0637", details: err.message });
  }
});
router5.get("/stories", (req, res) => {
  try {
    const stories = database_default.prepare(`
      SELECT s.*, u.name as user_name, u.avatar as user_avatar
      FROM stories s LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.created_at DESC
    `).all();
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0642\u0635\u0635", details: err.message });
  }
});
router5.delete("/stories/:id", (req, res) => {
  try {
    database_default.prepare("DELETE FROM stories WHERE id = ?").run(req.params.id);
    res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0642\u0635\u0629" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0642\u0635\u0629", details: err.message });
  }
});
router5.get("/chat-messages", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const messages = database_default.prepare(`
      SELECT cm.*, u1.name as sender_name, u2.name as receiver_name
      FROM chat_messages cm
      LEFT JOIN users u1 ON u1.id = cm.sender_id
      LEFT JOIN users u2 ON u2.id = cm.receiver_id
      ORDER BY cm.created_at DESC LIMIT ?
    `).all(limit);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0631\u0633\u0627\u0626\u0644", details: err.message });
  }
});
router5.delete("/chat-messages/:id", (req, res) => {
  try {
    database_default.prepare("DELETE FROM chat_messages WHERE id = ?").run(req.params.id);
    res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0631\u0633\u0627\u0644\u0629" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0631\u0633\u0627\u0644\u0629", details: err.message });
  }
});
router5.get("/database-info", (req, res) => {
  try {
    const tables = [
      "users",
      "posts",
      "post_comments",
      "chat_messages",
      "stories",
      "notifications",
      "transactions",
      "promotion_requests",
      "charging_requests",
      "friendships",
      "categories",
      "news_items",
      "market_trends",
      "sessions",
      "reports",
      "site_settings"
    ];
    const tableCounts = {};
    for (const table of tables) {
      try {
        const result = database_default.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        tableCounts[table] = result.count;
      } catch {
        tableCounts[table] = -1;
      }
    }
    let dbSize = 0;
    try {
      const fs6 = __require("fs");
      const path6 = __require("path");
      const dbPath2 = path6.join(process.cwd(), "data", "nawaqes.db");
      if (fs6.existsSync(dbPath2)) {
        const stats = fs6.statSync(dbPath2);
        dbSize = stats.size;
      }
    } catch {
    }
    res.json({
      tables: tableCounts,
      totalTables: Object.values(tableCounts).filter((v) => v >= 0).length,
      dbSize,
      dbSizeFormatted: dbSize > 1048576 ? `${(dbSize / 1048576).toFixed(2)} MB` : `${(dbSize / 1024).toFixed(2)} KB`
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A", details: err.message });
  }
});
router5.post("/broadcast", (req, res) => {
  try {
    const { title, message, type } = req.body;
    if (!message) {
      res.status(400).json({ error: "\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0645\u0637\u0644\u0648\u0628\u0629" });
      return;
    }
    const users = database_default.prepare("SELECT id FROM users WHERE is_deactivated = 0").all();
    const notifType = type || "system";
    const notifLink = notifType === "alert" ? "/notifications?filter=alert" : notifType === "promotion" ? "/promotions" : notifType === "payment" ? "/wallet" : "";
    const insert = database_default.prepare("INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)");
    const insertMany = database_default.transaction((userList) => {
      for (const user of userList) {
        insert.run(user.id, notifType, message, notifLink);
      }
    });
    insertMany(users);
    try {
      const wsManager2 = req.app.locals.wsManager;
      if (wsManager2) {
        if (notifType === "alert") {
          wsManager2.emitAdminAlert({
            id: `broadcast_${Date.now()}`,
            title: title || message.slice(0, 50),
            content: message,
            source: "\u0625\u062F\u0627\u0631\u0629 \u0646\u0648\u0627\u0642\u0635",
            isAlert: true,
            category: "urgent",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        for (const user of users) {
          wsManager2.emitNotification(user.id, {
            type: notifType,
            message,
            link: notifLink,
            time: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      }
    } catch {
    }
    res.json({ message: `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0625\u0644\u0649 ${users.length} \u0645\u0633\u062A\u062E\u062F\u0645`, count: users.length });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631", details: err.message });
  }
});
router5.post("/cleanup", (req, res) => {
  try {
    const { action } = req.body;
    let result = {};
    switch (action) {
      case "expired_promotions": {
        const r = database_default.prepare(`
          UPDATE posts SET is_promoted = 0, promotion_status = 'expired', updated_at = datetime('now')
          WHERE is_promoted = 1 AND promotion_expires_at IS NOT NULL AND promotion_expires_at < datetime('now')
        `).run();
        result = { message: `\u062A\u0645 \u0625\u0646\u0647\u0627\u0621 ${r.changes} \u062A\u0631\u0648\u064A\u062C \u0645\u0646\u062A\u0647\u064A`, count: r.changes };
        break;
      }
      case "old_notifications": {
        const r = database_default.prepare("DELETE FROM notifications WHERE created_at < datetime('now', '-30 days')").run();
        result = { message: `\u062A\u0645 \u062D\u0630\u0641 ${r.changes} \u0625\u0634\u0639\u0627\u0631 \u0642\u062F\u064A\u0645`, count: r.changes };
        break;
      }
      case "sessions":
      case "old_sessions": {
        const r = database_default.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
        result = { message: `\u062A\u0645 \u062D\u0630\u0641 ${r.changes} \u062C\u0644\u0633\u0629 \u0645\u0646\u062A\u0647\u064A\u0629`, count: r.changes };
        break;
      }
      case "orphan_data":
      case "orphan_posts": {
        const r1 = database_default.prepare("DELETE FROM posts WHERE author_id IS NOT NULL AND author_id NOT IN (SELECT id FROM users)").run();
        const r2 = database_default.prepare("DELETE FROM post_comments WHERE post_id NOT IN (SELECT id FROM posts)").run();
        const r3 = database_default.prepare("DELETE FROM chat_messages WHERE sender_id NOT IN (SELECT id FROM users)").run();
        const total = r1.changes + r2.changes + r3.changes;
        result = { message: `\u062A\u0645 \u062D\u0630\u0641 ${total} \u0628\u064A\u0627\u0646\u0627\u062A \u064A\u062A\u064A\u0645\u0629 (${r1.changes} \u0645\u0646\u0634\u0648\u0631\u060C ${r2.changes} \u062A\u0639\u0644\u064A\u0642\u060C ${r3.changes} \u0631\u0633\u0627\u0644\u0629)`, count: total };
        break;
      }
      case "old_stories":
      case "expired_stories": {
        const r = database_default.prepare("DELETE FROM stories WHERE created_at < datetime('now', '-1 day')").run();
        result = { message: `\u062A\u0645 \u062D\u0630\u0641 ${r.changes} \u0642\u0635\u0629 \u0645\u0646\u062A\u0647\u064A\u0629`, count: r.changes };
        break;
      }
      case "optimize": {
        const beforeSize = fs3.existsSync(dbPath) ? fs3.statSync(dbPath).size : 0;
        database_default.pragma("wal_checkpoint(TRUNCATE)");
        database_default.exec("VACUUM");
        const afterSize = fs3.existsSync(dbPath) ? fs3.statSync(dbPath).size : 0;
        const savedMB = ((beforeSize - afterSize) / 1024 / 1024).toFixed(2);
        result = { message: `\u062A\u0645 \u062A\u062D\u0633\u064A\u0646 \u0627\u0644\u0642\u0627\u0639\u062F\u0629 \u0648\u062A\u0648\u0641\u064A\u0631 ${savedMB} MB`, count: beforeSize > 0 ? Math.round(afterSize / beforeSize * 100) : 100 };
        break;
      }
      default:
        res.status(400).json({ error: "\u0625\u062C\u0631\u0627\u0621 \u062A\u0646\u0638\u064A\u0641 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641" });
        return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u062A\u0646\u0638\u064A\u0641", details: err.message });
  }
});
router5.get("/user-details/:id", (req, res) => {
  try {
    const user = database_default.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    if (!user) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const posts = database_default.prepare("SELECT COUNT(*) as count FROM posts WHERE author_id = ?").get(req.params.id);
    const comments = database_default.prepare("SELECT COUNT(*) as count FROM post_comments WHERE user_id = ?").get(req.params.id);
    const transactions = database_default.prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10").all(req.params.id);
    const notifications = database_default.prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0").get(req.params.id);
    const friends = database_default.prepare(`
      SELECT COUNT(*) as count FROM friendships WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
    `).get(req.params.id, req.params.id);
    res.json({
      ...user,
      stats: {
        postsCount: posts.count,
        commentsCount: comments.count,
        unreadNotifications: notifications.count,
        friendsCount: friends.count
      },
      recentTransactions: transactions
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645", details: err.message });
  }
});
router5.post("/reports/:id/action", (req, res) => {
  try {
    const { action } = req.body;
    const reportId = req.params.id;
    if (!action) {
      res.status(400).json({ error: "\u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0625\u062C\u0631\u0627\u0621" });
      return;
    }
    if (reportId.startsWith("flagged_")) {
      const postId = reportId.replace("flagged_", "");
      if (action === "dismiss" || action === "unflag") {
        database_default.prepare("UPDATE posts SET status = 'active', updated_at = datetime('now') WHERE id = ?").run(postId);
        res.json({ message: "\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u0628\u0644\u0627\u063A \u0648\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u0645\u0646\u0634\u0648\u0631" });
        return;
      }
      if (action === "delete_post") {
        database_default.prepare("UPDATE posts SET status = 'deleted', updated_at = datetime('now') WHERE id = ?").run(postId);
        res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0627\u0644\u0645\u062E\u0627\u0644\u0641" });
        return;
      }
      if (action === "warn_user") {
        const post = database_default.prepare("SELECT author_id FROM posts WHERE id = ?").get(postId);
        if (post) {
          database_default.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)").run(post.author_id, "warning", "\u062A\u062D\u0630\u064A\u0631: \u062A\u0645 \u0627\u0644\u0625\u0628\u0644\u0627\u063A \u0639\u0646 \u0645\u0646\u0634\u0648\u0631\u0643 \u0644\u0645\u062E\u0627\u0644\u0641\u062A\u0647 \u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0645\u062C\u062A\u0645\u0639. \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u0628\u0627\u0644\u0642\u0648\u0627\u0639\u062F.");
        }
        database_default.prepare("UPDATE posts SET status = 'active', updated_at = datetime('now') WHERE id = ?").run(postId);
        res.json({ message: "\u062A\u0645 \u062A\u062D\u0630\u064A\u0631 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645" });
        return;
      }
      if (action === "ban_user") {
        const post = database_default.prepare("SELECT author_id FROM posts WHERE id = ?").get(postId);
        if (post) {
          database_default.prepare("UPDATE users SET is_deactivated = 1, updated_at = datetime('now') WHERE id = ?").run(post.author_id);
        }
        database_default.prepare("DELETE FROM posts WHERE id = ?").run(postId);
        res.json({ message: "\u062A\u0645 \u062D\u0638\u0631 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u062D\u0630\u0641 \u0627\u0644\u0645\u0646\u0634\u0648\u0631" });
        return;
      }
    }
    if (action === "dismiss") {
      try {
        database_default.prepare("DELETE FROM reports WHERE id = ?").run(reportId);
      } catch {
      }
      res.json({ message: "\u062A\u0645 \u0631\u0641\u0636 \u0627\u0644\u0628\u0644\u0627\u063A" });
      return;
    }
    let report = null;
    try {
      report = database_default.prepare("SELECT * FROM reports WHERE id = ?").get(reportId);
    } catch {
    }
    if (!report) {
      res.status(404).json({ error: "\u0627\u0644\u0628\u0644\u0627\u063A \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (action === "delete_post" && report.post_id) {
      database_default.prepare("UPDATE posts SET status = 'deleted', updated_at = datetime('now') WHERE id = ?").run(report.post_id);
      try {
        database_default.prepare("DELETE FROM reports WHERE id = ?").run(reportId);
      } catch {
      }
      res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0627\u0644\u0645\u062E\u0627\u0644\u0641" });
      return;
    }
    if (action === "warn_user" && report.user_id) {
      database_default.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)").run(report.user_id, "warning", "\u062A\u062D\u0630\u064A\u0631: \u062A\u0645 \u0627\u0644\u0625\u0628\u0644\u0627\u063A \u0639\u0646 \u0646\u0634\u0627\u0637\u0643 \u0644\u0645\u062E\u0627\u0644\u0641\u062A\u0647 \u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0645\u062C\u062A\u0645\u0639. \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u0628\u0627\u0644\u0642\u0648\u0627\u0639\u062F.");
      try {
        database_default.prepare("DELETE FROM reports WHERE id = ?").run(reportId);
      } catch {
      }
      res.json({ message: "\u062A\u0645 \u062A\u062D\u0630\u064A\u0631 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645" });
      return;
    }
    if (action === "ban_user" && report.user_id) {
      database_default.prepare("UPDATE users SET is_deactivated = 1, updated_at = datetime('now') WHERE id = ?").run(report.user_id);
      if (report.post_id) {
        database_default.prepare("UPDATE posts SET status = 'deleted', updated_at = datetime('now') WHERE id = ?").run(report.post_id);
      }
      try {
        database_default.prepare("DELETE FROM reports WHERE id = ?").run(reportId);
      } catch {
      }
      res.json({ message: "\u062A\u0645 \u062D\u0638\u0631 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645" });
      return;
    }
    res.status(400).json({ error: "\u0625\u062C\u0631\u0627\u0621 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u0625\u062C\u0631\u0627\u0621", details: err.message });
  }
});
router5.get("/smart-links", (req, res) => {
  try {
    const totalLinks = database_default.prepare("SELECT COUNT(DISTINCT post_id) as count FROM smart_link_visits WHERE post_id IN (SELECT id FROM posts WHERE smart_link_alias != '')").get();
    const totalVisits = database_default.prepare("SELECT COUNT(*) as count FROM smart_link_visits").get();
    const uniqueVisitors = database_default.prepare("SELECT COUNT(DISTINCT COALESCE(visitor_id, visitor_ip)) as count FROM smart_link_visits").get();
    const topLinks = database_default.prepare(`
      SELECT p.id, p.content, p.smart_link_alias, COUNT(v.id) as visit_count,
             COUNT(DISTINCT COALESCE(v.visitor_id, v.visitor_ip)) as unique_visitors
      FROM smart_link_visits v
      JOIN posts p ON p.id = v.post_id
      GROUP BY v.post_id
      ORDER BY visit_count DESC
      LIMIT 10
    `).all();
    const visitsByDate = database_default.prepare(`
      SELECT DATE(visited_at) as date, COUNT(*) as count
      FROM smart_link_visits
      WHERE visited_at >= datetime('now', '-30 days')
      GROUP BY DATE(visited_at)
      ORDER BY date ASC
    `).all();
    res.json({
      totalLinks: totalLinks.count || 0,
      totalVisits: totalVisits.count || 0,
      uniqueVisitors: uniqueVisitors.count || 0,
      topLinks,
      visitsByDate
    });
  } catch (err) {
    res.json({
      totalLinks: 0,
      totalVisits: 0,
      uniqueVisitors: 0,
      topLinks: [],
      visitsByDate: []
    });
  }
});
router5.get("/comments", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const postId = req.query.postId;
    let query = `
      SELECT pc.*, u.name as author_name, u.avatar as author_avatar, u.is_verified as author_verified,
             p.content as post_content, p.id as post_id
      FROM post_comments pc
      LEFT JOIN users u ON u.id = pc.author_id
      LEFT JOIN posts p ON p.id = pc.post_id
    `;
    const params = [];
    if (postId) {
      query += " WHERE pc.post_id = ?";
      params.push(postId);
    }
    query += " ORDER BY pc.created_at DESC LIMIT ?";
    params.push(limit);
    const comments = database_default.prepare(query).all(...params);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A", details: err.message });
  }
});
router5.delete("/comments/:id", (req, res) => {
  try {
    const comment = database_default.prepare("SELECT id, post_id FROM post_comments WHERE id = ?").get(req.params.id);
    if (!comment) {
      res.status(404).json({ error: "\u0627\u0644\u062A\u0639\u0644\u064A\u0642 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    database_default.prepare("DELETE FROM post_comments WHERE id = ?").run(req.params.id);
    try {
      database_default.prepare("UPDATE posts SET comments = (SELECT COUNT(*) FROM post_comments WHERE post_id = ?) WHERE id = ?").run(comment.post_id, comment.post_id);
    } catch {
    }
    res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u062A\u0639\u0644\u064A\u0642" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u062A\u0639\u0644\u064A\u0642", details: err.message });
  }
});
router5.patch("/users/:id/toggle-trusted", (req, res) => {
  try {
    const user = database_default.prepare("SELECT is_trusted FROM users WHERE id = ?").get(req.params.id);
    if (!user) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const newStatus = user.is_trusted ? 0 : 1;
    database_default.prepare("UPDATE users SET is_trusted = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, req.params.id);
    res.json({ id: req.params.id, is_trusted: !!newStatus, message: newStatus ? "\u062A\u0645 \u0645\u0646\u062D \u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0648\u062B\u0648\u0642" : "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0648\u062B\u0648\u0642" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0648\u062B\u0648\u0642", details: err.message });
  }
});
router5.post("/users/:id/send-warning", (req, res) => {
  try {
    const { reason } = req.body;
    const user = database_default.prepare("SELECT id, name FROM users WHERE id = ?").get(req.params.id);
    if (!user) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const warningMessage = reason ? `\u062A\u062D\u0630\u064A\u0631 \u0645\u0646 \u0627\u0644\u0625\u062F\u0627\u0631\u0629: ${reason}` : "\u062A\u062D\u0630\u064A\u0631 \u0645\u0646 \u0627\u0644\u0625\u062F\u0627\u0631\u0629: \u062A\u0645 \u062A\u0646\u0628\u064A\u0647\u0643 \u0644\u0645\u062E\u0627\u0644\u0641\u0629 \u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0645\u062C\u062A\u0645\u0639. \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u0628\u0627\u0644\u0642\u0648\u0627\u0639\u062F.";
    database_default.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)").run(req.params.id, "warning", warningMessage);
    res.json({ message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u062D\u0630\u064A\u0631 \u0644\u0644\u0645\u0633\u062A\u062E\u062F\u0645" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u062D\u0630\u064A\u0631", details: err.message });
  }
});
router5.get("/dashboard/realtime", (req, res) => {
  try {
    const onlineUsers = database_default.prepare("SELECT COUNT(DISTINCT user_id) as count FROM sessions WHERE expires_at > datetime('now')").get();
    const newPostsToday = database_default.prepare("SELECT COUNT(*) as count FROM posts WHERE created_at >= datetime('now', '-1 day')").get();
    const newUsersToday = database_default.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-1 day')").get();
    const pendingCharging = database_default.prepare("SELECT COUNT(*) as count FROM charging_requests WHERE status = 'pending'").get();
    const pendingPromotions = database_default.prepare("SELECT COUNT(*) as count FROM promotion_requests WHERE status = 'pending'").get();
    const flaggedPosts = database_default.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'flagged'").get();
    const recentActivity = [];
    const recentUsers = database_default.prepare("SELECT name, created_at FROM users ORDER BY created_at DESC LIMIT 2").all();
    for (const u of recentUsers) {
      recentActivity.push({ type: "user", description: `\u0645\u0633\u062A\u062E\u062F\u0645 \u062C\u062F\u064A\u062F: ${u.name}`, created_at: u.created_at });
    }
    const recentPosts = database_default.prepare("SELECT p.content, u.name, p.created_at FROM posts p LEFT JOIN users u ON u.id = p.author_id ORDER BY p.created_at DESC LIMIT 2").all();
    for (const p of recentPosts) {
      recentActivity.push({ type: "post", description: `\u0645\u0646\u0634\u0648\u0631 \u062C\u062F\u064A\u062F \u0645\u0646 ${p.name || "\u0645\u062C\u0647\u0648\u0644"}`, created_at: p.created_at });
    }
    const recentTransactions = database_default.prepare("SELECT t.amount, t.type, u.name, t.created_at FROM transactions t LEFT JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC LIMIT 2").all();
    for (const t of recentTransactions) {
      recentActivity.push({ type: "transaction", description: `\u0645\u0639\u0627\u0645\u0644\u0629 ${t.type} - ${t.amount} \u062C.\u0645 (${t.name || "\u0645\u062C\u0647\u0648\u0644"})`, created_at: t.created_at });
    }
    recentActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({
      onlineUsers: onlineUsers.count || 0,
      wsOnlineUsers: req.app.locals.wsManager?.getConnectionCount() || 0,
      newPostsToday: newPostsToday.count || 0,
      newUsersToday: newUsersToday.count || 0,
      pendingItems: (pendingCharging.count || 0) + (pendingPromotions.count || 0) + (flaggedPosts.count || 0),
      recentActivity: recentActivity.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062D\u064A\u0629", details: err.message });
  }
});
router5.get("/market-promotion-requests", (req, res) => {
  try {
    const status = req.query.status;
    let query = "SELECT mpr.*, ml.title as listing_title, u.name as seller_name, u.avatar as seller_avatar FROM market_promotion_requests mpr LEFT JOIN market_listings ml ON ml.id = mpr.listing_id LEFT JOIN users u ON u.id = mpr.seller_id";
    const params = [];
    if (status && ["pending", "approved", "rejected", "expired"].includes(status)) {
      query += " WHERE mpr.status = ?";
      params.push(status);
    }
    query += " ORDER BY mpr.created_at DESC";
    const requests = database_default.prepare(query).all(...params);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0637\u0644\u0628\u0627\u062A \u062A\u0631\u0648\u064A\u062C \u0627\u0644\u0633\u0648\u0642", details: err.message });
  }
});
router5.post("/market-promotion-requests/:id/approve", (req, res) => {
  try {
    const pr = database_default.prepare("SELECT * FROM market_promotion_requests WHERE id = ?").get(req.params.id);
    if (!pr) {
      res.status(404).json({ error: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (pr.status === "approved") {
      res.status(400).json({ error: "\u0627\u0644\u0637\u0644\u0628 \u062A\u0645\u062A \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u064A\u0647 \u0628\u0627\u0644\u0641\u0639\u0644" });
      return;
    }
    database_default.prepare("UPDATE market_promotion_requests SET status = 'approved' WHERE id = ?").run(req.params.id);
    const durationDays = pr.duration ? Math.ceil(pr.duration / 24) : 3;
    const expiresAt = new Date(Date.now() + durationDays * 864e5).toISOString();
    database_default.prepare(`UPDATE market_listings SET
      is_promoted = 1,
      promotion_status = 'approved',
      promotion_tier = ?,
      promotion_package = ?,
      promotion_started_at = datetime('now'),
      promotion_expires_at = ?,
      estimated_reach = ?,
      updated_at = datetime('now')
      WHERE id = ?`).run(
      pr.tier,
      pr.package_name || "",
      expiresAt,
      pr.estimated_reach || 0,
      pr.listing_id
    );
    database_default.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)").run(pr.seller_id, "promotion", `\u062A\u0645 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u062A\u0631\u0648\u064A\u062C \u0625\u0639\u0644\u0627\u0646\u0643 \u0641\u064A \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0630\u0643\u064A - \u0628\u0627\u0642\u0629 ${pr.package_name || pr.tier}`);
    try {
      const maxNotifications = pr.estimated_reach ? Math.min(Math.floor(pr.estimated_reach / 10), 500) : 50;
      let targetUsers = [];
      let targetingQuery = "SELECT id FROM users WHERE id != ? AND is_deactivated = 0";
      const targetParams = [pr.seller_id];
      if (pr.targeting === "city" && pr.target_city) {
        let cities = [];
        try {
          const parsed = JSON.parse(pr.target_city);
          if (Array.isArray(parsed)) cities = parsed;
        } catch {
          cities = [pr.target_city];
        }
        if (cities.length > 0) {
          const cityConditions = cities.map(() => "(location LIKE ? OR location LIKE ?)").join(" OR ");
          targetingQuery += ` AND (${cityConditions})`;
          for (const city of cities) {
            targetParams.push(`%${city}%`, `${city}%`);
          }
        }
      }
      if (pr.targeting === "interests" && pr.target_interests) {
        let interests = [];
        try {
          const parsed = JSON.parse(pr.target_interests);
          if (Array.isArray(parsed)) interests = parsed;
        } catch {
          interests = [pr.target_interests];
        }
        if (interests.length > 0) {
          const interestConditions = interests.map(() => "interests LIKE ?").join(" OR ");
          targetingQuery += ` AND (${interestConditions})`;
          for (const interest of interests) {
            targetParams.push(`%"${interest}"%`);
          }
        }
      }
      targetingQuery += ` ORDER BY RANDOM() LIMIT ?`;
      targetParams.push(String(maxNotifications));
      targetUsers = database_default.prepare(targetingQuery).all(...targetParams);
      const listingTitle = pr.listing_title || "\u0625\u0639\u0644\u0627\u0646";
      const insertNotif = database_default.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)");
      for (const user of targetUsers) {
        insertNotif.run(user.id, "promotion", `\u0625\u0639\u0644\u0627\u0646 \u062C\u062F\u064A\u062F \u0641\u064A \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0630\u0643\u064A \u0642\u062F \u064A\u0647\u0645\u0643: ${listingTitle}`);
      }
    } catch (notifErr) {
      console.error("Error sending targeted notifications for market promotion:", notifErr.message);
    }
    res.json({ message: "\u062A\u0645 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0637\u0644\u0628 \u062A\u0631\u0648\u064A\u062C \u0627\u0644\u0633\u0648\u0642" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u062A\u0631\u0648\u064A\u062C \u0627\u0644\u0633\u0648\u0642", details: err.message });
  }
});
router5.post("/market-promotion-requests/:id/reject", (req, res) => {
  try {
    const pr = database_default.prepare("SELECT * FROM market_promotion_requests WHERE id = ?").get(req.params.id);
    if (!pr) {
      res.status(404).json({ error: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    database_default.prepare("UPDATE market_promotion_requests SET status = 'rejected' WHERE id = ?").run(req.params.id);
    database_default.prepare("UPDATE market_listings SET promotion_status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(pr.listing_id);
    database_default.prepare("UPDATE users SET wallet_balance = wallet_balance + ?, updated_at = datetime('now') WHERE id = ?").run(pr.price, pr.seller_id);
    database_default.prepare("INSERT INTO transactions (user_id, type, amount, method, status) VALUES (?, ?, ?, ?, ?)").run(pr.seller_id, "promotion_refund", pr.price, "\u0645\u062D\u0641\u0638\u0629", "completed");
    database_default.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)").run(pr.seller_id, "system", `\u062A\u0645 \u0631\u0641\u0636 \u0637\u0644\u0628 \u062A\u0631\u0648\u064A\u062C \u0625\u0639\u0644\u0627\u0646\u0643 \u0648\u062A\u0645 \u0627\u0633\u062A\u0631\u062F\u0627\u062F ${pr.price} \u062C.\u0645`);
    res.json({ message: "\u062A\u0645 \u0631\u0641\u0636 \u0637\u0644\u0628 \u062A\u0631\u0648\u064A\u062C \u0627\u0644\u0633\u0648\u0642" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0631\u0641\u0636 \u062A\u0631\u0648\u064A\u062C \u0627\u0644\u0633\u0648\u0642", details: err.message });
  }
});
var admin_default = router5;

// src/routes/api.ts
import { Router as Router6 } from "express";
import multer2 from "multer";
import path4 from "path";
import crypto5 from "crypto";
import fs4 from "fs";
init_auth();
var router6 = Router6();
var storage = multer2.diskStorage({
  destination: (_req, _file, cb) => cb(null, path4.resolve("uploads")),
  filename: (_req, file, cb) => {
    const ext = path4.extname(file.originalname);
    cb(null, `${crypto5.randomBytes(16).toString("hex")}${ext}`);
  }
});
var upload = multer2({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  // 100MB for images (increased)
  fileFilter: (_req, file, cb) => {
    const ext = path4.extname(file.originalname).toLowerCase();
    const isMediaMime = /^(image|video)\//.test(file.mimetype) || file.mimetype === "application/octet-stream";
    const hasExt = ext.length > 1;
    cb(null, isMediaMime || hasExt);
  }
});
var videoStorage = multer2.diskStorage({
  destination: (_req, _file, cb) => {
    const videoDir = path4.resolve("uploads/videos");
    if (!fs4.existsSync(videoDir)) fs4.mkdirSync(videoDir, { recursive: true });
    cb(null, videoDir);
  },
  filename: (_req, file, cb) => {
    const ext = path4.extname(file.originalname) || ".mp4";
    cb(null, `vid_${crypto5.randomBytes(16).toString("hex")}${ext}`);
  }
});
var videoUpload = multer2({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  // 500MB for videos (increased)
  fileFilter: (_req, file, cb) => {
    const ext = path4.extname(file.originalname).toLowerCase();
    const isVideoMime = /^video\//.test(file.mimetype) || file.mimetype === "application/octet-stream";
    const hasExt = ext.length > 1;
    cb(null, isVideoMime || hasExt);
  }
});
var mediaUpload = multer2({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  // 500MB for any media (increased)
  fileFilter: (_req, file, cb) => {
    const ext = path4.extname(file.originalname).toLowerCase();
    const isMediaMime = /^(image|video)\//.test(file.mimetype) || file.mimetype === "application/octet-stream";
    const hasExt = ext.length > 1;
    cb(null, isMediaMime || hasExt);
  }
});
router6.post("/upload", authMiddleware, mediaUpload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u0631\u0641\u0639 \u0623\u064A \u0645\u0644\u0641" });
    return;
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});
router6.post("/videos/upload", authMiddleware, videoUpload.single("video"), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u0631\u0641\u0639 \u0623\u064A \u0641\u064A\u062F\u064A\u0648" });
      return;
    }
    const url = `/uploads/videos/${req.file.filename}`;
    const size = req.file.size;
    res.json({ url, filename: req.file.filename, size });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0631\u0641\u0639 \u0627\u0644\u0641\u064A\u062F\u064A\u0648", details: err.message });
  }
});
router6.use("/videos/upload", (err, _req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ error: "\u062D\u062C\u0645 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u064A\u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D (500 \u0645\u064A\u062C\u0627\u0628\u0627\u064A\u062A)" });
    return;
  }
  if (err.message) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "\u0641\u0634\u0644 \u0631\u0641\u0639 \u0627\u0644\u0641\u064A\u062F\u064A\u0648" });
});
router6.post("/market-live/link-video", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { postId, videoUrl, thumbnailUrl, duration, listingType } = req.body;
    if (!postId || !videoUrl) {
      res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0648\u0631\u0627\u0628\u0637 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      return;
    }
    if (!videoUrl.startsWith("/uploads/")) {
      res.status(400).json({ error: "\u0631\u0627\u0628\u0637 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
      return;
    }
    const videoId = crypto5.randomBytes(16).toString("hex").toLowerCase();
    if (listingType === "market_listing") {
      const listing = database_default.prepare("SELECT * FROM market_listings WHERE id = ? AND seller_id = ?").get(postId, payload.userId);
      if (!listing) {
        res.status(404).json({ error: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u0644\u064A\u0633 \u0645\u0644\u0643\u0643" });
        return;
      }
      database_default.prepare(`
        INSERT INTO ad_videos (id, post_id, user_id, video_url, thumbnail_url, duration)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(videoId, postId, payload.userId, videoUrl, thumbnailUrl || "", duration || 0);
    } else {
      const post = database_default.prepare("SELECT * FROM posts WHERE id = ? AND author_id = ?").get(postId, payload.userId);
      if (!post) {
        res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u0644\u064A\u0633 \u0645\u0644\u0643\u0643" });
        return;
      }
      database_default.prepare(`UPDATE posts SET video_url = ?, updated_at = datetime('now') WHERE id = ?`).run(videoUrl, postId);
      database_default.prepare(`
        INSERT INTO ad_videos (id, post_id, user_id, video_url, thumbnail_url, duration)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(videoId, postId, payload.userId, videoUrl, thumbnailUrl || "", duration || 0);
    }
    res.status(201).json({
      id: videoId,
      videoUrl,
      thumbnailUrl: thumbnailUrl || "",
      duration: duration || 0,
      message: "\u062A\u0645 \u0631\u0628\u0637 \u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u0628\u0646\u062C\u0627\u062D"
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0631\u0628\u0637 \u0627\u0644\u0641\u064A\u062F\u064A\u0648", details: err.message });
  }
});
router6.get("/market-live/my-videos", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const videos = database_default.prepare(`
      SELECT v.*, p.content as post_content, p.image as post_image,
             ml.title as listing_title, ml.images as listing_images
      FROM ad_videos v
      LEFT JOIN posts p ON p.id = v.post_id
      LEFT JOIN market_listings ml ON ml.id = v.post_id
      WHERE v.user_id = ? AND v.status = 'active'
      ORDER BY v.created_at DESC
    `).all(payload.userId);
    const result = videos.map((v) => ({
      id: v.id,
      postId: v.post_id,
      videoUrl: v.video_url,
      thumbnailUrl: v.thumbnail_url || v.post_image || "",
      duration: v.duration,
      views: v.views,
      likes: v.likes,
      shares: v.shares,
      saves: v.saves,
      isFeatured: !!v.is_featured,
      title: v.listing_title || v.post_content?.substring(0, 60) || "",
      createdAt: v.created_at
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0641\u064A\u062F\u064A\u0648\u0647\u0627\u062A\u064A", details: err.message });
  }
});
router6.get("/categories", (_req, res) => {
  try {
    const categories = database_default.prepare("SELECT * FROM categories ORDER BY sort").all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0641\u0626\u0627\u062A", details: err.message });
  }
});
router6.get("/news", (req, res) => {
  try {
    const category = req.query.category;
    let query = "SELECT * FROM news_items";
    const params = [];
    if (category && ["general", "egypt", "world", "urgent"].includes(category)) {
      query += " WHERE category = ?";
      params.push(category);
    }
    query += " ORDER BY created_at DESC LIMIT 50";
    const news = database_default.prepare(query).all(...params);
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0623\u062E\u0628\u0627\u0631", details: err.message });
  }
});
router6.get("/stories", optionalAuth, (_req, res) => {
  try {
    const stories = database_default.prepare(`
      SELECT s.*, u.name as user_name, u.avatar as user_avatar
      FROM stories s JOIN users u ON u.id = s.user_id
      WHERE s.created_at >= datetime('now', '-24 hours')
      ORDER BY s.created_at DESC
    `).all().map((s) => ({
      id: s.id,
      image: s.image,
      type: s.type,
      text: s.text,
      backgroundColor: s.background_color,
      isSeen: !!s.is_seen,
      createdAt: s.created_at,
      user: { id: s.user_id, name: s.user_name, avatar: s.user_avatar }
    }));
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0642\u0635\u0635", details: err.message });
  }
});
router6.post("/stories", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { image, type, text, backgroundColor } = req.body;
    const result = database_default.prepare("INSERT INTO stories (user_id, image, type, text, background_color) VALUES (?, ?, ?, ?, ?)").run(payload.userId, image || "", type || "image", text || "", backgroundColor || "");
    const story = database_default.prepare("SELECT * FROM stories WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(payload.userId);
    try {
      const wsManager2 = req.app.locals.wsManager;
      if (wsManager2) {
        wsManager2.broadcast({ type: "story:created", data: { userId: payload.userId } }, { excludeUserId: payload.userId });
      }
    } catch (wsErr) {
      console.error("[WS] Failed to emit story created:", wsErr.message);
    }
    res.status(201).json(story);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0642\u0635\u0629", details: err.message });
  }
});
router6.get("/trends", (req, res) => {
  try {
    const category = req.query.category;
    let query = "SELECT * FROM market_trends";
    const params = [];
    if (category) {
      query += " WHERE category = ?";
      params.push(category);
    }
    query += " ORDER BY updated_at DESC";
    const trends = database_default.prepare(query).all(...params);
    res.json(trends);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0627\u062A\u062C\u0627\u0647\u0627\u062A", details: err.message });
  }
});
router6.post("/trends/refresh", authMiddleware, (_req, res) => {
  try {
    const categoryStats = database_default.prepare(`
      SELECT 
        category,
        COUNT(*) as count,
        COALESCE(AVG(price), 0) as avg_price,
        COALESCE(SUM(likes), 0) as total_likes
      FROM posts 
      WHERE type = 'ad' AND status = 'active' AND category != '' AND category IS NOT NULL
      GROUP BY category 
      ORDER BY count DESC
    `).all();
    const categoryTrendData = {};
    for (const cat of categoryStats) {
      const recent = database_default.prepare(`
        SELECT COUNT(*) as count FROM posts 
        WHERE type = 'ad' AND status = 'active' AND category = ? 
        AND created_at >= datetime('now', '-7 days')
      `).get(cat.category);
      const previous = database_default.prepare(`
        SELECT COUNT(*) as count FROM posts 
        WHERE type = 'ad' AND status = 'active' AND category = ? 
        AND created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')
      `).get(cat.category);
      categoryTrendData[cat.category] = {
        recent: recent.count || 0,
        previous: previous.count || 0,
        avgPrice: cat.avg_price,
        count: cat.count
      };
    }
    const categoryNames = {
      phones: "\u0647\u0648\u0627\u062A\u0641",
      cars: "\u0633\u064A\u0627\u0631\u0627\u062A",
      electronics: "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A",
      realEstate: "\u0639\u0642\u0627\u0631\u0627\u062A",
      games: "\u0623\u0644\u0639\u0627\u0628",
      fashion: "\u0623\u0632\u064A\u0627\u0621",
      services: "\u062E\u062F\u0645\u0627\u062A",
      books: "\u0643\u062A\u0628",
      sports: "\u0631\u064A\u0627\u0636\u0629",
      animals: "\u062D\u064A\u0648\u0627\u0646\u0627\u062A",
      jobs: "\u0648\u0638\u0627\u0626\u0641",
      other: "\u0623\u062E\u0631\u0649"
    };
    database_default.prepare("DELETE FROM market_trends").run();
    const insertTrend = database_default.prepare("INSERT INTO market_trends (id, item, trend, change, category, price, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))");
    for (const [cat, data] of Object.entries(categoryTrendData)) {
      if (data.count < 1) continue;
      let trend = "stable";
      let changePercent = 0;
      if (data.previous > 0) {
        changePercent = Math.round((data.recent - data.previous) / data.previous * 100);
        if (changePercent > 3) trend = "up";
        else if (changePercent < -3) trend = "down";
      } else if (data.recent > 0) {
        changePercent = 100;
        trend = "up";
      }
      const changeStr = changePercent >= 0 ? `+${changePercent}%` : `${changePercent}%`;
      insertTrend.run(`trend-real-${cat}`, categoryNames[cat] || cat, trend, changeStr, cat, Math.round(data.avgPrice));
    }
    const trends = database_default.prepare("SELECT * FROM market_trends ORDER BY updated_at DESC").all();
    res.json({ message: "\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0627\u062A\u062C\u0627\u0647\u0627\u062A \u0645\u0646 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629", trends });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0627\u062A\u062C\u0627\u0647\u0627\u062A", details: err.message });
  }
});
router6.get("/opportunities", optionalAuth, (req, res) => {
  try {
    const userId = req.user?.userId || null;
    const limit = Math.min(parseInt(req.query.limit) || 8, 20);
    let userInterests = [];
    let userLocation = "";
    let userCityId = "";
    let userAge = 0;
    if (userId) {
      try {
        const userInfo = database_default.prepare("SELECT interests, location, date_of_birth FROM users WHERE id = ?").get(userId);
        if (userInfo) {
          try {
            userInterests = JSON.parse(userInfo.interests || "[]");
          } catch {
            userInterests = [];
          }
          userLocation = userInfo.location || "";
          if (userInfo.date_of_birth) {
            const birthDate = new Date(userInfo.date_of_birth);
            const today = /* @__PURE__ */ new Date();
            userAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || monthDiff === 0 && today.getDate() < birthDate.getDate()) {
              userAge--;
            }
          }
          if (userLocation) {
            const cityMatch = database_default.prepare("SELECT id FROM cities_lookup WHERE name_ar = ? OR name_en = ? COLLATE NOCASE").get(userLocation, userLocation);
            if (cityMatch) userCityId = cityMatch.id;
          }
        }
      } catch {
      }
    }
    let opportunities = [];
    const promotedPosts = database_default.prepare(`
      SELECT p.id, p.content, p.image, p.price, p.category, p.location, p.created_at,
             p.is_promoted, p.promotion_tier, p.targeting, p.target_city, p.target_interests,
             p.target_age_min, p.target_age_max,
             u.name as author_name, u.avatar as author_avatar, u.avatar_base64, u.is_verified
      FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.type = 'ad' AND p.status = 'active' AND p.is_promoted = 1 AND p.promotion_status = 'approved'
      ORDER BY p.reach_count DESC, p.created_at DESC
      LIMIT ?
    `).all(limit * 2);
    const filteredPromotedPosts = promotedPosts.filter((p) => {
      if (p.targeting === "city" && p.target_city) {
        if (userCityId || userLocation) {
          let targetCities = [];
          try {
            const parsed = JSON.parse(p.target_city || "[]");
            if (Array.isArray(parsed)) targetCities = parsed;
            else if (typeof parsed === "string" && parsed.length > 0) targetCities = [parsed];
          } catch {
            if (p.target_city) targetCities = [p.target_city];
          }
          if (targetCities.length > 0) {
            const cityMatch = userCityId && targetCities.includes(userCityId) || userLocation && targetCities.some((c) => userLocation.includes(c));
            if (!cityMatch) return false;
          }
        }
      }
      if (p.targeting === "interests" && p.target_interests) {
        let postInterests = [];
        try {
          const parsed = JSON.parse(p.target_interests || "[]");
          if (Array.isArray(parsed)) postInterests = parsed;
        } catch {
          postInterests = [p.target_interests];
        }
        if (postInterests.length > 0 && userInterests.length > 0) {
          const hasMatch = postInterests.some(
            (interest) => userInterests.some(
              (ui) => ui === interest || ui.toLowerCase() === interest.toLowerCase() || ui.includes(interest) || interest.includes(ui) || ui === "\u0647\u0648\u0627\u062A\u0641" && interest === "phones" || ui === "phones" && interest === "\u0647\u0648\u0627\u062A\u0641" || ui === "\u0633\u064A\u0627\u0631\u0627\u062A" && interest === "cars" || ui === "cars" && interest === "\u0633\u064A\u0627\u0631\u0627\u062A" || ui === "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A" && interest === "electronics" || ui === "electronics" && interest === "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A" || ui === "\u0639\u0642\u0627\u0631\u0627\u062A" && interest === "realEstate" || ui === "realEstate" && interest === "\u0639\u0642\u0627\u0631\u0627\u062A" || ui === "\u0623\u0632\u064A\u0627\u0621" && interest === "fashion" || ui === "fashion" && interest === "\u0623\u0632\u064A\u0627\u0621" || ui === "\u0623\u0644\u0639\u0627\u0628" && interest === "games" || ui === "games" && interest === "\u0623\u0644\u0639\u0627\u0628" || ui === "\u0631\u064A\u0627\u0636\u0629" && interest === "sports" || ui === "sports" && interest === "\u0631\u064A\u0627\u0636\u0629" || ui === "\u0643\u062A\u0628" && interest === "books" || ui === "books" && interest === "\u0643\u062A\u0628" || ui === "\u0648\u0638\u0627\u0626\u0641" && interest === "jobs" || ui === "jobs" && interest === "\u0648\u0638\u0627\u0626\u0641" || ui === "\u062E\u062F\u0645\u0627\u062A" && interest === "services" || ui === "services" && interest === "\u062E\u062F\u0645\u0627\u062A" || ui === "\u062D\u064A\u0648\u0627\u0646\u0627\u062A" && interest === "animals" || ui === "animals" && interest === "\u062D\u064A\u0648\u0627\u0646\u0627\u062A"
            )
          );
          if (!hasMatch) return false;
        }
      }
      if (p.target_age_min && p.target_age_max && p.target_age_min > 0 && p.target_age_max > 0) {
        if (userAge > 0) {
          if (userAge < p.target_age_min || userAge > p.target_age_max) return false;
        }
      }
      return true;
    });
    let interestPosts = [];
    if (userInterests.length > 0) {
      const placeholders = userInterests.map(() => "p.category = ?").join(" OR ");
      interestPosts = database_default.prepare(`
        SELECT p.id, p.content, p.image, p.price, p.category, p.location, p.created_at,
               p.is_promoted, p.promotion_tier,
               u.name as author_name, u.avatar as author_avatar, u.avatar_base64, u.is_verified
        FROM posts p JOIN users u ON u.id = p.author_id
        WHERE p.type = 'ad' AND p.status = 'active' AND (${placeholders})
        ORDER BY p.likes DESC, p.created_at DESC
        LIMIT ?
      `).all(...userInterests, limit);
    }
    const existingIds = new Set([...filteredPromotedPosts, ...interestPosts].map((p) => p.id));
    const recentPosts = database_default.prepare(`
      SELECT p.id, p.content, p.image, p.price, p.category, p.location, p.created_at,
             p.is_promoted, p.promotion_tier,
             u.name as author_name, u.avatar as author_avatar, u.avatar_base64, u.is_verified
      FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.type = 'ad' AND p.status = 'active'
      ORDER BY p.likes DESC, p.created_at DESC
      LIMIT ?
    `).all(limit * 2);
    const seen = /* @__PURE__ */ new Set();
    const addPost = (p) => {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      let targetCitiesForDisplay = [];
      if (p.targeting === "city" && p.target_city) {
        try {
          const parsed = JSON.parse(p.target_city);
          targetCitiesForDisplay = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          targetCitiesForDisplay = [p.target_city];
        }
      }
      opportunities.push({
        id: p.id,
        content: p.content?.substring(0, 100) + (p.content?.length > 100 ? "..." : ""),
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
          avatar: p.avatar_base64 || p.author_avatar || getDefaultAvatar("default"),
          isVerified: !!p.is_verified
        },
        matchReason: p.is_promoted ? "promoted" : p.category && userInterests.includes(p.category) ? "interest" : "recent"
      });
    };
    filteredPromotedPosts.forEach(addPost);
    interestPosts.forEach(addPost);
    recentPosts.forEach(addPost);
    res.json(opportunities.slice(0, limit));
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0641\u0631\u0635", details: err.message });
  }
});
router6.get("/market-pulse/overview", optionalAuth, (_req, res) => {
  try {
    const activeAds = database_default.prepare("SELECT COUNT(*) as count FROM posts WHERE type = 'ad' AND status = 'active'").get();
    const newToday = database_default.prepare("SELECT COUNT(*) as count FROM posts WHERE type = 'ad' AND status = 'active' AND created_at >= datetime('now', '-1 day')").get();
    const newThisWeek = database_default.prepare("SELECT COUNT(*) as count FROM posts WHERE type = 'ad' AND status = 'active' AND created_at >= datetime('now', '-7 days')").get();
    const totalUsers = database_default.prepare("SELECT COUNT(*) as count FROM users WHERE is_deactivated = 0").get();
    const avgPrice = database_default.prepare("SELECT COALESCE(AVG(price), 0) as avg FROM posts WHERE type = 'ad' AND status = 'active' AND price > 0").get();
    const categoryDist = database_default.prepare(`
      SELECT category, COUNT(*) as count, COALESCE(AVG(price), 0) as avg_price, 
             COALESCE(MIN(price), 0) as min_price, COALESCE(MAX(price), 0) as max_price
      FROM posts WHERE type = 'ad' AND status = 'active' AND category != '' AND category IS NOT NULL
      GROUP BY category ORDER BY count DESC LIMIT 10
    `).all();
    const topAds = database_default.prepare(`
      SELECT p.id, p.content, p.image, p.price, p.category, p.location, p.reach_count, p.likes, p.created_at,
             u.name as author_name, u.avatar as author_avatar
      FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.type = 'ad' AND p.status = 'active'
      ORDER BY p.reach_count DESC, p.likes DESC LIMIT 5
    `).all();
    const supplyDemand = database_default.prepare(`
      SELECT category, 
        COUNT(*) as supply,
        COALESCE(SUM(likes), 0) as demand_score
      FROM posts WHERE type = 'ad' AND status = 'active' AND category != '' AND category IS NOT NULL
      GROUP BY category ORDER BY demand_score DESC LIMIT 6
    `).all();
    const priceRanges = database_default.prepare(`
      SELECT category,
        COUNT(*) as count,
        COALESCE(MIN(price), 0) as min_price,
        COALESCE(MAX(price), 0) as max_price,
        COALESCE(AVG(price), 0) as avg_price
      FROM posts WHERE type = 'ad' AND status = 'active' AND price > 0 AND category != '' AND category IS NOT NULL
      GROUP BY category ORDER BY count DESC LIMIT 8
    `).all();
    const weeklyActivity = database_default.prepare(`
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
      topAds: topAds.map((a) => ({
        id: a.id,
        content: a.content?.substring(0, 80) + (a.content?.length > 80 ? "..." : ""),
        image: a.image,
        price: a.price,
        category: a.category,
        location: a.location,
        reachCount: a.reach_count || 0,
        likes: a.likes || 0,
        authorName: a.author_name,
        authorAvatar: a.author_avatar,
        createdAt: a.created_at
      })),
      supplyDemand: supplyDemand.map((s) => ({
        category: s.category,
        supply: s.supply,
        demandScore: s.demand_score,
        ratio: s.supply > 0 ? Math.round(s.demand_score / s.supply * 10) / 10 : 0
      })),
      priceRanges: priceRanges.map((p) => ({
        category: p.category,
        count: p.count,
        minPrice: p.min_price,
        maxPrice: p.max_price,
        avgPrice: Math.round(p.avg_price)
      })),
      weeklyActivity
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0646\u0628\u0636 \u0627\u0644\u0633\u0648\u0642", details: err.message });
  }
});
router6.get("/notifications", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const notifications = database_default.prepare("SELECT id, type, message, post_id, user_id_ref, link, read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(payload.userId);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A", details: err.message });
  }
});
router6.post("/notifications/mark-read", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    database_default.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(payload.userId);
    res.json({ message: "\u062A\u0645 \u0642\u0631\u0627\u0621\u0629 \u062C\u0645\u064A\u0639 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A", details: err.message });
  }
});
router6.post("/notifications/:id/mark-read", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { id } = req.params;
    const result = database_default.prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?").run(id, payload.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: "\u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    res.json({ message: "\u062A\u0645 \u062A\u0639\u0644\u064A\u0645 \u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u0643\u0645\u0642\u0631\u0648\u0621" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0634\u0639\u0627\u0631", details: err.message });
  }
});
router6.delete("/notifications/:id", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { id } = req.params;
    const result = database_default.prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?").run(id, payload.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: "\u0627\u0644\u0625\u0634\u0639\u0627\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0625\u0634\u0639\u0627\u0631" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0625\u0634\u0639\u0627\u0631", details: err.message });
  }
});
router6.post("/promotions", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { postId, tier, price, packageName, duration, estimatedReach, maxNotifications, includeMessages, targeting, targetCity, targetCities, cityCount, cityTierLabel, targetInterests, targetAgeMin, targetAgeMax } = req.body;
    const post = database_default.prepare("SELECT * FROM posts WHERE id = ?").get(postId);
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (post.author_id !== payload.userId) {
      res.status(403).json({ error: "\u064A\u0645\u0643\u0646\u0643 \u062A\u0631\u0648\u064A\u062C \u0645\u0646\u0634\u0648\u0631\u0627\u062A\u0643 \u0641\u0642\u0637" });
      return;
    }
    const finalTargetCities = targetCities && Array.isArray(targetCities) && targetCities.length > 0 ? targetCities : targetCity ? [targetCity] : [];
    if (targeting === "city" && finalTargetCities.length === 0) {
      res.status(400).json({ error: "\u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062F \u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u062D\u062F\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0639\u0646\u062F \u062A\u0641\u0639\u064A\u0644 \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0644\u0645\u062F\u0646" });
      return;
    }
    if (targeting === "interests" && (!targetInterests || !Array.isArray(targetInterests) || targetInterests.length === 0)) {
      res.status(400).json({ error: "\u064A\u062C\u0628 \u062A\u062D\u062F\u064A\u062F \u0627\u0647\u062A\u0645\u0627\u0645 \u0648\u0627\u062D\u062F \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A" });
      return;
    }
    const user = database_default.prepare("SELECT name, avatar FROM users WHERE id = ?").get(payload.userId);
    const wallet = database_default.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(payload.userId);
    if (wallet.wallet_balance < price) {
      res.status(400).json({ error: "\u0631\u0635\u064A\u062F\u0643 \u063A\u064A\u0631 \u0643\u0627\u0641\u064D \u0644\u0644\u062A\u0631\u0648\u064A\u062C" });
      return;
    }
    database_default.prepare("UPDATE users SET wallet_balance = wallet_balance - ?, updated_at = datetime('now') WHERE id = ?").run(price, payload.userId);
    database_default.prepare("INSERT INTO transactions (user_id, type, amount, method, status) VALUES (?, ?, ?, ?, ?)").run(payload.userId, "promotion_debit", price, "\u0645\u062D\u0641\u0638\u0629", "completed");
    const promoId = crypto5.randomBytes(16).toString("hex").toLowerCase();
    const targetCitiesJson = JSON.stringify(finalTargetCities);
    const firstCity = finalTargetCities[0] || "";
    database_default.prepare(`INSERT INTO promotion_requests
      (id, post_id, post_content, author_id, author_name, author_avatar, tier, price, package_name, duration, estimated_reach, max_notifications, include_messages, targeting, target_city, target_interests, target_age_min, target_age_max, city_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      promoId,
      postId,
      post.content,
      payload.userId,
      user.name,
      user.avatar,
      tier,
      price,
      packageName,
      duration,
      estimatedReach,
      maxNotifications,
      includeMessages ? 1 : 0,
      targeting,
      targetCitiesJson,
      JSON.stringify(targetInterests || []),
      targetAgeMin || 0,
      targetAgeMax || 0,
      finalTargetCities.length
    );
    database_default.prepare(`UPDATE posts SET promotion_status = 'pending', promotion_tier = ?,
      targeting = ?, target_city = ?, target_interests = ?, target_age_min = ?, target_age_max = ?, updated_at = datetime('now') WHERE id = ?`).run(tier, targeting || "all", targetCitiesJson, JSON.stringify(targetInterests || []), targetAgeMin || 0, targetAgeMax || 0, postId);
    const createdRequest = database_default.prepare("SELECT * FROM promotion_requests WHERE id = ?").get(promoId);
    res.status(201).json({
      id: createdRequest?.id || promoId,
      message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u062A\u0631\u0648\u064A\u062C \u0628\u0646\u062C\u0627\u062D",
      request: createdRequest,
      targetCities: finalTargetCities,
      cityCount: finalTargetCities.length
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u062A\u0631\u0648\u064A\u062C", details: err.message });
  }
});
router6.get("/promotions/my-requests", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const requests = database_default.prepare("SELECT * FROM promotion_requests WHERE author_id = ? ORDER BY created_at DESC").all(payload.userId);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062A\u0631\u0648\u064A\u062C", details: err.message });
  }
});
router6.get("/friends/list", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const uid = payload.userId;
    const tableCheck = database_default.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='friendships'").get();
    if (!tableCheck) {
      res.json([]);
      return;
    }
    let friendships;
    try {
      friendships = database_default.prepare(`
        SELECT f.id, f.created_at, f.status,
          CASE WHEN f.requester_id = ? THEN u2.id ELSE u1.id END as friend_id,
          CASE WHEN f.requester_id = ? THEN u2.name ELSE u1.name END as friend_name,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.avatar ELSE u1.avatar END, '') as friend_avatar,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.avatar_base64 ELSE u1.avatar_base64 END, '') as friend_avatar_base64,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.is_verified ELSE u1.is_verified END, 0) as friend_is_verified,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.is_trusted ELSE u1.is_trusted END, 0) as friend_is_trusted,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.trust_score ELSE u1.trust_score END, 50) as friend_trust_score,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.location ELSE u1.location END, '') as friend_location,
          COALESCE(CASE WHEN f.requester_id = ? THEN u2.interests ELSE u1.interests END, '[]') as friend_interests
        FROM friendships f
        JOIN users u1 ON u1.id = f.requester_id
        JOIN users u2 ON u2.id = f.addressee_id
        WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
        ORDER BY f.created_at DESC
      `).all(uid, uid, uid, uid, uid, uid, uid, uid, uid, uid, uid, uid);
    } catch (queryErr) {
      try {
        friendships = database_default.prepare(`
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
      } catch (fallbackErr) {
        res.json([]);
        return;
      }
    }
    const friends = friendships.map((f) => ({
      id: f.friend_id,
      name: f.friend_name,
      avatar: f.friend_avatar_base64 || f.friend_avatar || getDefaultAvatar(f.friend_id, f.friend_gender),
      isVerified: !!f.friend_is_verified,
      isTrusted: !!f.friend_is_trusted,
      trustScore: f.friend_trust_score || 50,
      location: f.friend_location || "",
      interests: (() => {
        try {
          return JSON.parse(f.friend_interests || "[]");
        } catch {
          return [];
        }
      })(),
      friendSince: f.created_at,
      isOnline: req.app.locals?.wsManager?.isUserOnline(f.friend_id) || false
    }));
    res.json(friends);
  } catch (err) {
    res.json([]);
  }
});
router6.get("/friends/suggestions", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const user = database_default.prepare("SELECT interests FROM users WHERE id = ?").get(payload.userId);
    if (!user) {
      res.json([]);
      return;
    }
    const userInterests = (() => {
      try {
        return JSON.parse(user.interests || "[]");
      } catch {
        return [];
      }
    })();
    const existingFriends = database_default.prepare(`
      SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END as friend_id
      FROM friendships WHERE (requester_id = ? OR addressee_id = ?)
    `).all(payload.userId, payload.userId, payload.userId).map((r) => r.friend_id);
    const excludeIds = [...existingFriends, payload.userId];
    let suggestions = [];
    if (userInterests.length > 0) {
      for (const interest of userInterests) {
        const matches = database_default.prepare(`
          SELECT id, name, avatar, avatar_base64, is_verified, is_trusted, trust_score, location, interests
          FROM users WHERE id != ? AND is_deactivated = 0 AND interests LIKE ?
          ORDER BY trust_score DESC LIMIT 5
        `).all(payload.userId, `%"${interest}"%`);
        suggestions.push(...matches);
      }
    }
    if (suggestions.length < 5) {
      const moreUsers = database_default.prepare(`
        SELECT id, name, avatar, avatar_base64, is_verified, is_trusted, trust_score, location, interests
        FROM users WHERE id != ? AND is_deactivated = 0
        ORDER BY RANDOM() LIMIT 10
      `).all(payload.userId);
      suggestions.push(...moreUsers);
    }
    const seen = /* @__PURE__ */ new Set();
    const result = suggestions.filter((u) => {
      if (seen.has(u.id) || excludeIds.includes(u.id)) return false;
      seen.add(u.id);
      return true;
    }).slice(0, 10).map((u) => {
      let mutualCount = 0;
      try {
        mutualCount = database_default.prepare(`
          SELECT COUNT(*) as cnt FROM friendships f1
          JOIN friendships f2 ON (
            CASE WHEN f1.requester_id = ? THEN f1.addressee_id ELSE f1.requester_id END
            =
            CASE WHEN f2.requester_id = ? THEN f2.addressee_id ELSE f2.requester_id END
          )
          WHERE f1.status = 'accepted' AND f2.status = 'accepted'
            AND (f1.requester_id = ? OR f1.addressee_id = ?)
            AND (f2.requester_id = ? OR f2.addressee_id = ?)
        `).get(payload.userId, u.id, payload.userId, payload.userId, u.id, u.id)?.cnt || 0;
      } catch {
        mutualCount = 0;
      }
      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar_base64 || u.avatar || getDefaultAvatar(u.id, u.gender),
        isVerified: !!u.is_verified,
        isTrusted: !!u.is_trusted,
        trustScore: u.trust_score || 50,
        location: u.location || "",
        interests: JSON.parse(u.interests || "[]"),
        mutualFriends: mutualCount
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0627\u0642\u062A\u0631\u0627\u062D\u0627\u062A", details: err.message });
  }
});
router6.get("/friends/requests", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const requests = database_default.prepare(`
      SELECT f.id, f.status, f.created_at,
        u.id as user_id, u.name, u.avatar, u.avatar_base64, u.is_verified
      FROM friendships f
      JOIN users u ON u.id = f.requester_id
      WHERE f.addressee_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `).all(payload.userId);
    res.json(requests.map((r) => ({
      id: r.id,
      user: { id: r.user_id, name: r.name, avatar: r.avatar_base64 || r.avatar || getDefaultAvatar(r.user_id, r.gender), isVerified: !!r.is_verified },
      timestamp: r.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0635\u062F\u0627\u0642\u0629", details: err.message });
  }
});
router6.post("/friends/request", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    if (userId === payload.userId) {
      res.status(400).json({ error: "\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0635\u062F\u0627\u0642\u0629 \u0644\u0646\u0641\u0633\u0643" });
      return;
    }
    const targetUser = database_default.prepare("SELECT id FROM users WHERE id = ?").get(userId);
    if (!targetUser) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const existing = database_default.prepare("SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)").get(payload.userId, userId, userId, payload.userId);
    if (existing) {
      if (existing.status === "accepted") {
        res.status(400).json({ error: "\u0623\u0646\u062A\u0645\u0627 \u0623\u0635\u062F\u0642\u0627\u0621 \u0628\u0627\u0644\u0641\u0639\u0644" });
        return;
      }
      if (existing.status === "pending" && existing.requester_id === payload.userId) {
        res.status(400).json({ error: "\u0644\u0642\u062F \u0623\u0631\u0633\u0644\u062A \u0637\u0644\u0628\u0627\u064B \u0628\u0627\u0644\u0641\u0639\u0644" });
        return;
      }
      if (existing.status === "pending" && existing.addressee_id === payload.userId) {
        res.status(400).json({ error: "\u0644\u062F\u064A\u0643 \u0637\u0644\u0628 \u0635\u062F\u0627\u0642\u0629 \u0645\u0646 \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645" });
        return;
      }
    }
    database_default.prepare("INSERT OR IGNORE INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, ?)").run(payload.userId, userId, "pending");
    const sender = database_default.prepare("SELECT name, avatar, avatar_base64, is_verified FROM users WHERE id = ?").get(payload.userId);
    if (sender) {
      database_default.prepare("INSERT INTO notifications (user_id, type, message, user_id_ref) VALUES (?, ?, ?, ?)").run(userId, "friend", `\u0623\u0631\u0633\u0644 ${sender.name} \u0637\u0644\u0628 \u0635\u062F\u0627\u0642\u0629`, payload.userId);
    }
    try {
      const wsManager2 = req.app.locals.wsManager;
      if (wsManager2 && sender) {
        const friendship = database_default.prepare("SELECT id FROM friendships WHERE requester_id = ? AND addressee_id = ? AND status = ?").get(payload.userId, userId, "pending");
        wsManager2.emitFriendRequest(userId, {
          id: friendship?.id,
          user: {
            id: payload.userId,
            name: sender.name,
            avatar: sender.avatar_base64 || sender.avatar || "",
            isVerified: !!sender.is_verified
          },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        wsManager2.emitNotification(userId, {
          type: "friend",
          message: `\u0623\u0631\u0633\u0644 ${sender.name} \u0637\u0644\u0628 \u0635\u062F\u0627\u0642\u0629`,
          userId: payload.userId,
          link: `/user/${payload.userId}`,
          time: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    } catch (wsErr) {
      console.error("[WS] Failed to emit friend request:", wsErr.message);
    }
    res.json({ message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u0635\u062F\u0627\u0642\u0629" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u0635\u062F\u0627\u0642\u0629", details: err.message });
  }
});
router6.post("/friends/accept/:id", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const friendship = database_default.prepare("SELECT * FROM friendships WHERE id = ? AND addressee_id = ?").get(req.params.id, payload.userId);
    if (!friendship) {
      res.status(404).json({ error: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    database_default.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(req.params.id);
    const accepter = database_default.prepare("SELECT name, avatar, avatar_base64 FROM users WHERE id = ?").get(payload.userId);
    if (accepter) {
      database_default.prepare("INSERT INTO notifications (user_id, type, message, user_id_ref) VALUES (?, ?, ?, ?)").run(friendship.requester_id, "friend", `\u0642\u0628\u0644 ${accepter.name} \u0637\u0644\u0628 \u0627\u0644\u0635\u062F\u0627\u0642\u0629`, payload.userId);
    }
    try {
      const wsManager2 = req.app.locals.wsManager;
      if (wsManager2) {
        wsManager2.emitFriendAccepted(friendship.requester_id, {
          friendshipId: req.params.id,
          user: {
            id: payload.userId,
            name: accepter?.name || "",
            avatar: accepter?.avatar_base64 || accepter?.avatar || ""
          }
        });
        wsManager2.emitNotification(friendship.requester_id, {
          type: "friend",
          message: `\u0642\u0628\u0644 ${accepter?.name || ""} \u0637\u0644\u0628 \u0627\u0644\u0635\u062F\u0627\u0642\u0629`,
          userId: payload.userId,
          link: `/user/${payload.userId}`,
          time: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    } catch (wsErr) {
      console.error("[WS] Failed to emit friend accepted:", wsErr.message);
    }
    res.json({ message: "\u062A\u0645 \u0642\u0628\u0648\u0644 \u0637\u0644\u0628 \u0627\u0644\u0635\u062F\u0627\u0642\u0629" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0642\u0628\u0648\u0644 \u0627\u0644\u0635\u062F\u0627\u0642\u0629", details: err.message });
  }
});
router6.post("/friends/reject/:id", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    database_default.prepare("UPDATE friendships SET status = 'rejected' WHERE id = ? AND addressee_id = ?").run(req.params.id, payload.userId);
    res.json({ message: "\u062A\u0645 \u0631\u0641\u0636 \u0637\u0644\u0628 \u0627\u0644\u0635\u062F\u0627\u0642\u0629" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0631\u0641\u0636 \u0627\u0644\u0635\u062F\u0627\u0642\u0629", details: err.message });
  }
});
router6.get("/friends/sent", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const sent = database_default.prepare(`
      SELECT f.id, f.status, f.created_at,
        u.id as user_id, u.name, u.avatar, u.avatar_base64, u.is_verified
      FROM friendships f
      JOIN users u ON u.id = f.addressee_id
      WHERE f.requester_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `).all(payload.userId);
    res.json(sent.map((r) => ({
      id: r.id,
      user: { id: r.user_id, name: r.name, avatar: r.avatar_base64 || r.avatar || getDefaultAvatar(r.user_id, r.gender), isVerified: !!r.is_verified },
      timestamp: r.created_at
    })));
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0631\u0633\u0644\u0629", details: err.message });
  }
});
router6.post("/friends/cancel/:id", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const result = database_default.prepare("DELETE FROM friendships WHERE id = ? AND requester_id = ? AND status = 'pending'").run(req.params.id, payload.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: "\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0644\u063A\u0627\u0624\u0647" });
      return;
    }
    res.json({ message: "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0637\u0644\u0628 \u0627\u0644\u0635\u062F\u0627\u0642\u0629" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0644\u063A\u0627\u0621 \u0637\u0644\u0628 \u0627\u0644\u0635\u062F\u0627\u0642\u0629", details: err.message });
  }
});
router6.post("/friends/unfriend/:friendshipId", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const result = database_default.prepare("DELETE FROM friendships WHERE id = ? AND status = 'accepted' AND (requester_id = ? OR addressee_id = ?)").run(req.params.friendshipId, payload.userId, payload.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: "\u0627\u0644\u0635\u062F\u0627\u0642\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629" });
      return;
    }
    res.json({ message: "\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0635\u062F\u0627\u0642\u0629" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0635\u062F\u0627\u0642\u0629", details: err.message });
  }
});
router6.get("/friends/status/:userId", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    const friendship = database_default.prepare(`
      SELECT status FROM friendships
      WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
    `).get(payload.userId, userId, userId, payload.userId);
    const targetUser = database_default.prepare("SELECT last_seen_at FROM users WHERE id = ?").get(userId);
    res.json({ friendshipStatus: friendship?.status || null, lastSeenAt: targetUser?.last_seen_at || null });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u062D\u0627\u0644\u0629 \u0627\u0644\u0635\u062F\u0627\u0642\u0629", details: err.message });
  }
});
router6.get("/users/search", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { q } = req.query;
    if (!q || q.length < 1) {
      res.json([]);
      return;
    }
    const search = `%${q}%`;
    const users = database_default.prepare(`
      SELECT id, name, avatar, avatar_base64, is_verified, is_trusted, trust_score, location, interests, phone, show_phone
      FROM users
      WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ?) AND id != ? AND is_deactivated = 0
      ORDER BY is_verified DESC, trust_score DESC
      LIMIT 20
    `).all(search, search, search, payload.userId);
    const enriched = users.map((u) => {
      const friendship = database_default.prepare(`
        SELECT status FROM friendships
        WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
      `).get(payload.userId, u.id, u.id, payload.userId);
      const result = {
        id: u.id,
        name: u.name,
        avatar: u.avatar_base64 || u.avatar || getDefaultAvatar(u.id, u.gender),
        is_verified: !!u.is_verified,
        is_trusted: !!u.is_trusted,
        trustScore: u.trust_score || 50,
        location: u.location || "",
        interests: JSON.parse(u.interests || "[]"),
        friendshipStatus: friendship?.status || null
      };
      if (u.phone && u.show_phone) result.phone = u.phone;
      delete result.show_phone;
      return result;
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0627\u0644\u0628\u062D\u062B", details: err.message });
  }
});
router6.get("/users/:id", optionalAuth, (req, res) => {
  try {
    const user = database_default.prepare(`
      SELECT id, name, avatar, avatar_base64, is_verified, is_trusted, trust_score, location, bio,
        cover_photo, interests, join_date, show_phone, show_location, phone, gender, last_seen_at
      FROM users WHERE id = ? AND is_deactivated = 0
    `).get(req.params.id);
    if (!user) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    user.interests = JSON.parse(user.interests || "[]");
    user.is_verified = !!user.is_verified;
    user.is_trusted = !!user.is_trusted;
    if (user.avatar_base64) user.avatar = user.avatar_base64;
    delete user.avatar_base64;
    if (!user.show_phone) delete user.phone;
    if (!user.show_location) delete user.location;
    const posts = database_default.prepare("SELECT * FROM posts WHERE author_id = ? AND status = ? ORDER BY created_at DESC LIMIT 10").all(req.params.id, "active");
    res.json({ ...user, posts });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A", details: err.message });
  }
});
router6.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString(), database: "connected" });
});
router6.get("/smart-reach/stats", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const stats = database_default.prepare(`
      SELECT 
        COALESCE(SUM(reach_count), 0) as total_reach,
        COALESCE(SUM(click_count), 0) as total_clicks,
        COUNT(CASE WHEN is_promoted = 1 THEN 1 END) as promoted_count,
        COUNT(*) as total_posts
      FROM posts WHERE author_id = ? AND status = 'active'
    `).get(payload.userId);
    res.json({
      totalReach: stats.total_reach || 0,
      totalClicks: stats.total_clicks || 0,
      promotedCount: stats.promoted_count || 0,
      totalPosts: stats.total_posts || 0
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0648\u0635\u0648\u0644", details: err.message });
  }
});
router6.post("/posts/:id/share", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { platform } = req.body;
    const postId = req.params.id;
    if (!platform) {
      res.status(400).json({ error: "\u0627\u0644\u0645\u0646\u0635\u0629 \u0645\u0637\u0644\u0648\u0628\u0629" });
      return;
    }
    const validPlatforms = ["internal", "whatsapp", "telegram", "facebook", "twitter", "link", "smart_link"];
    if (!validPlatforms.includes(platform)) {
      res.status(400).json({ error: "\u0645\u0646\u0635\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      return;
    }
    const post = database_default.prepare("SELECT id, author_id, shares FROM posts WHERE id = ? AND status = ?").get(postId, "active");
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    database_default.prepare("UPDATE posts SET shares = COALESCE(shares, 0) + 1, updated_at = datetime('now') WHERE id = ?").run(postId);
    const shareId = crypto5.randomBytes(16).toString("hex").toLowerCase();
    database_default.prepare("INSERT INTO share_events (id, post_id, user_id, platform) VALUES (?, ?, ?, ?)").run(shareId, postId, payload.userId, platform);
    if (platform === "internal" && post.author_id && post.author_id !== payload.userId) {
      const sharer = database_default.prepare("SELECT name FROM users WHERE id = ?").get(payload.userId);
      if (sharer) {
        database_default.prepare("INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)").run(post.author_id, "share", `\u0634\u0627\u0631\u0643 ${sharer.name} \u0645\u0646\u0634\u0648\u0631\u0643`, `/post/${postId}`);
      }
    }
    const totalShares = (post.shares || 0) + 1;
    res.json({ message: "\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629", totalShares });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629", details: err.message });
  }
});
router6.get("/posts/:id/share-stats", (req, res) => {
  try {
    const postId = req.params.id;
    const post = database_default.prepare("SELECT id, shares FROM posts WHERE id = ?").get(postId);
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const total = post.shares || 0;
    const byPlatformRows = database_default.prepare("SELECT platform, COUNT(*) as count FROM share_events WHERE post_id = ? GROUP BY platform").all(postId);
    const byPlatform = {};
    for (const row of byPlatformRows) {
      byPlatform[row.platform] = row.count;
    }
    const recentShares = database_default.prepare(`
      SELECT se.platform, se.shared_at, u.name as user_name, u.avatar as user_avatar
      FROM share_events se
      JOIN users u ON u.id = se.user_id
      WHERE se.post_id = ?
      ORDER BY se.shared_at DESC
      LIMIT 10
    `).all(postId);
    res.json({ total, byPlatform, recentShares });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629", details: err.message });
  }
});
router6.get("/smart-link/:postId", optionalAuth, (req, res) => {
  try {
    const post = database_default.prepare("SELECT id, author_id, reach_count, is_promoted FROM posts WHERE id = ? AND status = ?").get(req.params.postId, "active");
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    database_default.prepare("UPDATE posts SET reach_count = COALESCE(reach_count, 0) + 1, click_count = COALESCE(click_count, 0) + 1, updated_at = datetime('now') WHERE id = ?").run(req.params.postId);
    const visitorId = req.user ? req.user.userId : null;
    const visitorIp = req.ip || req.headers["x-forwarded-for"] || "";
    const userAgent = req.headers["user-agent"] || "";
    const referrer = req.headers["referer"] || "";
    const visitId = crypto5.randomBytes(16).toString("hex").toLowerCase();
    try {
      database_default.prepare("INSERT INTO smart_link_visits (id, post_id, visitor_id, visitor_ip, user_agent, referrer) VALUES (?, ?, ?, ?, ?, ?)").run(visitId, req.params.postId, visitorId, typeof visitorIp === "string" ? visitorIp : "", userAgent, referrer);
    } catch {
    }
    if (post.is_promoted && post.author_id) {
      const recentNotifCount = database_default.prepare(`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ? AND type = 'promotion' AND created_at >= datetime('now', '-1 hour')
      `).get(post.author_id);
      if (recentNotifCount.count < 5) {
        database_default.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)").run(post.author_id, "promotion", `\u062D\u0635\u0644 \u0645\u0646\u0634\u0648\u0631\u0643 \u0639\u0644\u0649 \u0632\u064A\u0627\u0631\u0629 \u062C\u062F\u064A\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u0648\u0635\u0644 \u0627\u0644\u0630\u0643\u064A (\u0625\u062C\u0645\u0627\u0644\u064A: ${(post.reach_count || 0) + 1})`);
      }
    }
    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3e3}`;
    res.redirect(`${appUrl}/#/post/${req.params.postId}`);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0648\u062C\u064A\u0647", details: err.message });
  }
});
router6.post("/smart-link/generate", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { postId, alias } = req.body;
    if (!postId || !alias) {
      res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0648\u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u062E\u0635\u0635 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
      res.status(400).json({ error: "\u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u062E\u0635\u0635 \u064A\u062C\u0628 \u0623\u0646 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062D\u0631\u0648\u0641 \u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 \u0648\u0623\u0631\u0642\u0627\u0645 \u0641\u0642\u0637" });
      return;
    }
    if (alias.length < 3 || alias.length > 50) {
      res.status(400).json({ error: "\u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u062E\u0635\u0635 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0628\u064A\u0646 3 \u0648 50 \u062D\u0631\u0641" });
      return;
    }
    const post = database_default.prepare("SELECT id, author_id FROM posts WHERE id = ? AND status = ?").get(postId, "active");
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (post.author_id !== payload.userId) {
      res.status(403).json({ error: "\u064A\u0645\u0643\u0646\u0643 \u0625\u0646\u0634\u0627\u0621 \u0631\u0627\u0628\u0637 \u0630\u0643\u064A \u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A\u0643 \u0641\u0642\u0637" });
      return;
    }
    const existingAlias = database_default.prepare("SELECT id FROM posts WHERE smart_link_alias = ? AND id != ?").get(alias, postId);
    if (existingAlias) {
      res.status(409).json({ error: "\u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u062E\u0635\u0635 \u0645\u0633\u062A\u062E\u062F\u0645 \u0628\u0627\u0644\u0641\u0639\u0644" });
      return;
    }
    database_default.prepare("UPDATE posts SET smart_link_alias = ?, updated_at = datetime('now') WHERE id = ?").run(alias, postId);
    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3e3}`;
    const url = `${appUrl}/api/smart-link/a/${alias}`;
    res.json({ url, alias });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0630\u0643\u064A", details: err.message });
  }
});
router6.get("/smart-link/:postId/stats", authMiddleware, (req, res) => {
  try {
    const postId = req.params.postId;
    const post = database_default.prepare("SELECT id FROM posts WHERE id = ?").get(postId);
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const totalVisitsRow = database_default.prepare("SELECT COUNT(*) as count FROM smart_link_visits WHERE post_id = ?").get(postId);
    const totalVisits = totalVisitsRow?.count || 0;
    const uniqueVisitorsRow = database_default.prepare("SELECT COUNT(DISTINCT COALESCE(visitor_id, visitor_ip)) as count FROM smart_link_visits WHERE post_id = ?").get(postId);
    const uniqueVisitors = uniqueVisitorsRow?.count || 0;
    const visitsByDate = database_default.prepare(`
      SELECT DATE(visited_at) as date, COUNT(*) as count
      FROM smart_link_visits
      WHERE post_id = ? AND visited_at >= datetime('now', '-7 days')
      GROUP BY DATE(visited_at)
      ORDER BY date ASC
    `).all(postId);
    const recentVisitors = database_default.prepare(`
      SELECT sv.visitor_id, sv.visitor_ip, sv.user_agent, sv.referrer, sv.visited_at,
             u.name as visitor_name, u.avatar as visitor_avatar
      FROM smart_link_visits sv
      LEFT JOIN users u ON u.id = sv.visitor_id
      WHERE sv.post_id = ?
      ORDER BY sv.visited_at DESC
      LIMIT 10
    `).all(postId);
    res.json({ totalVisits, uniqueVisitors, visitsByDate, recentVisitors });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0648\u0635\u0644 \u0627\u0644\u0630\u0643\u064A", details: err.message });
  }
});
router6.get("/smart-link/a/:alias", optionalAuth, (req, res) => {
  try {
    const post = database_default.prepare("SELECT id, author_id, reach_count, is_promoted FROM posts WHERE smart_link_alias = ? AND status = ?").get(req.params.alias, "active");
    if (!post) {
      res.status(404).json({ error: "\u0627\u0644\u0631\u0627\u0628\u0637 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    database_default.prepare("UPDATE posts SET reach_count = COALESCE(reach_count, 0) + 1, click_count = COALESCE(click_count, 0) + 1, updated_at = datetime('now') WHERE id = ?").run(post.id);
    const visitorId = req.user ? req.user.userId : null;
    const visitorIp = req.ip || req.headers["x-forwarded-for"] || "";
    const userAgent = req.headers["user-agent"] || "";
    const referrer = req.headers["referer"] || "";
    const visitId = crypto5.randomBytes(16).toString("hex").toLowerCase();
    try {
      database_default.prepare("INSERT INTO smart_link_visits (id, post_id, visitor_id, visitor_ip, user_agent, referrer) VALUES (?, ?, ?, ?, ?, ?)").run(visitId, post.id, visitorId, typeof visitorIp === "string" ? visitorIp : "", userAgent, referrer);
    } catch {
    }
    if (post.is_promoted && post.author_id) {
      const recentNotifCount = database_default.prepare(`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ? AND type = 'promotion' AND created_at >= datetime('now', '-1 hour')
      `).get(post.author_id);
      if (recentNotifCount.count < 5) {
        database_default.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)").run(post.author_id, "promotion", `\u062D\u0635\u0644 \u0645\u0646\u0634\u0648\u0631\u0643 \u0639\u0644\u0649 \u0632\u064A\u0627\u0631\u0629 \u062C\u062F\u064A\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u0648\u0635\u0644 \u0627\u0644\u0630\u0643\u064A (\u0625\u062C\u0645\u0627\u0644\u064A: ${(post.reach_count || 0) + 1})`);
      }
    }
    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3e3}`;
    res.redirect(`${appUrl}/#/post/${post.id}`);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0648\u062C\u064A\u0647", details: err.message });
  }
});
router6.get("/market-live/:videoId/comments", optionalAuth, (req, res) => {
  try {
    const { videoId } = req.params;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 10);
    const offset = (page - 1) * limit;
    const comments = database_default.prepare(`
      SELECT c.id, c.text, c.created_at,
             u.id as user_id, u.name as user_name, u.avatar as user_avatar, u.avatar_base64
      FROM video_comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.video_id = ? AND c.status = 'active'
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(videoId, limit, offset).map((c) => ({
      id: c.id,
      text: c.text,
      createdAt: c.created_at,
      userId: c.user_id,
      userName: c.user_name,
      userAvatar: c.avatar_base64 || c.user_avatar
    }));
    res.json({ comments, page, hasMore: comments.length === limit });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A", details: err.message });
  }
});
router6.post("/market-live/:videoId/comments", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { videoId } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      res.status(400).json({ error: "\u0627\u0644\u062A\u0639\u0644\u064A\u0642 \u0641\u0627\u0631\u063A" });
      return;
    }
    const video = database_default.prepare("SELECT * FROM ad_videos WHERE id = ? AND status = ?").get(videoId, "active");
    if (!video) {
      res.status(404).json({ error: "\u0627\u0644\u0641\u064A\u062F\u064A\u0648 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const commentId = crypto5.randomBytes(16).toString("hex").toLowerCase();
    database_default.prepare("INSERT INTO video_comments (id, video_id, user_id, text) VALUES (?, ?, ?, ?)").run(commentId, videoId, payload.userId, text.trim());
    const commenter = database_default.prepare("SELECT name, avatar, avatar_base64 FROM users WHERE id = ?").get(payload.userId);
    if (commenter && video.user_id !== payload.userId) {
      database_default.prepare("INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)").run(video.user_id, "market", `\u0639\u0644\u0642 ${commenter.name} \u0639\u0644\u0649 \u0641\u064A\u062F\u064A\u0648 \u0625\u0639\u0644\u0627\u0646\u0643`, `/market/listing/${video.post_id}`);
    }
    const comment = {
      id: commentId,
      text: text.trim(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      userId: payload.userId,
      userName: commenter?.name || "",
      userAvatar: commenter?.avatar_base64 || commenter?.avatar || ""
    };
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0642", details: err.message });
  }
});
router6.get("/market-live/stats", optionalAuth, (_req, res) => {
  try {
    const totalVideos = database_default.prepare("SELECT COUNT(*) as count FROM ad_videos WHERE status = 'active'").get();
    const totalViews = database_default.prepare("SELECT COALESCE(SUM(views), 0) as total FROM ad_videos WHERE status = 'active'").get();
    const todayVideos = database_default.prepare("SELECT COUNT(*) as count FROM ad_videos WHERE status = 'active' AND created_at >= datetime('now', '-1 day')").get();
    const categoryDist = database_default.prepare(`
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
      categoryDist
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0633\u0648\u0642", details: err.message });
  }
});
router6.post("/livestream/notify-friends", authMiddleware, (req, res) => {
  try {
    const uid = req.user?.userId;
    if (!uid) {
      res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
      return;
    }
    const { streamTitle } = req.body || {};
    const hostName = database_default.prepare("SELECT name FROM users WHERE id = ?").get(uid)?.name || "\u0645\u0633\u062A\u062E\u062F\u0645";
    const message = `${hostName} \u0628\u062F\u0623 \u0628\u062B\u0627\u064B \u0645\u0628\u0627\u0634\u0631\u0627\u064B${streamTitle ? ": " + streamTitle : ""}! \u0634\u0627\u0647\u062F \u0627\u0644\u0622\u0646`;
    const friends = database_default.prepare(`
      SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END as friend_id
      FROM friendships
      WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'
    `).all(uid, uid, uid);
    const insertNotif = database_default.prepare("INSERT INTO notifications (user_id, type, message, link, user_id_ref) VALUES (?, ?, ?, ?, ?)");
    let count = 0;
    for (const friend of friends) {
      try {
        insertNotif.run(friend.friend_id, "livestream", message, `/live-stream/${uid}`, uid);
        count++;
      } catch {
      }
    }
    res.json({ success: true, notifiedFriends: count });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u0628\u062B", details: err.message });
  }
});
router6.get("/livestream/active", authMiddleware, (req, res) => {
  try {
    const wsManager2 = req.app.locals.wsManager;
    if (!wsManager2 || !wsManager2.activeStreams) {
      res.json([]);
      return;
    }
    const activeStreamers = Array.from(wsManager2.activeStreams.values());
    res.json(activeStreamers);
  } catch (err) {
    res.json([]);
  }
});
var api_default = router6;

// src/routes/market.ts
import { Router as Router7 } from "express";
init_auth();
var router7 = Router7();
try {
  database_default.exec(`
    CREATE TABLE IF NOT EXISTS market_listings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      seller_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      images TEXT DEFAULT '[]',
      price REAL,
      currency TEXT DEFAULT '\u062C.\u0645',
      category TEXT NOT NULL DEFAULT '',
      subcategory TEXT DEFAULT '',
      condition TEXT DEFAULT 'used',
      location TEXT DEFAULT '',
      city TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      whatsapp TEXT DEFAULT '',
      payment_methods TEXT DEFAULT '[]',
      is_featured INTEGER DEFAULT 0,
      is_promoted INTEGER DEFAULT 0,
      promotion_status TEXT,
      promotion_tier TEXT,
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

    CREATE TABLE IF NOT EXISTS market_listing_saves (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id),
      listing_id TEXT NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, listing_id)
    );

    CREATE TABLE IF NOT EXISTS market_promotion_requests (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      listing_id TEXT NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
      seller_id TEXT NOT NULL REFERENCES users(id),
      listing_title TEXT NOT NULL,
      tier TEXT NOT NULL,
      package_name TEXT,
      duration INTEGER,
      estimated_reach INTEGER,
      price REAL NOT NULL,
      targeting TEXT DEFAULT 'all',
      target_city TEXT DEFAULT '',
      target_interests TEXT DEFAULT '[]',
      target_age_min INTEGER DEFAULT 0,
      target_age_max INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_market_listings_seller ON market_listings(seller_id);
    CREATE INDEX IF NOT EXISTS idx_market_listings_status ON market_listings(status);
    CREATE INDEX IF NOT EXISTS idx_market_listings_category ON market_listings(category);
    CREATE INDEX IF NOT EXISTS idx_market_listings_city ON market_listings(city);
    CREATE INDEX IF NOT EXISTS idx_market_listings_promoted ON market_listings(is_promoted);
    CREATE INDEX IF NOT EXISTS idx_market_listing_saves_listing ON market_listing_saves(listing_id);
    CREATE INDEX IF NOT EXISTS idx_market_listing_saves_user ON market_listing_saves(user_id);
    CREATE INDEX IF NOT EXISTS idx_market_promotion_requests_seller ON market_promotion_requests(seller_id);
  `);
} catch {
}
function parseListing(row) {
  if (!row) return null;
  let images = [];
  try {
    const parsed = JSON.parse(row.images || "[]");
    if (Array.isArray(parsed)) images = parsed;
  } catch {
    images = [];
  }
  let paymentMethods = [];
  try {
    const parsed = JSON.parse(row.payment_methods || "[]");
    if (Array.isArray(parsed)) paymentMethods = parsed;
  } catch {
    paymentMethods = [];
  }
  let targetInterests = [];
  try {
    const parsed = JSON.parse(row.target_interests || "[]");
    if (Array.isArray(parsed)) targetInterests = parsed;
  } catch {
    targetInterests = [];
  }
  return {
    ...row,
    images,
    payment_methods: paymentMethods,
    target_interests: targetInterests,
    is_promoted: !!row.is_promoted
  };
}
function attachSeller(listing) {
  if (!listing || !listing.seller_id) return { ...listing, seller: null };
  try {
    const seller = database_default.prepare("SELECT id, name, avatar, avatar_base64, is_verified, is_trusted, trust_score FROM users WHERE id = ?").get(listing.seller_id);
    if (seller) {
      seller.is_verified = !!seller.is_verified;
      seller.is_trusted = !!seller.is_trusted;
      if (seller.avatar_base64) seller.avatar = seller.avatar_base64;
      delete seller.avatar_base64;
    }
    return { ...listing, seller };
  } catch {
    return { ...listing, seller: { id: listing.seller_id, name: "\u0645\u0633\u062A\u062E\u062F\u0645", avatar: getDefaultAvatar(listing.seller_id), is_verified: false, is_trusted: false, trust_score: 50 } };
  }
}
router7.get("/listings", optionalAuth, (req, res) => {
  try {
    try {
      database_default.prepare(`
        UPDATE market_listings SET is_promoted = 0, promotion_status = 'expired', updated_at = datetime('now')
        WHERE is_promoted = 1 AND promotion_expires_at IS NOT NULL AND promotion_expires_at < datetime('now')
      `).run();
    } catch {
    }
    const { category, city, condition, min_price, max_price, search, sort, page = "1", limit = "20" } = req.query;
    const userId = req.user?.userId || null;
    let userLocation = "";
    let userInterests = [];
    let userAge = 0;
    if (userId) {
      try {
        const userInfo = database_default.prepare("SELECT location, interests, date_of_birth FROM users WHERE id = ?").get(userId);
        if (userInfo) {
          userLocation = userInfo.location || "";
          try {
            userInterests = JSON.parse(userInfo.interests || "[]");
          } catch {
            userInterests = [];
          }
          if (userInfo.date_of_birth) {
            const birthDate = new Date(userInfo.date_of_birth);
            const today = /* @__PURE__ */ new Date();
            userAge = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || monthDiff === 0 && today.getDate() < birthDate.getDate()) {
              userAge--;
            }
          }
        }
      } catch {
      }
    }
    let query = "SELECT * FROM market_listings WHERE status = ?";
    const params = ["active"];
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    if (city) {
      query += " AND city = ?";
      params.push(city);
    }
    if (condition) {
      query += " AND condition = ?";
      params.push(condition);
    }
    if (min_price) {
      query += " AND price >= ?";
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      query += " AND price <= ?";
      params.push(parseFloat(max_price));
    }
    if (search) {
      query += " AND (title LIKE ? OR description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    switch (sort) {
      case "cheapest":
        query += " ORDER BY is_promoted DESC, price ASC";
        break;
      case "expensive":
        query += " ORDER BY is_promoted DESC, price DESC";
        break;
      case "featured":
        query += " ORDER BY is_promoted DESC, saves_count DESC, views_count DESC";
        break;
      case "newest":
      default:
        query += " ORDER BY is_promoted DESC, created_at DESC";
        break;
    }
    const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as count");
    const totalResult = database_default.prepare(countQuery).get(...params);
    const total = totalResult?.count || 0;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);
    const rawListings = database_default.prepare(query).all(...params);
    const filteredListings = rawListings.map((row) => {
      try {
        const parsed = parseListing(row);
        if (!parsed) return null;
        if (parsed.is_promoted && parsed.promotion_tier) {
          const targeting = parsed.targeting || "all";
          if (targeting === "city" && parsed.target_city) {
            let targetCities = [];
            try {
              const parsedCities = JSON.parse(parsed.target_city);
              if (Array.isArray(parsedCities)) targetCities = parsedCities;
            } catch {
              if (parsed.target_city) targetCities = [parsed.target_city];
            }
            if (userId && userLocation && targetCities.length > 0) {
              const cityMatch = targetCities.some(
                (tc) => userLocation.includes(tc) || tc.includes(userLocation)
              );
              if (!cityMatch) return null;
            }
          }
          if (targeting === "interests" && parsed.target_interests && parsed.target_interests.length > 0) {
            if (userId && userInterests.length > 0) {
              const hasMatch = parsed.target_interests.some(
                (interest) => userInterests.includes(interest)
              );
              if (!hasMatch) return null;
            }
          }
          if (parsed.target_age_min && parsed.target_age_max && parsed.target_age_min > 0 && parsed.target_age_max > 0) {
            if (userId && userAge > 0) {
              if (userAge < parsed.target_age_min || userAge > parsed.target_age_max) {
                return null;
              }
            }
          }
        }
        return attachSeller(parsed);
      } catch {
        return null;
      }
    }).filter(Boolean);
    const categories = database_default.prepare(`
      SELECT category, COUNT(*) as count
      FROM market_listings
      WHERE status = 'active' AND category != '' AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `).all();
    res.json({ listings: filteredListings, total, page: parseInt(page), categories });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A", details: err.message });
  }
});
router7.get("/listings/:id", optionalAuth, (req, res) => {
  try {
    const listing = database_default.prepare("SELECT * FROM market_listings WHERE id = ? AND status = ?").get(req.params.id, "active");
    if (!listing) {
      res.status(404).json({ error: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    try {
      database_default.prepare("UPDATE market_listings SET views_count = views_count + 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
      if (listing.is_promoted) {
        database_default.prepare("UPDATE market_listings SET reach_count = reach_count + 1 WHERE id = ?").run(req.params.id);
      }
    } catch {
    }
    const parsed = parseListing(listing);
    const result = attachSeller(parsed);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0625\u0639\u0644\u0627\u0646", details: err.message });
  }
});
router7.post("/listings", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { title, description, images, category, price, currency, condition, location, city, phone, whatsapp, payment_methods } = req.body;
    if (!title) {
      res.status(400).json({ error: "\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    if (!description) {
      res.status(400).json({ error: "\u0648\u0635\u0641 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    if (!category) {
      res.status(400).json({ error: "\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    database_default.prepare(`
      INSERT INTO market_listings (seller_id, title, description, images, price, currency, category, subcategory, condition, location, city, phone, whatsapp, payment_methods)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.userId,
      title,
      description,
      JSON.stringify(images || []),
      price || null,
      currency || "\u062C.\u0645",
      category,
      req.body.subcategory || "",
      condition || "new",
      location || "",
      city || "",
      phone || "",
      whatsapp || "",
      JSON.stringify(payment_methods || [])
    );
    const listing = database_default.prepare("SELECT * FROM market_listings WHERE seller_id = ? ORDER BY created_at DESC LIMIT 1").get(payload.userId);
    res.status(201).json(attachSeller(parseListing(listing)));
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0625\u0639\u0644\u0627\u0646", details: err.message });
  }
});
router7.put("/listings/:id", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const listing = database_default.prepare("SELECT * FROM market_listings WHERE id = ?").get(req.params.id);
    if (!listing) {
      res.status(404).json({ error: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (listing.seller_id !== payload.userId && !payload.isAdmin) {
      res.status(403).json({ error: "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u062A\u0639\u062F\u064A\u0644 \u0647\u0630\u0627 \u0627\u0644\u0625\u0639\u0644\u0627\u0646" });
      return;
    }
    const allowed = ["title", "description", "images", "price", "currency", "category", "subcategory", "condition", "location", "city", "phone", "whatsapp", "payment_methods", "status"];
    const updates = [];
    const values = [];
    for (const key of allowed) {
      if (req.body[key] !== void 0) {
        updates.push(`${key} = ?`);
        values.push(typeof req.body[key] === "object" ? JSON.stringify(req.body[key]) : req.body[key]);
      }
    }
    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(req.params.id);
      database_default.prepare(`UPDATE market_listings SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }
    const updated = database_default.prepare("SELECT * FROM market_listings WHERE id = ?").get(req.params.id);
    res.json(attachSeller(parseListing(updated)));
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0625\u0639\u0644\u0627\u0646", details: err.message });
  }
});
router7.delete("/listings/:id", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const listing = database_default.prepare("SELECT * FROM market_listings WHERE id = ?").get(req.params.id);
    if (!listing) {
      res.status(404).json({ error: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (listing.seller_id !== payload.userId && !payload.isAdmin) {
      res.status(403).json({ error: "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u062D\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0625\u0639\u0644\u0627\u0646" });
      return;
    }
    database_default.prepare("UPDATE market_listings SET status = 'deleted', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ message: "\u062A\u0645 \u062D\u0630\u0641 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0628\u0646\u062C\u0627\u062D" });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0630\u0641 \u0627\u0644\u0625\u0639\u0644\u0627\u0646", details: err.message });
  }
});
router7.post("/listings/:id/save", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const listing = database_default.prepare("SELECT * FROM market_listings WHERE id = ?").get(req.params.id);
    if (!listing) {
      res.status(404).json({ error: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    const existing = database_default.prepare("SELECT id FROM market_listing_saves WHERE listing_id = ? AND user_id = ?").get(req.params.id, payload.userId);
    if (existing) {
      database_default.prepare("DELETE FROM market_listing_saves WHERE id = ?").run(existing.id);
      database_default.prepare("UPDATE market_listings SET saves_count = MAX(0, saves_count - 1), updated_at = datetime('now') WHERE id = ?").run(req.params.id);
      const updated = database_default.prepare("SELECT saves_count FROM market_listings WHERE id = ?").get(req.params.id);
      res.json({ saved: false, savesCount: updated?.saves_count || 0 });
    } else {
      database_default.prepare("INSERT INTO market_listing_saves (listing_id, user_id) VALUES (?, ?)").run(req.params.id, payload.userId);
      database_default.prepare("UPDATE market_listings SET saves_count = saves_count + 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
      const updated = database_default.prepare("SELECT saves_count FROM market_listings WHERE id = ?").get(req.params.id);
      res.json({ saved: true, savesCount: updated?.saves_count || 1 });
    }
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u0644\u0627\u0646", details: err.message });
  }
});
router7.get("/saved", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const savedListings = database_default.prepare(`
      SELECT ml.*, s.created_at as saved_at
      FROM market_listing_saves s
      JOIN market_listings ml ON ml.id = s.listing_id
      WHERE s.user_id = ? AND ml.status = 'active'
      ORDER BY s.created_at DESC
    `).all(payload.userId);
    const listings = savedListings.map((row) => attachSeller(parseListing(row)));
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062D\u0641\u0648\u0638\u0629", details: err.message });
  }
});
router7.get("/my-listings", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const listings = database_default.prepare(`
      SELECT * FROM market_listings
      WHERE seller_id = ? AND status != 'deleted'
      ORDER BY created_at DESC
    `).all(payload.userId);
    const parsed = listings.map((row) => attachSeller(parseListing(row)));
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u0639\u0644\u0627\u0646\u0627\u062A\u064A", details: err.message });
  }
});
router7.post("/listings/:id/inquire", authMiddleware, (req, res) => {
  try {
    const listing = database_default.prepare("SELECT * FROM market_listings WHERE id = ?").get(req.params.id);
    if (!listing) {
      res.status(404).json({ error: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    database_default.prepare("UPDATE market_listings SET inquiries_count = inquiries_count + 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const updated = database_default.prepare("SELECT inquiries_count FROM market_listings WHERE id = ?").get(req.params.id);
    res.json({ inquiriesCount: updated?.inquiries_count || 1 });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0627\u0633\u062A\u0641\u0633\u0627\u0631", details: err.message });
  }
});
router7.post("/promote", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { listingId, tier, packageName, duration, estimatedReach, targeting, targetCity, targetCities, targetInterests, targetAgeMin, targetAgeMax, price } = req.body;
    if (!listingId) {
      res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    if (!tier) {
      res.status(400).json({ error: "\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u062A\u0631\u0648\u064A\u062C \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    if (!price || price <= 0) {
      res.status(400).json({ error: "\u0633\u0639\u0631 \u0627\u0644\u062A\u0631\u0648\u064A\u062C \u0645\u0637\u0644\u0648\u0628" });
      return;
    }
    const listing = database_default.prepare("SELECT * FROM market_listings WHERE id = ?").get(listingId);
    if (!listing) {
      res.status(404).json({ error: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    if (listing.seller_id !== payload.userId) {
      res.status(403).json({ error: "\u064A\u0645\u0643\u0646\u0643 \u062A\u0631\u0648\u064A\u062C \u0625\u0639\u0644\u0627\u0646\u0627\u062A\u0643 \u0641\u0642\u0637" });
      return;
    }
    const existingPromotion = database_default.prepare(
      "SELECT * FROM market_promotion_requests WHERE listing_id = ? AND seller_id = ? AND status IN ('pending', 'approved') ORDER BY created_at DESC LIMIT 1"
    ).get(listingId, payload.userId);
    if (existingPromotion) {
      if (existingPromotion.status === "pending") {
        res.status(400).json({ error: "\u064A\u0648\u062C\u062F \u0637\u0644\u0628 \u062A\u0631\u0648\u064A\u062C \u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0628\u0627\u0644\u0641\u0639\u0644" });
        return;
      }
      if (existingPromotion.status === "approved") {
        res.status(400).json({ error: "\u0647\u0630\u0627 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0645\u0631\u0648\u0651\u062C \u0628\u0627\u0644\u0641\u0639\u0644 \u0648\u0644\u0627 \u064A\u0632\u0627\u0644 \u0646\u0634\u0637\u0627\u064B" });
        return;
      }
    }
    const wallet = database_default.prepare("SELECT wallet_balance FROM users WHERE id = ?").get(payload.userId);
    if (!wallet || wallet.wallet_balance < price) {
      res.status(400).json({ error: "\u0631\u0635\u064A\u062F\u0643 \u063A\u064A\u0631 \u0643\u0627\u0641\u064D \u0644\u0644\u062A\u0631\u0648\u064A\u062C" });
      return;
    }
    database_default.prepare("UPDATE users SET wallet_balance = wallet_balance - ?, updated_at = datetime('now') WHERE id = ?").run(price, payload.userId);
    database_default.prepare("INSERT INTO transactions (user_id, type, amount, method, status) VALUES (?, ?, ?, ?, ?)").run(payload.userId, "promotion_debit", price, "\u0645\u062D\u0641\u0638\u0629", "completed");
    const resolvedTargetCities = targetCities && targetCities.length > 0 ? targetCities : targetCity ? Array.isArray(targetCity) ? targetCity : [targetCity] : [];
    const listingTitle = listing.title || "";
    database_default.prepare(`
      INSERT INTO market_promotion_requests (listing_id, seller_id, listing_title, tier, package_name, duration, estimated_reach, price, targeting, target_city, target_interests, target_age_min, target_age_max)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      listingId,
      payload.userId,
      listingTitle,
      tier,
      packageName || "",
      duration || 0,
      estimatedReach || 0,
      price,
      targeting || "all",
      JSON.stringify(resolvedTargetCities),
      JSON.stringify(targetInterests || []),
      targetAgeMin || 0,
      targetAgeMax || 0
    );
    database_default.prepare(`
      UPDATE market_listings SET
        promotion_status = 'pending',
        promotion_tier = ?,
        promotion_package = ?,
        estimated_reach = ?,
        targeting = ?,
        target_city = ?,
        target_interests = ?,
        target_age_min = ?,
        target_age_max = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      tier,
      packageName || "",
      estimatedReach || 0,
      targeting || "all",
      JSON.stringify(resolvedTargetCities),
      JSON.stringify(targetInterests || []),
      targetAgeMin || 0,
      targetAgeMax || 0,
      listingId
    );
    try {
      const admins = database_default.prepare("SELECT id FROM users WHERE is_admin = 1").all();
      const insertNotif = database_default.prepare("INSERT INTO notifications (user_id, type, message, post_id, link) VALUES (?, ?, ?, ?, ?)");
      for (const admin of admins) {
        insertNotif.run(admin.id, "promotion", `\u0637\u0644\u0628 \u062A\u0631\u0648\u064A\u062C \u062C\u062F\u064A\u062F \u0641\u064A \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0630\u0643\u064A: "${listing.title}" - \u0628\u0627\u0642\u0629 ${packageName || tier} (${price} \u062C.\u0645)`, listingId, `/market/listing/${listingId}`);
      }
    } catch {
    }
    try {
      database_default.prepare("INSERT INTO notifications (user_id, type, message, post_id, link) VALUES (?, ?, ?, ?, ?)").run(payload.userId, "promotion", `\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u062A\u0631\u0648\u064A\u062C \u0625\u0639\u0644\u0627\u0646\u0643 "${listing.title}" \u0648\u0633\u064A\u062A\u0645 \u0645\u0631\u0627\u062C\u0639\u062A\u0647 \u0645\u0646 \u0627\u0644\u0625\u062F\u0627\u0631\u0629`, listingId, `/market/listing/${listingId}`);
    } catch {
    }
    const promoRequest = database_default.prepare("SELECT * FROM market_promotion_requests WHERE listing_id = ? AND seller_id = ? ORDER BY created_at DESC LIMIT 1").get(listingId, payload.userId);
    res.status(201).json(promoRequest);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u062A\u0631\u0648\u064A\u062C", details: err.message });
  }
});
router7.get("/my-promotions", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const promotions = database_default.prepare(`
      SELECT mpr.*,
        ml.reach_count, ml.views_count, ml.saves_count, ml.inquiries_count,
        ml.promotion_status as listing_promotion_status,
        ml.promotion_started_at, ml.promotion_expires_at
      FROM market_promotion_requests mpr
      LEFT JOIN market_listings ml ON ml.id = mpr.listing_id
      WHERE mpr.seller_id = ?
      ORDER BY mpr.created_at DESC
    `).all(payload.userId);
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062A\u0631\u0648\u064A\u062C", details: err.message });
  }
});
router7.get("/stats", (_req, res) => {
  try {
    const totalListings = database_default.prepare("SELECT COUNT(*) as count FROM market_listings WHERE status = 'active'").get();
    const totalSellers = database_default.prepare("SELECT COUNT(DISTINCT seller_id) as count FROM market_listings WHERE status = 'active'").get();
    const avgPrice = database_default.prepare("SELECT COALESCE(AVG(price), 0) as avg FROM market_listings WHERE status = 'active' AND price > 0").get();
    const newToday = database_default.prepare("SELECT COUNT(*) as count FROM market_listings WHERE status = 'active' AND created_at >= datetime('now', '-1 day')").get();
    const categoryBreakdown = database_default.prepare(`
      SELECT category, COUNT(*) as count, COALESCE(AVG(price), 0) as avg_price
      FROM market_listings
      WHERE status = 'active' AND category != '' AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `).all();
    res.json({
      totalListings: totalListings.count || 0,
      totalSellers: totalSellers.count || 0,
      averagePrice: Math.round(avgPrice.avg || 0),
      newToday: newToday.count || 0,
      categoryBreakdown
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0633\u0648\u0642", details: err.message });
  }
});
router7.get("/categories", (_req, res) => {
  try {
    const interestCategories = [
      { id: "phones", name: "\u0647\u0648\u0627\u062A\u0641", icon: "\u{1F4F1}" },
      { id: "electronics", name: "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A", icon: "\u{1F4BB}" },
      { id: "games", name: "\u0623\u0644\u0639\u0627\u0628", icon: "\u{1F3AE}" },
      { id: "cars", name: "\u0633\u064A\u0627\u0631\u0627\u062A", icon: "\u{1F697}" },
      { id: "realEstate", name: "\u0639\u0642\u0627\u0631\u0627\u062A", icon: "\u{1F3E0}" },
      { id: "fashion", name: "\u0623\u0632\u064A\u0627\u0621", icon: "\u{1F455}" },
      { id: "beauty", name: "\u062A\u062C\u0645\u064A\u0644", icon: "\u{1F484}" },
      { id: "sports", name: "\u0631\u064A\u0627\u0636\u0629", icon: "\u26BD" },
      { id: "food", name: "\u0637\u0639\u0627\u0645 \u0648\u0645\u0637\u0627\u0639\u0645", icon: "\u{1F37D}\uFE0F" },
      { id: "jobs", name: "\u0648\u0638\u0627\u0626\u0641", icon: "\u{1F4BC}" },
      { id: "services", name: "\u062E\u062F\u0645\u0627\u062A", icon: "\u{1F6CE}\uFE0F" },
      { id: "education", name: "\u062A\u0639\u0644\u064A\u0645", icon: "\u{1F393}" },
      { id: "books", name: "\u0643\u062A\u0628", icon: "\u{1F4DA}" },
      { id: "animals", name: "\u062D\u064A\u0648\u0627\u0646\u0627\u062A", icon: "\u{1F43E}" },
      { id: "travel", name: "\u0633\u0641\u0631 \u0648\u0633\u064A\u0627\u062D\u0629", icon: "\u2708\uFE0F" },
      { id: "photography", name: "\u062A\u0635\u0648\u064A\u0631", icon: "\u{1F4F7}" },
      { id: "health", name: "\u0635\u062D\u0629", icon: "\u{1F3E5}" },
      { id: "other", name: "\u0623\u062E\u0631\u0649", icon: "\u{1F4E6}" }
    ];
    const dbCounts = database_default.prepare(`
      SELECT category, COUNT(*) as count
      FROM market_listings
      WHERE status = 'active' AND category != '' AND category IS NOT NULL
      GROUP BY category
    `).all();
    const countMap = /* @__PURE__ */ new Map();
    for (const row of dbCounts) {
      countMap.set(row.category, row.count);
    }
    const categories = interestCategories.map((cat) => ({
      ...cat,
      count: countMap.get(cat.id) || 0
    }));
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u062A\u0635\u0646\u064A\u0641\u0627\u062A", details: err.message });
  }
});
router7.get("/market-pulse/overview", (_req, res) => {
  try {
    const totalActive = database_default.prepare("SELECT COUNT(*) as count FROM market_listings WHERE status = 'active'").get();
    const newToday = database_default.prepare("SELECT COUNT(*) as count FROM market_listings WHERE status = 'active' AND created_at >= datetime('now', '-1 day')").get();
    const newThisWeek = database_default.prepare("SELECT COUNT(*) as count FROM market_listings WHERE status = 'active' AND created_at >= datetime('now', '-7 days')").get();
    const totalUsers = database_default.prepare("SELECT COUNT(DISTINCT seller_id) as count FROM market_listings WHERE status = 'active'").get();
    const avgPrice = database_default.prepare("SELECT COALESCE(AVG(price), 0) as avg FROM market_listings WHERE status = 'active' AND price > 0").get();
    const categoryDist = database_default.prepare(`
      SELECT category, COUNT(*) as count, COALESCE(AVG(price), 0) as avg_price, 
             COALESCE(MIN(price), 0) as min_price, COALESCE(MAX(price), 0) as max_price
      FROM market_listings WHERE status = 'active' AND category != '' AND category IS NOT NULL
      GROUP BY category ORDER BY count DESC
    `).all();
    const weeklyActivity = database_default.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM market_listings
      WHERE status = 'active' AND created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at) ORDER BY date ASC
    `).all();
    const supplyDemand = categoryDist.slice(0, 8).map((cat) => ({
      category: cat.category,
      supply: cat.count,
      demandScore: Math.round(cat.count * (0.5 + Math.random() * 1.5)),
      ratio: Math.round(cat.count * (0.5 + Math.random() * 1.5) / Math.max(cat.count, 1) * 100) / 100
    }));
    const priceRanges = categoryDist.slice(0, 8).map((cat) => ({
      category: cat.category,
      count: cat.count,
      minPrice: cat.min_price,
      maxPrice: cat.max_price,
      avgPrice: Math.round(cat.avg_price)
    }));
    const topAds = database_default.prepare(`
      SELECT ml.*, u.name as author_name, u.avatar as author_avatar
      FROM market_listings ml
      LEFT JOIN users u ON ml.seller_id = u.id
      WHERE ml.status = 'active' AND ml.is_promoted = 1
      ORDER BY ml.views_count DESC LIMIT 5
    `).all();
    res.json({
      activeAds: totalActive.count || 0,
      newToday: newToday.count || 0,
      newThisWeek: newThisWeek.count || 0,
      totalUsers: totalUsers.count || 0,
      avgPrice: Math.round(avgPrice.avg || 0),
      categoryDist,
      supplyDemand,
      priceRanges,
      weeklyActivity,
      topAds: topAds.map((ad) => ({
        id: ad.id,
        content: ad.title,
        image: (() => {
          try {
            const imgs = JSON.parse(ad.images || "[]");
            return Array.isArray(imgs) ? imgs[0] || "" : "";
          } catch {
            return "";
          }
        })(),
        price: ad.price,
        category: ad.category,
        location: ad.location,
        reachCount: ad.views_count || 0,
        likes: ad.saves_count || 0,
        authorName: ad.author_name || "",
        authorAvatar: ad.author_avatar || "",
        createdAt: ad.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0646\u0628\u0636 \u0627\u0644\u0633\u0648\u0642", details: err.message });
  }
});
router7.get("/market-live/feed", optionalAuth, (req, res) => {
  try {
    const { category, page = "1", limit = "10" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let videoQuery = `
      SELECT v.id as video_id, v.video_url, v.thumbnail_url, v.duration,
             v.views as video_views, v.likes as video_likes, v.saves as video_saves,
             v.is_featured, v.created_at as video_created_at,
             COALESCE(ml.id, p.id) as item_id,
             COALESCE(ml.title, p.content) as title,
             COALESCE(ml.description, '') as description,
             COALESCE(ml.price, p.price) as price,
             COALESCE(ml.currency, p.currency, '\u062C.\u0645') as currency,
             COALESCE(ml.category, p.category, '') as category,
             COALESCE(ml.location, p.location, '') as location,
             COALESCE(ml.images, '[]') as images,
             COALESCE(ml.is_promoted, p.is_promoted, 0) as is_promoted,
             COALESCE(ml.seller_id, p.author_id) as author_id,
             u.name as author_name, u.avatar as author_avatar,
             u.avatar_base64, u.is_verified, u.is_trusted
      FROM ad_videos v
      LEFT JOIN market_listings ml ON ml.id = v.post_id
      LEFT JOIN posts p ON p.id = v.post_id
      LEFT JOIN users u ON u.id = COALESCE(ml.seller_id, p.author_id)
      WHERE v.status = 'active'
    `;
    const videoParams = [];
    if (category) {
      videoQuery += " AND COALESCE(ml.category, p.category) = ?";
      videoParams.push(category);
    }
    videoQuery += " ORDER BY v.is_featured DESC, v.created_at DESC LIMIT ? OFFSET ?";
    videoParams.push(parseInt(limit), offset);
    const videoResults = database_default.prepare(videoQuery).all(...videoParams);
    if (videoResults.length > 0) {
      const videos2 = videoResults.map((row) => {
        let images = [];
        try {
          const p = JSON.parse(row.images || "[]");
          if (Array.isArray(p)) images = p;
        } catch {
          images = [];
        }
        return {
          id: row.video_id,
          videoUrl: row.video_url,
          thumbnailUrl: row.thumbnail_url || images[0] || "",
          description: row.title,
          content: row.description || "",
          price: row.price,
          currency: row.currency || "\u062C.\u0645",
          category: row.category,
          location: row.location,
          authorId: row.author_id,
          authorName: row.author_name || "",
          authorAvatar: row.avatar_base64 || row.author_avatar || "",
          isVerified: !!row.is_verified,
          isTrusted: !!row.is_trusted,
          isPromoted: !!row.is_promoted,
          isTrending: (row.video_views || 0) > 50,
          likes: row.video_likes || 0,
          views: row.video_views || 0,
          duration: row.duration || 0
        };
      });
      res.json({
        videos: videos2,
        hasMore: videoResults.length >= parseInt(limit)
      });
      return;
    }
    let query = "SELECT * FROM market_listings WHERE status = 'active' AND images IS NOT NULL AND images != '[]'";
    const params = [];
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    query += " ORDER BY is_promoted DESC, created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);
    const listings = database_default.prepare(query).all(...params);
    const videos = listings.map((row) => {
      const parsed = parseListing(row);
      const seller = attachSeller(parsed);
      let images = [];
      try {
        const p = JSON.parse(row.images || "[]");
        if (Array.isArray(p)) images = p;
      } catch {
        images = [];
      }
      return {
        id: row.id,
        videoUrl: "",
        thumbnailUrl: images[0] || "",
        description: row.title,
        content: row.description,
        price: row.price,
        currency: row.currency || "\u062C.\u0645",
        category: row.category,
        location: row.location,
        authorId: row.seller_id,
        authorName: seller?.seller?.name || "",
        authorAvatar: seller?.seller?.avatar || "",
        isVerified: !!seller?.seller?.is_verified,
        isTrusted: !!seller?.seller?.is_trusted,
        isPromoted: !!row.is_promoted,
        isTrending: (row.views_count || 0) > 50,
        likes: row.saves_count || 0,
        views: row.views_count || 0
      };
    });
    res.json({
      videos,
      hasMore: listings.length >= parseInt(limit)
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0641\u064A\u062F\u064A\u0648\u0647\u0627\u062A \u0627\u0644\u0633\u0648\u0642", details: err.message });
  }
});
router7.get("/market-live/stats", (_req, res) => {
  try {
    const newToday = database_default.prepare("SELECT COUNT(*) as count FROM market_listings WHERE status = 'active' AND created_at >= datetime('now', '-1 day')").get();
    const totalViews = database_default.prepare("SELECT COALESCE(SUM(views_count), 0) as total FROM market_listings WHERE status = 'active'").get();
    res.json({
      newToday: newToday.count || 0,
      videosToday: newToday.count || 0,
      totalViews: totalViews.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0645\u0628\u0627\u0634\u0631", details: err.message });
  }
});
router7.post("/market-live/interact", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const { videoId, interactionType } = req.body;
    if (!videoId || !interactionType) {
      res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u0645\u0637\u0644\u0648\u0628\u0629" });
      return;
    }
    const listing = database_default.prepare("SELECT * FROM market_listings WHERE id = ?").get(videoId);
    if (!listing) {
      res.status(404).json({ error: "\u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      return;
    }
    switch (interactionType) {
      case "like":
        database_default.prepare("UPDATE market_listings SET saves_count = saves_count + 1, updated_at = datetime('now') WHERE id = ?").run(videoId);
        break;
      case "save":
        const existing = database_default.prepare("SELECT id FROM market_listing_saves WHERE listing_id = ? AND user_id = ?").get(videoId, payload.userId);
        if (!existing) {
          database_default.prepare("INSERT INTO market_listing_saves (listing_id, user_id) VALUES (?, ?)").run(videoId, payload.userId);
          database_default.prepare("UPDATE market_listings SET saves_count = saves_count + 1, updated_at = datetime('now') WHERE id = ?").run(videoId);
        }
        break;
      case "share":
        database_default.prepare("UPDATE market_listings SET views_count = views_count + 1, updated_at = datetime('now') WHERE id = ?").run(videoId);
        break;
      case "view":
        database_default.prepare("UPDATE market_listings SET views_count = views_count + 1, updated_at = datetime('now') WHERE id = ?").run(videoId);
        break;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062A\u0641\u0627\u0639\u0644", details: err.message });
  }
});
var market_default = router7;

// src/routes/smartReach.ts
import { Router as Router8 } from "express";
init_auth();
var router8 = Router8();
var TIER_ORDER = {
  vip: 4,
  premium: 3,
  standard: 2,
  basic: 1
};
var TIER_NAMES_AR = {
  vip: "VIP",
  premium: "\u0628\u0631\u064A\u0645\u064A\u0648\u0645",
  standard: "\u0633\u062A\u0627\u0646\u062F\u0631",
  basic: "\u0623\u0633\u0627\u0633\u064A"
};
var TARGETING_NAMES_AR = {
  all: "\u0627\u0644\u0643\u0644",
  city: "\u062D\u0633\u0628 \u0627\u0644\u0645\u062F\u064A\u0646\u0629",
  interests: "\u062D\u0633\u0628 \u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A"
};
var ARABIC_INTEREST_MAP = {
  phones: "\u0647\u0648\u0627\u062A\u0641",
  electronics: "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A",
  games: "\u0623\u0644\u0639\u0627\u0628",
  cars: "\u0633\u064A\u0627\u0631\u0627\u062A",
  realEstate: "\u0639\u0642\u0627\u0631\u0627\u062A",
  fashion: "\u0623\u0632\u064A\u0627\u0621",
  beauty: "\u062A\u062C\u0645\u064A\u0644",
  sports: "\u0631\u064A\u0627\u0636\u0629",
  food: "\u0637\u0639\u0627\u0645 \u0648\u0645\u0637\u0627\u0639\u0645",
  jobs: "\u0648\u0638\u0627\u0626\u0641",
  services: "\u062E\u062F\u0645\u0627\u062A",
  education: "\u062A\u0639\u0644\u064A\u0645",
  books: "\u0643\u062A\u0628",
  animals: "\u062D\u064A\u0648\u0627\u0646\u0627\u062A",
  travel: "\u0633\u0641\u0631 \u0648\u0633\u064A\u0627\u062D\u0629",
  photography: "\u062A\u0635\u0648\u064A\u0631",
  health: "\u0635\u062D\u0629",
  other: "\u0623\u062E\u0631\u0649",
  \u062A\u0642\u0646\u064A\u0629: "\u062A\u0642\u0646\u064A\u0629",
  \u0639\u0642\u0627\u0631\u0627\u062A: "\u0639\u0642\u0627\u0631\u0627\u062A",
  \u0633\u064A\u0627\u0631\u0627\u062A: "\u0633\u064A\u0627\u0631\u0627\u062A",
  \u0647\u0648\u0627\u062A\u0641: "\u0647\u0648\u0627\u062A\u0641",
  \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A: "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A"
};
function safeJsonParse(jsonStr, fallback) {
  if (!jsonStr) return fallback;
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
function calculateAge(dob) {
  if (!dob) return 0;
  try {
    const birthDate = new Date(dob);
    const today = /* @__PURE__ */ new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || monthDiff === 0 && today.getDate() < birthDate.getDate()) {
      age--;
    }
    return age > 0 ? age : 0;
  } catch {
    return 0;
  }
}
function ageToRange(age) {
  if (age < 18) return "\u0623\u0642\u0644 \u0645\u0646 18";
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  return "55+";
}
function getUserPromotedPosts(userId, includeExpired = false) {
  const statusFilter = includeExpired ? "promotion_status IN ('approved', 'expired')" : "is_promoted = 1 AND promotion_status = 'approved'";
  return database_default.prepare(`
    SELECT
      id, content as title, promotion_tier as tier, reach_count,
      (COALESCE(likes, 0) + COALESCE(comments, 0) + COALESCE(shares, 0)) as total_engagement,
      targeting, target_city, target_interests,
      promotion_started_at, promotion_expires_at, is_promoted,
      promotion_status, created_at, 'post' as source_type
    FROM posts
    WHERE author_id = ? AND ${statusFilter}
      AND status = 'active'
  `).all(userId);
}
function getUserPromotedListings(userId, includeExpired = false) {
  const statusFilter = includeExpired ? "promotion_status IN ('approved', 'expired')" : "is_promoted = 1 AND promotion_status = 'approved'";
  return database_default.prepare(`
    SELECT
      id, title, promotion_tier as tier, reach_count,
      (COALESCE(saves_count, 0) + COALESCE(inquiries_count, 0) + COALESCE(shares_count, 0)) as total_engagement,
      targeting, target_city, target_interests,
      promotion_started_at, promotion_expires_at, is_promoted,
      promotion_status, created_at, 'market' as source_type,
      views_count, saves_count, inquiries_count, shares_count
    FROM market_listings
    WHERE seller_id = ? AND ${statusFilter}
      AND status = 'active'
  `).all(userId);
}
function getPostPromotionSpending(userId) {
  return database_default.prepare(`
    SELECT post_id, tier, price, targeting, target_city, target_interests,
           estimated_reach, status, created_at
    FROM promotion_requests
    WHERE author_id = ? AND status = 'approved'
  `).all(userId);
}
function getMarketPromotionSpending(userId) {
  return database_default.prepare(`
    SELECT listing_id, tier, price, targeting, target_city, target_interests,
           estimated_reach, status, created_at
    FROM market_promotion_requests
    WHERE seller_id = ? AND status = 'approved'
  `).all(userId);
}
function getTotalPromotionSpent(userId) {
  const result = database_default.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM transactions
    WHERE user_id = ? AND type = 'promotion_debit' AND status = 'completed'
  `).get(userId);
  return result?.total || 0;
}
function autoExpirePromotions() {
  try {
    database_default.prepare(`
      UPDATE posts SET is_promoted = 0, promotion_status = 'expired', updated_at = datetime('now')
      WHERE is_promoted = 1 AND promotion_expires_at IS NOT NULL AND promotion_expires_at < datetime('now')
    `).run();
  } catch {
  }
  try {
    database_default.prepare(`
      UPDATE market_listings SET is_promoted = 0, promotion_status = 'expired', updated_at = datetime('now')
      WHERE is_promoted = 1 AND promotion_expires_at IS NOT NULL AND promotion_expires_at < datetime('now')
    `).run();
  } catch {
  }
}
function getReachByDay(userId, days = 14) {
  const result = [];
  const posts = getUserPromotedPosts(userId, true);
  const listings = getUserPromotedListings(userId, true);
  const allPromotions = [...posts, ...listings];
  for (let i = days - 1; i >= 0; i--) {
    const dateStr = new Date(Date.now() - i * 864e5).toISOString().split("T")[0];
    let dayReach = 0;
    for (const promo of allPromotions) {
      const createdAt = new Date(promo.created_at).toISOString().split("T")[0];
      const expiresAt = promo.promotion_expires_at ? new Date(promo.promotion_expires_at).toISOString().split("T")[0] : null;
      if (createdAt <= dateStr && (!expiresAt || expiresAt >= dateStr)) {
        const totalDays = Math.max(1, Math.ceil(
          (Date.now() - new Date(promo.created_at).getTime()) / 864e5
        ));
        dayReach += Math.round((promo.reach_count || 0) / totalDays);
      }
    }
    result.push({ date: dateStr, reach: dayReach });
  }
  return result;
}
function buildDemographics(userId) {
  const postIds = database_default.prepare(`
    SELECT id FROM posts WHERE author_id = ? AND promotion_status IN ('approved', 'expired')
  `).all(userId);
  const listingIds = database_default.prepare(`
    SELECT id FROM market_listings WHERE seller_id = ? AND promotion_status IN ('approved', 'expired')
  `).all(userId);
  const allPromoIds = [
    ...postIds.map((p) => p.id),
    ...listingIds.map((l) => l.id)
  ];
  let visitorIds = [];
  if (allPromoIds.length > 0) {
    const placeholders = allPromoIds.map(() => "?").join(",");
    const visitors = database_default.prepare(`
      SELECT DISTINCT visitor_id FROM smart_link_visits
      WHERE post_id IN (${placeholders}) AND visitor_id IS NOT NULL
    `).all(...allPromoIds);
    visitorIds = visitors.map((v) => v.visitor_id).filter(Boolean);
  }
  const interactionUserIds = new Set(visitorIds);
  if (postIds.length > 0) {
    const postPlaceholders = postIds.map(() => "?").join(",");
    try {
      const commenters = database_default.prepare(`
        SELECT DISTINCT author_id FROM post_comments
        WHERE post_id IN (${postPlaceholders})
      `).all(...postIds.map((p) => p.id));
      commenters.forEach((c) => interactionUserIds.add(c.author_id));
    } catch {
    }
  }
  if (listingIds.length > 0) {
    const listPlaceholders = listingIds.map(() => "?").join(",");
    try {
      const savers = database_default.prepare(`
        SELECT DISTINCT user_id FROM market_listing_saves
        WHERE listing_id IN (${listPlaceholders})
      `).all(...listingIds.map((l) => l.id));
      savers.forEach((s) => interactionUserIds.add(s.user_id));
    } catch {
    }
  }
  if (interactionUserIds.size === 0) {
    return { byCity: [], byInterest: [], byAge: [] };
  }
  const interactionIdArray = Array.from(interactionUserIds);
  const idPlaceholders = interactionIdArray.map(() => "?").join(",");
  const cityData = database_default.prepare(`
    SELECT location as city, COUNT(*) as count
    FROM users
    WHERE id IN (${idPlaceholders}) AND location IS NOT NULL AND location != ''
    GROUP BY location
    ORDER BY count DESC
    LIMIT 10
  `).all(...interactionIdArray);
  const interestUsers = database_default.prepare(`
    SELECT interests FROM users
    WHERE id IN (${idPlaceholders}) AND interests IS NOT NULL AND interests != '[]'
  `).all(...interactionIdArray);
  const interestCounts = {};
  for (const user of interestUsers) {
    const interests = safeJsonParse(user.interests, []);
    for (const interest of interests) {
      const displayName = ARABIC_INTEREST_MAP[interest] || interest;
      interestCounts[displayName] = (interestCounts[displayName] || 0) + 1;
    }
  }
  const byInterest = Object.entries(interestCounts).sort(([, a], [, b]) => b - a).slice(0, 10).map(([interest, count]) => ({ interest, count }));
  const ageUsers = database_default.prepare(`
    SELECT date_of_birth FROM users
    WHERE id IN (${idPlaceholders}) AND date_of_birth IS NOT NULL AND date_of_birth != ''
  `).all(...interactionIdArray);
  const ageCounts = {};
  for (const user of ageUsers) {
    const age = calculateAge(user.date_of_birth);
    if (age > 0) {
      const range = ageToRange(age);
      ageCounts[range] = (ageCounts[range] || 0) + 1;
    }
  }
  const ageOrder = ["\u0623\u0642\u0644 \u0645\u0646 18", "18-24", "25-34", "35-44", "45-54", "55+"];
  const byAge = ageOrder.filter((range) => ageCounts[range]).map((range) => ({ range, count: ageCounts[range] }));
  return {
    byCity: cityData.map((c) => ({ city: c.city, count: c.count })),
    byInterest,
    byAge
  };
}
router8.get("/stats", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const userId = payload.userId;
    autoExpirePromotions();
    const promotedPosts = getUserPromotedPosts(userId, true);
    const promotedListings = getUserPromotedListings(userId, true);
    const allPromotions = [
      ...promotedPosts.map((p) => ({ ...p, source_type: "post" })),
      ...promotedListings.map((l) => ({ ...l, source_type: "market" }))
    ];
    const postSpending = getPostPromotionSpending(userId);
    const marketSpending = getMarketPromotionSpending(userId);
    const allSpending = [...postSpending, ...marketSpending];
    const totalSpent = getTotalPromotionSpent(userId);
    const totalPromotions = allSpending.length;
    const activePromotions = allPromotions.filter((p) => p.promotion_status === "approved" && p.is_promoted === 1).length;
    const totalReach = allPromotions.reduce((sum, p) => sum + (p.reach_count || 0), 0);
    const avgReachPerPromotion = totalPromotions > 0 ? Math.round(totalReach / totalPromotions) : 0;
    const reachEfficiency = totalSpent > 0 ? Math.round(totalReach / totalSpent) : 0;
    const reachByDay = getReachByDay(userId, 14);
    const demographics = buildDemographics(userId);
    const tierBreakdown = {};
    for (const promo of allSpending) {
      const tier = promo.tier || "basic";
      if (!tierBreakdown[tier]) {
        tierBreakdown[tier] = { count: 0, totalReach: 0, totalSpent: 0 };
      }
      tierBreakdown[tier].count++;
      tierBreakdown[tier].totalSpent += promo.price || 0;
    }
    for (const promo of allPromotions) {
      const tier = promo.tier || "basic";
      if (tierBreakdown[tier]) {
        tierBreakdown[tier].totalReach += promo.reach_count || 0;
      }
    }
    const promotionBreakdown = Object.entries(tierBreakdown).map(([tier, data]) => ({
      tier: TIER_NAMES_AR[tier] || tier,
      tierRaw: tier,
      count: data.count,
      totalReach: data.totalReach,
      avgReach: data.count > 0 ? Math.round(data.totalReach / data.count) : 0,
      totalSpent: Math.round(data.totalSpent)
    })).sort((a, b) => (TIER_ORDER[b.tierRaw] || 0) - (TIER_ORDER[a.tierRaw] || 0));
    let bestPerformingPromotion = null;
    if (allPromotions.length > 0) {
      const best = allPromotions.reduce(
        (max, p) => (p.reach_count || 0) > (max.reach_count || 0) ? p : max,
        allPromotions[0]
      );
      bestPerformingPromotion = {
        id: best.id,
        type: best.source_type,
        title: best.title || "\u0645\u0646\u0634\u0648\u0631 \u0628\u062F\u0648\u0646 \u0639\u0646\u0648\u0627\u0646",
        tier: TIER_NAMES_AR[best.tier] || best.tier,
        reach: best.reach_count || 0,
        engagement: best.total_engagement || 0,
        targeting: TARGETING_NAMES_AR[best.targeting] || best.targeting,
        createdAt: best.created_at
      };
    }
    const targetingGroups = {
      all: { count: 0, totalReach: 0 },
      city: { count: 0, totalReach: 0 },
      interests: { count: 0, totalReach: 0 }
    };
    for (const promo of allPromotions) {
      const targeting = promo.targeting || "all";
      if (targetingGroups[targeting]) {
        targetingGroups[targeting].count++;
        targetingGroups[targeting].totalReach += promo.reach_count || 0;
      }
    }
    const targetingEffectiveness = Object.fromEntries(
      Object.entries(targetingGroups).map(([key, data]) => [
        key,
        {
          count: data.count,
          avgReach: data.count > 0 ? Math.round(data.totalReach / data.count) : 0
        }
      ])
    );
    const totalClicks = allPromotions.reduce((sum, p) => sum + (p.click_count || 0), 0);
    res.json({
      totalPromotions,
      activePromotions,
      totalReach,
      totalClicks,
      promotedCount: activePromotions,
      totalPosts: allPromotions.filter((p) => p.source_type === "post").length + allPromotions.filter((p) => p.source_type === "market").length,
      totalSpent: Math.round(totalSpent),
      avgReachPerPromotion,
      reachEfficiency,
      demographics,
      reachByDay,
      promotionBreakdown,
      bestPerformingPromotion,
      targetingEffectiveness
    });
  } catch (err) {
    console.error("[SmartReach] Stats error:", err.message);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0630\u0643\u064A", details: err.message });
  }
});
router8.get("/promotion/:id/analytics", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const userId = payload.userId;
    const promoId = req.params.id;
    autoExpirePromotions();
    let promotion = null;
    let promotionType = "post";
    let spending = 0;
    let estimatedReach = 0;
    const post = database_default.prepare(`
      SELECT p.*,
        (COALESCE(p.likes, 0) + COALESCE(p.comments, 0) + COALESCE(p.shares, 0)) as total_engagement
      FROM posts p
      WHERE p.id = ? AND p.author_id = ? AND p.promotion_status IN ('approved', 'expired') AND p.status = 'active'
    `).get(promoId, userId);
    if (post) {
      promotion = post;
      promotionType = "post";
      const promoReq = database_default.prepare(`
        SELECT price, estimated_reach FROM promotion_requests
        WHERE post_id = ? AND author_id = ? AND status = 'approved'
        ORDER BY created_at DESC LIMIT 1
      `).get(promoId, userId);
      spending = promoReq?.price || 0;
      estimatedReach = promoReq?.estimated_reach || post.estimated_reach || 0;
    } else {
      const listing = database_default.prepare(`
        SELECT ml.*,
          (COALESCE(ml.saves_count, 0) + COALESCE(ml.inquiries_count, 0) + COALESCE(ml.shares_count, 0)) as total_engagement
        FROM market_listings ml
        WHERE ml.id = ? AND ml.seller_id = ? AND ml.promotion_status IN ('approved', 'expired') AND ml.status = 'active'
      `).get(promoId, userId);
      if (listing) {
        promotion = listing;
        promotionType = "market";
        const promoReq = database_default.prepare(`
          SELECT price, estimated_reach FROM market_promotion_requests
          WHERE listing_id = ? AND seller_id = ? AND status = 'approved'
          ORDER BY created_at DESC LIMIT 1
        `).get(promoId, userId);
        spending = promoReq?.price || 0;
        estimatedReach = promoReq?.estimated_reach || listing.estimated_reach || 0;
      }
    }
    if (!promotion) {
      res.status(404).json({ error: "\u0627\u0644\u062A\u0631\u0648\u064A\u062C \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0635\u0644\u0627\u062D\u064A\u0629 \u0639\u0631\u0636\u0647" });
      return;
    }
    const reachCount = promotion.reach_count || 0;
    const engagement = promotion.total_engagement || 0;
    const promotionDetails = {
      id: promotion.id,
      type: promotionType,
      title: promotionType === "post" ? promotion.content || "" : promotion.title || "",
      tier: TIER_NAMES_AR[promotion.promotion_tier] || promotion.promotion_tier,
      tierRaw: promotion.promotion_tier,
      status: promotion.promotion_status,
      targeting: TARGETING_NAMES_AR[promotion.targeting] || promotion.targeting,
      targetingRaw: promotion.targeting || "all",
      targetCity: promotion.target_city || "",
      targetInterests: safeJsonParse(promotion.target_interests, []),
      startedAt: promotion.promotion_started_at,
      expiresAt: promotion.promotion_expires_at,
      createdAt: promotion.created_at,
      reachCount,
      estimatedReach,
      spending: Math.round(spending)
    };
    const reachOverTime = [];
    const createdDate = new Date(promotion.created_at);
    const totalDaysActive = Math.max(1, Math.ceil(
      (Date.now() - createdDate.getTime()) / 864e5
    ));
    for (let i = 13; i >= 0; i--) {
      const dateStr = new Date(Date.now() - i * 864e5).toISOString().split("T")[0];
      const expiresAt = promotion.promotion_expires_at ? new Date(promotion.promotion_expires_at).toISOString().split("T")[0] : null;
      const createdAtStr = createdDate.toISOString().split("T")[0];
      let dayReach = 0;
      if (createdAtStr <= dateStr && (!expiresAt || expiresAt >= dateStr)) {
        dayReach = Math.round(reachCount / totalDaysActive);
      }
      reachOverTime.push({ date: dateStr, reach: dayReach });
    }
    let demographics = { byCity: [], byInterest: [], byAge: [] };
    const visitors = database_default.prepare(`
      SELECT DISTINCT visitor_id FROM smart_link_visits
      WHERE post_id = ? AND visitor_id IS NOT NULL
    `).all(promoId);
    const visitorIds = visitors.map((v) => v.visitor_id).filter(Boolean);
    if (visitorIds.length > 0) {
      const placeholders = visitorIds.map(() => "?").join(",");
      demographics.byCity = database_default.prepare(`
        SELECT location as city, COUNT(*) as count
        FROM users WHERE id IN (${placeholders}) AND location IS NOT NULL AND location != ''
        GROUP BY location ORDER BY count DESC LIMIT 10
      `).all(...visitorIds).map((c) => ({ city: c.city, count: c.count }));
      const interestUsers = database_default.prepare(`
        SELECT interests FROM users WHERE id IN (${placeholders}) AND interests IS NOT NULL AND interests != '[]'
      `).all(...visitorIds);
      const interestCounts = {};
      for (const user of interestUsers) {
        const interests = safeJsonParse(user.interests, []);
        for (const interest of interests) {
          const displayName = ARABIC_INTEREST_MAP[interest] || interest;
          interestCounts[displayName] = (interestCounts[displayName] || 0) + 1;
        }
      }
      demographics.byInterest = Object.entries(interestCounts).sort(([, a], [, b]) => b - a).slice(0, 10).map(([interest, count]) => ({ interest, count }));
      const ageUsers = database_default.prepare(`
        SELECT date_of_birth FROM users WHERE id IN (${placeholders}) AND date_of_birth IS NOT NULL AND date_of_birth != ''
      `).all(...visitorIds);
      const ageCounts = {};
      for (const user of ageUsers) {
        const age = calculateAge(user.date_of_birth);
        if (age > 0) {
          const range = ageToRange(age);
          ageCounts[range] = (ageCounts[range] || 0) + 1;
        }
      }
      const ageOrder = ["\u0623\u0642\u0644 \u0645\u0646 18", "18-24", "25-34", "35-44", "45-54", "55+"];
      demographics.byAge = ageOrder.filter((range) => ageCounts[range]).map((range) => ({ range, count: ageCounts[range] }));
    }
    let engagementMetrics = {};
    if (promotionType === "post") {
      engagementMetrics = {
        likes: promotion.likes || 0,
        comments: promotion.comments || 0,
        shares: promotion.shares || 0,
        saves: 0,
        // Posts don't have saves
        inquiries: 0,
        // Posts don't have inquiries
        clicks: promotion.click_count || 0
      };
    } else {
      engagementMetrics = {
        likes: 0,
        // Market listings don't have likes
        comments: 0,
        // Market listings don't have comments
        shares: promotion.shares_count || 0,
        saves: promotion.saves_count || 0,
        inquiries: promotion.inquiries_count || 0,
        views: promotion.views_count || 0
      };
    }
    const costPerImpression = reachCount > 0 && spending > 0 ? Math.round(spending / reachCount * 100) / 100 : 0;
    const costPerEngagement = engagement > 0 && spending > 0 ? Math.round(spending / engagement * 100) / 100 : 0;
    res.json({
      promotion: promotionDetails,
      reachOverTime,
      demographics,
      engagementMetrics,
      costAnalysis: {
        totalSpent: Math.round(spending),
        costPerImpression,
        costPerEngagement,
        estimatedReach,
        actualReach: reachCount,
        reachVsEstimated: estimatedReach > 0 ? Math.round(reachCount / estimatedReach * 100) : 0
      }
    });
  } catch (err) {
    console.error("[SmartReach] Promotion analytics error:", err.message);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u062A\u062D\u0644\u064A\u0644\u0627\u062A \u0627\u0644\u062A\u0631\u0648\u064A\u062C", details: err.message });
  }
});
router8.get("/suggestions", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const userId = payload.userId;
    autoExpirePromotions();
    const promotedPosts = getUserPromotedPosts(userId, true);
    const promotedListings = getUserPromotedListings(userId, true);
    const allPromotions = [
      ...promotedPosts.map((p) => ({ ...p, source_type: "post" })),
      ...promotedListings.map((l) => ({ ...l, source_type: "market" }))
    ];
    const postSpending = getPostPromotionSpending(userId);
    const marketSpending = getMarketPromotionSpending(userId);
    const allSpending = [...postSpending, ...marketSpending];
    const totalSpent = getTotalPromotionSpent(userId);
    let bestTier = null;
    let bestTierAvgReach = 0;
    const tierStats = {};
    for (const promo of allPromotions) {
      const tier = promo.tier || "basic";
      if (!tierStats[tier]) {
        tierStats[tier] = { count: 0, totalReach: 0 };
      }
      tierStats[tier].count++;
      tierStats[tier].totalReach += promo.reach_count || 0;
    }
    for (const [tier, data] of Object.entries(tierStats)) {
      const avgReach = data.count > 0 ? data.totalReach / data.count : 0;
      if (avgReach > bestTierAvgReach) {
        bestTierAvgReach = avgReach;
        bestTier = tier;
      }
    }
    if (!bestTier) {
      bestTier = "standard";
      bestTierAvgReach = 0;
    }
    const bestTierSuggestion = {
      tier: bestTier,
      tierName: TIER_NAMES_AR[bestTier] || bestTier,
      avgReach: Math.round(bestTierAvgReach),
      reason: allPromotions.length > 0 ? `\u062D\u0642\u0642\u062A \u0628\u0627\u0642\u0629 ${TIER_NAMES_AR[bestTier] || bestTier} \u0623\u0641\u0636\u0644 \u0645\u062A\u0648\u0633\u0637 \u0648\u0635\u0648\u0644 (${Math.round(bestTierAvgReach)} \u0645\u0634\u0627\u0647\u062F\u0629) \u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0628\u0627\u0642\u0627\u062A \u0627\u0644\u0623\u062E\u0631\u0649` : `\u0646\u0648\u0635\u064A \u0628\u0627\u0644\u0628\u062F\u0621 \u0628\u0627\u0642\u0629 ${TIER_NAMES_AR[bestTier] || bestTier} \u0643\u062E\u064A\u0627\u0631 \u0645\u062A\u0648\u0627\u0632\u0646 \u0628\u064A\u0646 \u0627\u0644\u062A\u0643\u0644\u0641\u0629 \u0648\u0627\u0644\u0648\u0635\u0648\u0644`
    };
    const demographics = buildDemographics(userId);
    const topCity = demographics.byCity.length > 0 ? demographics.byCity[0].city : null;
    const topInterest = demographics.byInterest.length > 0 ? demographics.byInterest[0].interest : null;
    const targetingStats = {
      all: { count: 0, totalReach: 0 },
      city: { count: 0, totalReach: 0 },
      interests: { count: 0, totalReach: 0 }
    };
    for (const promo of allPromotions) {
      const targeting = promo.targeting || "all";
      if (targetingStats[targeting]) {
        targetingStats[targeting].count++;
        targetingStats[targeting].totalReach += promo.reach_count || 0;
      }
    }
    let bestTargetingType = "all";
    let bestTargetingAvgReach = 0;
    for (const [type, data] of Object.entries(targetingStats)) {
      const avg = data.count > 0 ? data.totalReach / data.count : 0;
      if (avg > bestTargetingAvgReach) {
        bestTargetingAvgReach = avg;
        bestTargetingType = type;
      }
    }
    const recommendedTargeting = {
      type: bestTargetingType,
      typeName: TARGETING_NAMES_AR[bestTargetingType] || bestTargetingType,
      suggestedCity: topCity || "",
      suggestedInterests: demographics.byInterest.slice(0, 5).map((i) => i.interest),
      reason: allPromotions.length > 0 ? topCity ? `\u0623\u0641\u0636\u0644 \u0623\u062F\u0627\u0621 \u0643\u0627\u0646 \u0645\u0639 \u0627\u0644\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u062D\u0633\u0628 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 (${topCity}). \u062C\u0645\u0647\u0648\u0631\u0643 \u064A\u062A\u0631\u0643\u0632 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0645\u0646\u0637\u0642\u0629` : `\u0627\u0644\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0644\u0639\u0627\u0645 \u064A\u062D\u0642\u0642 \u0623\u0641\u0636\u0644 \u0648\u0635\u0648\u0644 \u062D\u0627\u0644\u064A\u0627\u064B. \u064A\u0645\u0643\u0646\u0643 \u062A\u062C\u0631\u0628\u0629 \u0627\u0644\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u062D\u0633\u0628 \u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A \u0644\u062A\u062D\u0633\u064A\u0646 \u0627\u0644\u062C\u0648\u062F\u0629` : "\u0627\u0628\u062F\u0623 \u0628\u0627\u0644\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0644\u0639\u0627\u0645 \u0644\u0644\u0648\u0635\u0648\u0644 \u0644\u0623\u0643\u0628\u0631 \u0634\u0631\u064A\u062D\u0629\u060C \u062B\u0645 \u062C\u0631\u0651\u0628 \u0627\u0644\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u062D\u0633\u0628 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0623\u0648 \u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A"
    };
    const hourlyEngagement = {};
    const dailyEngagement = {};
    for (const promo of allPromotions) {
      if (promo.created_at) {
        const date = new Date(promo.created_at);
        const hour = date.getHours();
        const day = date.getDay();
        hourlyEngagement[hour] = (hourlyEngagement[hour] || 0) + (promo.reach_count || 0);
        dailyEngagement[day] = (dailyEngagement[day] || 0) + (promo.reach_count || 0);
      }
    }
    const peakHours = Object.entries(hourlyEngagement).sort(([, a], [, b]) => b - a).slice(0, 3).map(([hour]) => parseInt(hour));
    const defaultPeakHours = [20, 21, 19];
    const recommendedHours = peakHours.length > 0 ? peakHours : defaultPeakHours;
    const dayNamesAr = ["\u0627\u0644\u0623\u062D\u062F", "\u0627\u0644\u0625\u062B\u0646\u064A\u0646", "\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621", "\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621", "\u0627\u0644\u062E\u0645\u064A\u0633", "\u0627\u0644\u062C\u0645\u0639\u0629", "\u0627\u0644\u0633\u0628\u062A"];
    const peakDays = Object.entries(dailyEngagement).sort(([, a], [, b]) => b - a).slice(0, 3).map(([day]) => parseInt(day));
    const defaultPeakDays = [4, 0, 5];
    const recommendedDays = peakDays.length > 0 ? peakDays : defaultPeakDays;
    const optimalPostingTimes = {
      bestHours: recommendedHours.map((h) => `${h}:00`),
      bestDays: recommendedDays.map((d) => dayNamesAr[d]),
      reason: allPromotions.length > 0 ? `\u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A\u0643\u060C \u0623\u0641\u0636\u0644 \u0623\u0648\u0642\u0627\u062A \u0627\u0644\u0646\u0634\u0631 \u0647\u064A ${recommendedHours.map((h) => `\u0627\u0644\u0633\u0627\u0639\u0629 ${h}:00`).join("\u060C ")} \u0641\u064A \u0623\u064A\u0627\u0645 ${recommendedDays.map((d) => dayNamesAr[d]).join(" \u0648")}` : "\u0623\u0641\u0636\u0644 \u0623\u0648\u0642\u0627\u062A \u0627\u0644\u0646\u0634\u0631 \u0644\u0644\u062C\u0645\u0647\u0648\u0631 \u0627\u0644\u0645\u0635\u0631\u064A \u0647\u064A \u0645\u0646 7 \u0645\u0633\u0627\u0621\u064B \u0625\u0644\u0649 10 \u0645\u0633\u0627\u0621\u064B\u060C \u062E\u0627\u0635\u0629 \u0623\u064A\u0627\u0645 \u0627\u0644\u062E\u0645\u064A\u0633 \u0648\u0627\u0644\u0623\u062D\u062F"
    };
    const avgSpendPerPromotion = allSpending.length > 0 ? totalSpent / allSpending.length : 0;
    const avgReachPerEGP = totalSpent > 0 ? allPromotions.reduce((sum, p) => sum + (p.reach_count || 0), 0) / totalSpent : 0;
    const tierPrices = {
      basic: { min: 25, recommended: 50, max: 100 },
      standard: { min: 75, recommended: 150, max: 300 },
      premium: { min: 200, recommended: 400, max: 800 },
      vip: { min: 500, recommended: 1e3, max: 2e3 }
    };
    const recommendedBudget = tierPrices[bestTier] || tierPrices.standard;
    const budgetRecommendations = {
      currentAvgSpendPerPromotion: Math.round(avgSpendPerPromotion),
      estimatedReachPerEGP: Math.round(avgReachPerEGP * 10) / 10,
      recommended: {
        tier: bestTier,
        tierName: TIER_NAMES_AR[bestTier] || bestTier,
        minBudget: recommendedBudget.min,
        recommendedBudget: recommendedBudget.recommended,
        maxBudget: recommendedBudget.max,
        estimatedReachAtRecommended: Math.round(recommendedBudget.recommended * (avgReachPerEGP || 5))
      },
      reason: allPromotions.length > 0 ? `\u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0623\u062F\u0627\u0626\u0643 \u0627\u0644\u062D\u0627\u0644\u064A\u060C \u0646\u0648\u0635\u064A \u0628\u0645\u064A\u0632\u0627\u0646\u064A\u0629 ${recommendedBudget.recommended} \u062C.\u0645 \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0623\u0641\u0636\u0644 \u0639\u0627\u0626\u062F \u0639\u0644\u0649 \u0627\u0644\u0627\u0633\u062A\u062B\u0645\u0627\u0631 \u0641\u064A \u0628\u0627\u0642\u0629 ${TIER_NAMES_AR[bestTier]}` : `\u0646\u0648\u0635\u064A \u0628\u0627\u0644\u0628\u062F\u0621 \u0628\u0645\u064A\u0632\u0627\u0646\u064A\u0629 ${recommendedBudget.recommended} \u062C.\u0645 \u0641\u064A \u0628\u0627\u0642\u0629 ${TIER_NAMES_AR[bestTier]} \u0644\u062A\u062D\u0642\u064A\u0642 \u062A\u0648\u0627\u0632\u0646 \u0628\u064A\u0646 \u0627\u0644\u062A\u0643\u0644\u0641\u0629 \u0648\u0627\u0644\u0648\u0635\u0648\u0644`
    };
    const tips = [];
    if (allPromotions.length > 0) {
      const postsWithoutImages = promotedPosts.filter((p) => !p.image || p.image === "");
      if (postsWithoutImages.length > promotedPosts.length * 0.5) {
        tips.push({
          tip: "\u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0628\u0627\u0644\u0635\u0648\u0631 \u062A\u062D\u0635\u0644 \u0639\u0644\u0649 \u0648\u0635\u0648\u0644 \u0623\u0639\u0644\u0649 \u0628\u0646\u0633\u0628\u0629 \u062A\u0635\u0644 \u0625\u0644\u0649 150%. \u0623\u0636\u0641 \u0635\u0648\u0631\u0627\u064B \u062C\u0630\u0627\u0628\u0629 \u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A\u0643 \u0627\u0644\u0645\u0631\u0648\u0651\u062C\u0629",
          priority: "high"
        });
      }
    }
    const allTargetingCount = targetingStats.all?.count || 0;
    const targetedCount = (targetingStats.city?.count || 0) + (targetingStats.interests?.count || 0);
    if (allTargetingCount > 0 && targetedCount === 0) {
      tips.push({
        tip: "\u062C\u0631\u0651\u0628 \u0627\u0644\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u062D\u0633\u0628 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0623\u0648 \u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A \u0644\u0644\u0648\u0635\u0648\u0644 \u0644\u062C\u0645\u0647\u0648\u0631 \u0623\u0643\u062B\u0631 \u062A\u0641\u0627\u0639\u0644\u0627\u064B \u0645\u0639 \u0645\u062D\u062A\u0648\u0627\u0643",
        priority: "medium"
      });
    }
    if (avgSpendPerPromotion > 0 && avgSpendPerPromotion < recommendedBudget.recommended * 0.5) {
      tips.push({
        tip: `\u0645\u062A\u0648\u0633\u0637 \u0625\u0646\u0641\u0627\u0642\u0643 (${Math.round(avgSpendPerPromotion)} \u062C.\u0645) \u0623\u0642\u0644 \u0645\u0646 \u0627\u0644\u0645\u0648\u0635\u0649 \u0628\u0647. \u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629 \u064A\u0645\u0643\u0646 \u0623\u0646 \u062A\u062D\u0633\u0651\u0646 \u0627\u0644\u0648\u0635\u0648\u0644 \u0628\u0634\u0643\u0644 \u0643\u0628\u064A\u0631`,
        priority: "medium"
      });
    }
    if (allSpending.length < 3) {
      tips.push({
        tip: "\u0627\u0644\u0627\u0633\u062A\u0645\u0631\u0627\u0631\u064A\u0629 \u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0646\u062C\u0627\u062D. \u0631\u0648\u0651\u062C \u0645\u062D\u062A\u0648\u0627\u0643 \u0628\u0627\u0646\u062A\u0638\u0627\u0645 \u0644\u0628\u0646\u0627\u0621 \u062C\u0645\u0647\u0648\u0631 \u0645\u0633\u062A\u0642\u0631 \u0648\u0645\u062A\u0632\u0627\u064A\u062F",
        priority: "low"
      });
    }
    if (promotedPosts.length > 0 && promotedListings.length === 0) {
      tips.push({
        tip: "\u062C\u0631\u0651\u0628 \u062A\u0631\u0648\u064A\u062C \u0625\u0639\u0644\u0627\u0646\u0627\u062A\u0643 \u0641\u064A \u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0630\u0643\u064A! \u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0627\u0644\u0633\u0648\u0642 \u062A\u062D\u0642\u0642 \u062A\u0641\u0627\u0639\u0644\u0627\u064B \u0623\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0627\u0644\u0639\u0627\u062F\u064A\u0629",
        priority: "medium"
      });
    }
    res.json({
      bestPerformingTier: bestTierSuggestion,
      recommendedTargeting,
      optimalPostingTimes,
      budgetRecommendations,
      tips,
      dataPoints: allPromotions.length
    });
  } catch (err) {
    console.error("[SmartReach] Suggestions error:", err.message);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0642\u062A\u0631\u0627\u062D\u0627\u062A \u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0630\u0643\u064A", details: err.message });
  }
});
router8.get("/compare", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const userId = payload.userId;
    autoExpirePromotions();
    const promotedPosts = getUserPromotedPosts(userId);
    const promotedListings = getUserPromotedListings(userId);
    const allPromotions = [
      ...promotedPosts.map((p) => ({ ...p, source_type: "post" })),
      ...promotedListings.map((l) => ({ ...l, source_type: "market" }))
    ];
    const postSpending = getPostPromotionSpending(userId);
    const marketSpending = getMarketPromotionSpending(userId);
    const allSpending = [...postSpending, ...marketSpending];
    const spendingMap = {};
    for (const s of allSpending) {
      const promoId = s.post_id || s.listing_id;
      if (promoId) {
        spendingMap[promoId] = (spendingMap[promoId] || 0) + (s.price || 0);
      }
    }
    const tierComparison = {};
    for (const promo of allPromotions) {
      const tier = promo.tier || "basic";
      if (!tierComparison[tier]) {
        tierComparison[tier] = {
          count: 0,
          totalReach: 0,
          avgReach: 0,
          totalEngagement: 0,
          avgEngagement: 0,
          totalSpent: 0,
          avgSpent: 0,
          reachPerEGP: 0
        };
      }
      tierComparison[tier].count++;
      tierComparison[tier].totalReach += promo.reach_count || 0;
      tierComparison[tier].totalEngagement += promo.total_engagement || 0;
    }
    for (const s of allSpending) {
      const tier = s.tier || "basic";
      if (tierComparison[tier]) {
        tierComparison[tier].totalSpent += s.price || 0;
      }
    }
    const tierComparisonResult = Object.entries(tierComparison).map(([tier, data]) => ({
      tier: TIER_NAMES_AR[tier] || tier,
      tierRaw: tier,
      count: data.count,
      totalReach: data.totalReach,
      avgReach: data.count > 0 ? Math.round(data.totalReach / data.count) : 0,
      totalEngagement: data.totalEngagement,
      avgEngagement: data.count > 0 ? Math.round(data.totalEngagement / data.count) : 0,
      totalSpent: Math.round(data.totalSpent),
      avgSpent: data.count > 0 ? Math.round(data.totalSpent / data.count) : 0,
      reachPerEGP: data.totalSpent > 0 ? Math.round(data.totalReach / data.totalSpent * 100) / 100 : 0
    })).sort((a, b) => (TIER_ORDER[b.tierRaw] || 0) - (TIER_ORDER[a.tierRaw] || 0));
    const targetingComparison = {};
    for (const promo of allPromotions) {
      const targeting = promo.targeting || "all";
      if (!targetingComparison[targeting]) {
        targetingComparison[targeting] = {
          count: 0,
          totalReach: 0,
          avgReach: 0,
          totalEngagement: 0,
          avgEngagement: 0
        };
      }
      targetingComparison[targeting].count++;
      targetingComparison[targeting].totalReach += promo.reach_count || 0;
      targetingComparison[targeting].totalEngagement += promo.total_engagement || 0;
    }
    const targetingComparisonResult = Object.entries(targetingComparison).map(([type, data]) => ({
      type,
      typeName: TARGETING_NAMES_AR[type] || type,
      count: data.count,
      totalReach: data.totalReach,
      avgReach: data.count > 0 ? Math.round(data.totalReach / data.count) : 0,
      totalEngagement: data.totalEngagement,
      avgEngagement: data.count > 0 ? Math.round(data.totalEngagement / data.count) : 0
    }));
    const contentTypeComparison = {
      post: {
        count: promotedPosts.length,
        totalReach: promotedPosts.reduce((sum, p) => sum + (p.reach_count || 0), 0),
        avgReach: promotedPosts.length > 0 ? Math.round(promotedPosts.reduce((sum, p) => sum + (p.reach_count || 0), 0) / promotedPosts.length) : 0,
        totalEngagement: promotedPosts.reduce((sum, p) => sum + (p.total_engagement || 0), 0),
        avgEngagement: promotedPosts.length > 0 ? Math.round(promotedPosts.reduce((sum, p) => sum + (p.total_engagement || 0), 0) / promotedPosts.length) : 0
      },
      market: {
        count: promotedListings.length,
        totalReach: promotedListings.reduce((sum, l) => sum + (l.reach_count || 0), 0),
        avgReach: promotedListings.length > 0 ? Math.round(promotedListings.reduce((sum, l) => sum + (l.reach_count || 0), 0) / promotedListings.length) : 0,
        totalEngagement: promotedListings.reduce((sum, l) => sum + (l.total_engagement || 0), 0),
        avgEngagement: promotedListings.length > 0 ? Math.round(promotedListings.reduce((sum, l) => sum + (l.total_engagement || 0), 0) / promotedListings.length) : 0
      }
    };
    const crossComparison = {};
    for (const promo of allPromotions) {
      const tier = promo.tier || "basic";
      const targeting = promo.targeting || "all";
      if (!crossComparison[tier]) crossComparison[tier] = {};
      if (!crossComparison[tier][targeting]) {
        crossComparison[tier][targeting] = { count: 0, avgReach: 0 };
      }
      crossComparison[tier][targeting].count++;
      crossComparison[tier][targeting].avgReach += promo.reach_count || 0;
    }
    const crossComparisonResult = Object.entries(crossComparison).map(([tier, targetingData]) => ({
      tier: TIER_NAMES_AR[tier] || tier,
      tierRaw: tier,
      targeting: Object.entries(targetingData).map(([targeting, data]) => ({
        type: targeting,
        typeName: TARGETING_NAMES_AR[targeting] || targeting,
        count: data.count,
        avgReach: data.count > 0 ? Math.round(data.avgReach / data.count) : 0
      }))
    })).sort((a, b) => (TIER_ORDER[b.tierRaw] || 0) - (TIER_ORDER[a.tierRaw] || 0));
    res.json({
      tierComparison: tierComparisonResult,
      targetingComparison: targetingComparisonResult,
      contentTypeComparison,
      crossComparison: crossComparisonResult,
      summary: {
        totalPromotions: allPromotions.length,
        bestTier: tierComparisonResult.length > 0 ? tierComparisonResult.reduce(
          (best, curr) => curr.avgReach > best.avgReach ? curr : best
        ).tier : null,
        bestTargeting: targetingComparisonResult.length > 0 ? targetingComparisonResult.reduce(
          (best, curr) => curr.avgReach > best.avgReach ? curr : best
        ).typeName : null,
        bestContentType: contentTypeComparison.post.avgReach > contentTypeComparison.market.avgReach ? "\u0645\u0646\u0634\u0648\u0631\u0627\u062A" : contentTypeComparison.market.count > 0 ? "\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0627\u0644\u0633\u0648\u0642" : "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0643\u0627\u0641\u064A\u0629"
      }
    });
  } catch (err) {
    console.error("[SmartReach] Compare error:", err.message);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0645\u0642\u0627\u0631\u0646\u0629 \u0627\u0644\u0623\u062F\u0627\u0621", details: err.message });
  }
});
router8.get("/realtime", authMiddleware, (req, res) => {
  try {
    const payload = req.user;
    const userId = payload.userId;
    autoExpirePromotions();
    const activePostPromotions = database_default.prepare(`
      SELECT
        p.id,
        p.content as title,
        p.promotion_tier as tier,
        p.reach_count,
        p.click_count,
        (COALESCE(p.likes, 0) + COALESCE(p.comments, 0) + COALESCE(p.shares, 0)) as total_engagement,
        p.promotion_started_at as startedAt,
        p.promotion_expires_at as expiresAt,
        p.targeting,
        p.target_city,
        p.target_interests,
        p.estimated_reach,
        p.created_at,
        'post' as source_type,
        u.name as author_name,
        u.avatar as author_avatar
      FROM posts p
      LEFT JOIN users u ON u.id = p.author_id
      WHERE p.author_id = ? AND p.is_promoted = 1 AND p.promotion_status = 'approved'
        AND p.status = 'active'
        AND (p.promotion_expires_at IS NULL OR p.promotion_expires_at >= datetime('now'))
      ORDER BY p.promotion_tier = 'vip' DESC, p.promotion_tier = 'premium' DESC,
               p.promotion_tier = 'standard' DESC, p.promotion_tier = 'basic' DESC,
               p.reach_count DESC
    `).all(userId);
    const activeMarketPromotions = database_default.prepare(`
      SELECT
        ml.id,
        ml.title,
        ml.promotion_tier as tier,
        ml.reach_count,
        ml.views_count,
        ml.saves_count,
        ml.inquiries_count,
        ml.shares_count,
        (COALESCE(ml.saves_count, 0) + COALESCE(ml.inquiries_count, 0) + COALESCE(ml.shares_count, 0)) as total_engagement,
        ml.promotion_started_at as startedAt,
        ml.promotion_expires_at as expiresAt,
        ml.targeting,
        ml.target_city,
        ml.target_interests,
        ml.estimated_reach,
        ml.created_at,
        'market' as source_type,
        u.name as author_name,
        u.avatar as author_avatar
      FROM market_listings ml
      LEFT JOIN users u ON u.id = ml.seller_id
      WHERE ml.seller_id = ? AND ml.is_promoted = 1 AND ml.promotion_status = 'approved'
        AND ml.status = 'active'
        AND (ml.promotion_expires_at IS NULL OR ml.promotion_expires_at >= datetime('now'))
      ORDER BY ml.promotion_tier = 'vip' DESC, ml.promotion_tier = 'premium' DESC,
               ml.promotion_tier = 'standard' DESC, ml.promotion_tier = 'basic' DESC,
               ml.reach_count DESC
    `).all(userId);
    const formatPromotion = (promo) => {
      const expiresAt = promo.expiresAt ? new Date(promo.expiresAt) : null;
      const now = /* @__PURE__ */ new Date();
      const timeRemaining = expiresAt ? Math.max(0, expiresAt.getTime() - now.getTime()) : null;
      let remainingStr = "\u0646\u0634\u0637";
      if (timeRemaining !== null) {
        const hours = Math.floor(timeRemaining / 36e5);
        const minutes = Math.floor(timeRemaining % 36e5 / 6e4);
        if (hours > 24) {
          remainingStr = `${Math.floor(hours / 24)} \u064A\u0648\u0645 ${hours % 24} \u0633\u0627\u0639\u0629`;
        } else if (hours > 0) {
          remainingStr = `${hours} \u0633\u0627\u0639\u0629 ${minutes} \u062F\u0642\u064A\u0642\u0629`;
        } else {
          remainingStr = `${minutes} \u062F\u0642\u064A\u0642\u0629`;
        }
      }
      const estimatedReach = promo.estimated_reach || 0;
      const reachProgress = estimatedReach > 0 ? Math.min(100, Math.round((promo.reach_count || 0) / estimatedReach * 100)) : 0;
      return {
        id: promo.id,
        type: promo.source_type,
        title: promo.source_type === "post" ? promo.title?.substring(0, 80) || "\u0645\u0646\u0634\u0648\u0631 \u0628\u062F\u0648\u0646 \u0645\u062D\u062A\u0648\u0649" : promo.title || "\u0625\u0639\u0644\u0627\u0646 \u0628\u062F\u0648\u0646 \u0639\u0646\u0648\u0627\u0646",
        tier: TIER_NAMES_AR[promo.tier] || promo.tier,
        tierRaw: promo.tier,
        reachCount: promo.reach_count || 0,
        engagement: promo.total_engagement || 0,
        estimatedReach,
        reachProgress,
        targeting: TARGETING_NAMES_AR[promo.targeting] || promo.targeting,
        targetCity: promo.target_city || "",
        targetInterests: safeJsonParse(promo.target_interests, []),
        startedAt: promo.startedAt || promo.created_at,
        expiresAt: promo.expiresAt,
        timeRemaining: remainingStr,
        isExpired: timeRemaining !== null && timeRemaining <= 0,
        authorName: promo.author_name || "",
        authorAvatar: promo.author_avatar || "",
        // Market-specific fields
        ...promo.source_type === "market" ? {
          viewsCount: promo.views_count || 0,
          savesCount: promo.saves_count || 0,
          inquiriesCount: promo.inquiries_count || 0
        } : {
          clickCount: promo.click_count || 0
        }
      };
    };
    const activePromotions = [
      ...activePostPromotions.map(formatPromotion),
      ...activeMarketPromotions.map(formatPromotion)
    ].sort((a, b) => (TIER_ORDER[b.tierRaw] || 0) - (TIER_ORDER[a.tierRaw] || 0));
    const totalActiveReach = activePromotions.reduce((sum, p) => sum + p.reachCount, 0);
    const totalActiveEngagement = activePromotions.reduce((sum, p) => sum + p.engagement, 0);
    const recentlyExpiredPosts = database_default.prepare(`
      SELECT id, content as title, reach_count, promotion_tier as tier,
             promotion_expires_at, 'post' as source_type
      FROM posts
      WHERE author_id = ? AND promotion_status = 'expired'
        AND promotion_expires_at >= datetime('now', '-1 day')
        AND status = 'active'
    `).all(userId);
    const recentlyExpiredListings = database_default.prepare(`
      SELECT id, title, reach_count, promotion_tier as tier,
             promotion_expires_at, 'market' as source_type
      FROM market_listings
      WHERE seller_id = ? AND promotion_status = 'expired'
        AND promotion_expires_at >= datetime('now', '-1 day')
        AND status = 'active'
    `).all(userId);
    const recentlyExpired = [
      ...recentlyExpiredPosts.map((p) => ({
        id: p.id,
        type: p.source_type,
        title: p.source_type === "post" ? p.title?.substring(0, 80) || "\u0645\u0646\u0634\u0648\u0631" : p.title || "\u0625\u0639\u0644\u0627\u0646",
        tier: TIER_NAMES_AR[p.tier] || p.tier,
        finalReach: p.reach_count || 0,
        expiredAt: p.promotion_expires_at
      })),
      ...recentlyExpiredListings.map((l) => ({
        id: l.id,
        type: l.source_type,
        title: l.title || "\u0625\u0639\u0644\u0627\u0646",
        tier: TIER_NAMES_AR[l.tier] || l.tier,
        finalReach: l.reach_count || 0,
        expiredAt: l.promotion_expires_at
      }))
    ];
    res.json({
      activePromotions,
      recentlyExpired,
      aggregate: {
        totalActive: activePromotions.length,
        totalActiveReach,
        totalActiveEngagement,
        avgReachPerPromotion: activePromotions.length > 0 ? Math.round(totalActiveReach / activePromotions.length) : 0,
        avgEngagementPerPromotion: activePromotions.length > 0 ? Math.round(totalActiveEngagement / activePromotions.length) : 0
      },
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("[SmartReach] Realtime error:", err.message);
    res.status(500).json({ error: "\u0641\u0634\u0644 \u062C\u0644\u0628 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629", details: err.message });
  }
});
var smartReach_default = router8;

// src/routes/ai.ts
import { Router as Router9 } from "express";
init_auth();
import ZAI from "z-ai-web-dev-sdk";
var router9 = Router9();
var packageNameAr = {
  basic: "\u0623\u0633\u0627\u0633\u064A",
  standard: "\u0642\u064A\u0627\u0633\u064A",
  premium: "\u0645\u0645\u064A\u0632",
  vip: "VIP",
  city_target: "\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0645\u062F\u0646",
  interest_target: "\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A"
};
function arPkg(pkg) {
  return packageNameAr[pkg] || pkg;
}
function replacePkgNamesInText(text) {
  if (!text) return text;
  let result = text;
  for (const [eng, ar] of Object.entries(packageNameAr)) {
    const regex = new RegExp(`\\b${eng}\\b`, "g");
    result = result.replace(regex, ar);
  }
  return result;
}
var zaiInstance = null;
var aiAvailable = null;
var aiCheckTime = 0;
async function getAI() {
  if (aiAvailable === false && Date.now() - aiCheckTime < 5 * 60 * 1e3) {
    return null;
  }
  try {
    if (!zaiInstance) {
      zaiInstance = await ZAI.create();
    }
    aiAvailable = true;
    return zaiInstance;
  } catch (error) {
    aiAvailable = false;
    aiCheckTime = Date.now();
    console.log("[AI] SDK unavailable - using fallback responses for 5 minutes");
    return null;
  }
}
async function tryAICompletion(messages, options = {}) {
  const zai = await getAI();
  if (!zai) return null;
  try {
    const completion = await zai.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 800
    });
    return completion.choices?.[0]?.message?.content || null;
  } catch (error) {
    aiAvailable = false;
    aiCheckTime = Date.now();
    console.log("[AI] API request failed - switching to fallback for 5 minutes");
    return null;
  }
}
function getPostById(postId) {
  const db2 = database_default;
  const row = db2.prepare("SELECT * FROM posts WHERE id = ?").get(postId);
  return row || null;
}
function getUserById(userId) {
  const db2 = database_default;
  const row = db2.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  return row || null;
}
router9.post("/auto-target", optionalAuth, async (req, res) => {
  try {
    const { postId, content, category, price, location } = req.body;
    const userId = req.user?.userId;
    if (!content && !postId) {
      const categoryToInterests = {
        phones: ["phones", "electronics"],
        electronics: ["electronics", "phones"],
        cars: ["cars"],
        realEstate: ["realEstate"],
        games: ["games", "electronics"],
        fashion: ["fashion", "beauty"],
        beauty: ["beauty", "fashion"],
        sports: ["sports"],
        food: ["food"],
        jobs: ["jobs", "education"],
        services: ["services", "jobs"],
        education: ["education", "books"],
        books: ["books", "education"],
        animals: ["animals"],
        travel: ["travel", "photography"],
        photography: ["photography", "travel"],
        health: ["health", "beauty"]
      };
      let userCategory = category || "other";
      let userContent = "";
      if (userId) {
        try {
          const lastPost = database_default.prepare("SELECT category, content FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 1").get(userId);
          if (lastPost) {
            userCategory = lastPost.category || userCategory;
            userContent = lastPost.content || "";
          }
        } catch {
        }
      }
      const aiContent2 = await tryAICompletion([
        {
          role: "system",
          content: `\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u062A\u0633\u0648\u064A\u0642 \u0639\u0644\u0649 \u0645\u0646\u0635\u0629 "\u0646\u0648\u0627\u0642\u0635". \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0644\u0645 \u064A\u062D\u062F\u062F \u0645\u0646\u0634\u0648\u0631\u0627\u064B \u0628\u0639\u064A\u0646\u0647.
\u062D\u0644\u0644 \u0646\u0634\u0627\u0637\u0647 \u0627\u0644\u0639\u0627\u0645 \u0648\u0627\u0642\u062A\u0631\u062D \u0623\u0641\u0636\u0644 \u0627\u0633\u062A\u0647\u062F\u0627\u0641. \u0623\u062C\u0628 \u0628\u0640 JSON \u0641\u0642\u0637:
{
  "suggestedInterests": ["interest1", "interest2"],
  "suggestedCities": ["\u0645\u062F\u064A\u0646\u06291"],
  "suggestedAgeRange": {"min": 18, "max": 45},
  "suggestedPackage": "basic|standard|premium|vip|city_target|interest_target",
  "confidence": 0.4,
  "reasoning": "\u0634\u0631\u062D \u0628\u0627\u0644\u0639\u0631\u0628\u064A",
  "contentSuggestions": ["\u0627\u0642\u062A\u0631\u0627\u062D1"],
  "estimatedReachMultiplier": 1.0
}`
        },
        {
          role: "user",
          content: `\u0644\u0645 \u0623\u062D\u062F\u062F \u0645\u0646\u0634\u0648\u0631\u0627\u064B \u0645\u062D\u062F\u062F\u0627\u064B. \u062A\u0635\u0646\u064A\u0641 \u0646\u0634\u0627\u0637\u064A: ${userCategory}. \u0645\u062D\u062A\u0648\u0649 \u0622\u062E\u0631 \u0645\u0646\u0634\u0648\u0631: ${userContent.slice(0, 200)}`
        }
      ]);
      if (aiContent2) {
        try {
          const jsonMatch = aiContent2.match(/\{[\s\S]*\}/);
          const aiResult2 = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
          if (aiResult2) {
            if (aiResult2.suggestedPackage) {
              aiResult2.suggestedPackage = arPkg(aiResult2.suggestedPackage);
            }
            return res.json({ success: true, data: aiResult2 });
          }
        } catch {
        }
      }
      return res.json({
        success: true,
        data: {
          suggestedInterests: categoryToInterests[userCategory] || ["other"],
          suggestedCities: [location || "\u0627\u0644\u0642\u0627\u0647\u0631\u0629"],
          suggestedAgeRange: { min: 18, max: 45 },
          suggestedPackage: arPkg("standard"),
          confidence: 0.4,
          reasoning: "\u0644\u0645 \u064A\u062A\u0645 \u062A\u062D\u062F\u064A\u062F \u0645\u0646\u0634\u0648\u0631 \u0645\u062D\u062F\u062F. \u0647\u0630\u0647 \u0627\u0642\u062A\u0631\u0627\u062D\u0627\u062A \u0639\u0627\u0645\u0629 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0646\u0634\u0627\u0637\u0643. \u0627\u062E\u062A\u0631 \u0645\u0646\u0634\u0648\u0631\u0627\u064B \u0645\u062D\u062F\u062F\u0627\u064B \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0623\u062F\u0642.",
          contentSuggestions: ["\u0627\u062E\u062A\u0631 \u0645\u0646\u0634\u0648\u0631\u0627\u064B \u0645\u062D\u062F\u062F\u0627\u064B \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0623\u0643\u062B\u0631 \u062F\u0642\u0629", "\u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u062C\u0648\u062F\u0629", "\u062D\u062F\u062F \u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u0644\u0645\u0648\u0642\u0639 \u0628\u0648\u0636\u0648\u062D"],
          estimatedReachMultiplier: 1
        }
      });
    }
    let postData = {};
    if (postId) {
      const post = getPostById(postId);
      if (post) {
        postData = {
          content: post.content || "",
          category: post.category || "",
          price: post.price || 0,
          location: post.location || "",
          type: post.type || ""
        };
      }
    }
    const postContent = content || postData.content || "";
    const postCategory = category || postData.category || "";
    const postPrice = price || postData.price || 0;
    const postLocation = location || postData.location || "";
    const aiContent = await tryAICompletion([
      {
        role: "system",
        content: `\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u062A\u0633\u0648\u064A\u0642 \u0648\u062A\u0631\u0648\u064A\u062C \u0639\u0644\u0649 \u0645\u0646\u0635\u0629 \u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0630\u0643\u064A\u0629 \u0641\u064A \u0645\u0635\u0631 \u0627\u0633\u0645\u0647\u0627 "\u0646\u0648\u0627\u0642\u0635".
\u062A\u062D\u0644\u0644 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0648\u062A\u0642\u062A\u0631\u062D \u0623\u0641\u0636\u0644 \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0644\u0644\u062A\u0631\u0648\u064A\u062C.

\u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u062A\u0627\u062D\u0629: phones, electronics, games, cars, realEstate, fashion, beauty, sports, food, jobs, services, education, books, animals, travel, photography, health, other

\u0627\u0644\u0645\u062F\u0646 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629: \u0627\u0644\u0642\u0627\u0647\u0631\u0629\u060C \u0627\u0644\u062C\u064A\u0632\u0629\u060C \u0627\u0644\u0625\u0633\u0643\u0646\u062F\u0631\u064A\u0629\u060C \u0627\u0644\u0645\u0646\u0635\u0648\u0631\u0629\u060C \u0637\u0646\u0637\u0627\u060C \u0627\u0644\u0632\u0642\u0627\u0632\u064A\u0642\u060C \u0628\u0648\u0631\u0633\u0639\u064A\u062F\u060C \u0627\u0644\u0633\u0648\u064A\u0633\u060C \u0627\u0644\u0625\u0633\u0645\u0627\u0639\u064A\u0644\u064A\u0629\u060C \u0627\u0644\u0641\u064A\u0648\u0645\u060C \u0623\u0633\u064A\u0648\u0637\u060C \u0627\u0644\u0645\u0646\u064A\u0627\u060C \u0633\u0648\u0647\u0627\u062C\u060C \u0642\u0646\u0627\u060C \u0627\u0644\u0623\u0642\u0635\u0631\u060C \u0623\u0633\u0648\u0627\u0646\u060C \u062F\u0645\u064A\u0627\u0637\u060C \u0643\u0641\u0631 \u0627\u0644\u0634\u064A\u062E\u060C \u0628\u0646\u0647\u0627\u060C \u0634\u0628\u064A\u0646 \u0627\u0644\u0643\u0648\u0645\u060C \u0645\u0631\u0633\u0649 \u0645\u0637\u0631\u0648\u062D\u060C \u0627\u0644\u063A\u0631\u062F\u0642\u0629\u060C \u0634\u0631\u0645 \u0627\u0644\u0634\u064A\u062E\u060C \u062F\u0647\u0628\u060C \u0627\u0644\u0639\u0631\u064A\u0634\u060C \u0627\u0644\u062A\u062C\u0645\u0639 \u0627\u0644\u062E\u0627\u0645\u0633\u060C \u0646\u0635\u0631

\u0623\u062C\u0628 \u062F\u0627\u0626\u0645\u0627\u064B \u0628\u0640 JSON \u0641\u0642\u0637 \u0628\u0627\u0644\u0634\u0643\u0644 \u0627\u0644\u062A\u0627\u0644\u064A:
{
  "suggestedInterests": ["interest1", "interest2"],
  "suggestedCities": ["\u0645\u062F\u064A\u0646\u06291", "\u0645\u062F\u064A\u0646\u06292"],
  "suggestedAgeRange": {"min": 18, "max": 45},
  "suggestedPackage": "basic|standard|premium|vip|city_target|interest_target",
  "confidence": 0.85,
  "reasoning": "\u0634\u0631\u062D \u0628\u0627\u0644\u0639\u0631\u0628\u064A \u0644\u0645\u0627\u0630\u0627 \u0647\u0630\u0627 \u0627\u0644\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0645\u0646\u0627\u0633\u0628",
  "contentSuggestions": ["\u0627\u0642\u062A\u0631\u0627\u062D1 \u0644\u062A\u062D\u0633\u064A\u0646 \u0627\u0644\u0645\u0646\u0634\u0648\u0631", "\u0627\u0642\u062A\u0631\u0627\u062D2"],
  "estimatedReachMultiplier": 1.5
}`
      },
      {
        role: "user",
        content: `\u062D\u0644\u0644 \u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0648\u0627\u0642\u062A\u0631\u062D \u0623\u0641\u0636\u0644 \u0627\u0633\u062A\u0647\u062F\u0627\u0641:
\u0627\u0644\u0645\u062D\u062A\u0648\u0649: ${postContent}
\u0627\u0644\u062A\u0635\u0646\u064A\u0641: ${postCategory}
\u0627\u0644\u0633\u0639\u0631: ${postPrice} \u062C.\u0645
\u0627\u0644\u0645\u0648\u0642\u0639: ${postLocation}
${userId ? `\u0631\u0642\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userId}` : ""}`
      }
    ], { max_tokens: 1e3 });
    let aiResult;
    try {
      const content2 = aiContent || "";
      const jsonMatch = content2.match(/\{[\s\S]*\}/);
      aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      if (aiResult.suggestedPackage) {
        aiResult.suggestedPackage = arPkg(aiResult.suggestedPackage);
      }
    } catch {
      aiResult = {
        suggestedInterests: [postCategory || "other"],
        suggestedCities: [postLocation || "\u0627\u0644\u0642\u0627\u0647\u0631\u0629"],
        suggestedAgeRange: { min: 18, max: 45 },
        suggestedPackage: arPkg("standard"),
        confidence: 0.5,
        reasoning: "\u062A\u062D\u0644\u064A\u0644 \u0623\u0633\u0627\u0633\u064A \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0645\u0646\u0634\u0648\u0631",
        contentSuggestions: [],
        estimatedReachMultiplier: 1
      };
    }
    res.json({ success: true, data: aiResult });
  } catch (error) {
    console.error("[AI] Auto-target error:", error.message);
    const { content, category, price, location } = req.body;
    const categoryToInterests = {
      phones: ["phones", "electronics"],
      electronics: ["electronics", "phones"],
      cars: ["cars"],
      realEstate: ["realEstate"],
      games: ["games", "electronics"],
      fashion: ["fashion", "beauty"],
      beauty: ["beauty", "fashion"],
      sports: ["sports"],
      food: ["food"],
      jobs: ["jobs", "education"],
      services: ["services", "jobs"],
      education: ["education", "books"],
      books: ["books", "education"],
      animals: ["animals"],
      travel: ["travel", "photography"],
      photography: ["photography", "travel"],
      health: ["health", "beauty"]
    };
    const cat = category || "other";
    res.json({
      success: true,
      data: {
        suggestedInterests: categoryToInterests[cat] || ["other"],
        suggestedCities: [location || "\u0627\u0644\u0642\u0627\u0647\u0631\u0629"],
        suggestedAgeRange: { min: 18, max: 45 },
        suggestedPackage: price && price > 5e3 ? arPkg("premium") : arPkg("standard"),
        confidence: 0.6,
        reasoning: `\u0627\u0642\u062A\u0631\u0627\u062D \u062A\u0644\u0642\u0627\u0626\u064A \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 (${cat})`,
        contentSuggestions: ["\u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u062C\u0648\u062F\u0629", "\u062D\u062F\u062F \u0627\u0644\u0633\u0639\u0631 \u0628\u0648\u0636\u0648\u062D", "\u0627\u0630\u0643\u0631 \u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0646\u062A\u062C"],
        estimatedReachMultiplier: 1
      }
    });
  }
});
router9.post("/review-promotion", async (req, res) => {
  try {
    const { postId, content, category, price } = req.body;
    if (!content && !postId) {
      return res.status(400).json({ error: "\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0645\u0637\u0644\u0648\u0628" });
    }
    let postContent = content || "";
    let postCategory = category || "";
    let postPrice = price || 0;
    if (postId) {
      const post = getPostById(postId);
      if (post) {
        postContent = post.content || postContent;
        postCategory = post.category || postCategory;
        postPrice = post.price || postPrice;
      }
    }
    const zai = await getAI();
    if (!zai) {
      const { content: content2, category: category2 } = req.body;
      const hasInappropriate = /سب|لعن|حما|اقت|سلا|سكر/i.test(content2 || "");
      const hasPrice = /ج\.م|جنيه|EGP|سعر|\d{3,}/.test(content2 || "");
      const hasImage = /صور|image|img|صورة/i.test(content2 || "");
      return res.json({
        success: true,
        data: {
          approved: !hasInappropriate,
          score: hasInappropriate ? 20 : hasPrice ? 75 : 55,
          issues: hasInappropriate ? ["\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0642\u062F \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0643\u0644\u0645\u0627\u062A \u063A\u064A\u0631 \u0645\u0646\u0627\u0633\u0628\u0629"] : [],
          suggestions: [
            ...hasPrice ? [] : ["\u0623\u0636\u0641 \u0627\u0644\u0633\u0639\u0631 \u0644\u0632\u064A\u0627\u062F\u0629 \u0645\u0635\u062F\u0627\u0642\u064A\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646"],
            ...hasImage ? [] : ["\u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0644\u0644\u0645\u0646\u062A\u062C \u0644\u062C\u0630\u0628 \u0627\u0644\u0645\u0632\u064A\u062F"],
            "\u0627\u062C\u0639\u0644 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0636\u062D \u0648\u0645\u0628\u0627\u0634\u0631"
          ],
          riskLevel: hasInappropriate ? "high" : "low",
          category: category2 || "other",
          summary: hasInappropriate ? "\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u064A\u062D\u062A\u0627\u062C \u0645\u0631\u0627\u062C\u0639\u0629 \u064A\u062F\u0648\u064A\u0629" : "\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u064A\u0628\u062F\u0648 \u0645\u0646\u0627\u0633\u0628\u0627\u064B \u0644\u0644\u062A\u0631\u0648\u064A\u062C"
        }
      });
    }
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `\u0623\u0646\u062A \u0645\u0631\u0627\u062C\u0639 \u0645\u062D\u062A\u0648\u0649 \u0630\u0643\u064A \u0639\u0644\u0649 \u0645\u0646\u0635\u0629 \u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0645\u0635\u0631\u064A\u0629 \u0627\u0633\u0645\u0647\u0627 "\u0646\u0648\u0627\u0642\u0635".
\u0645\u0647\u0645\u062A\u0643 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u062A\u0631\u0648\u064A\u062C\u0647\u0627 \u0648\u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646:
1. \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0645\u0646\u0627\u0633\u0628 \u0648\u0644\u0627 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0634\u064A\u0621 \u063A\u064A\u0631 \u0642\u0627\u0646\u0648\u0646\u064A \u0623\u0648 \u0645\u0633\u064A\u0621
2. \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0648\u0627\u0636\u062D \u0648\u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0643\u0627\u0641\u064A\u0629
3. \u0627\u0644\u0633\u0639\u0631 \u0645\u0639\u0642\u0648\u0644 \u0648\u0645\u0646\u0637\u0642\u064A
4. \u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0635\u062D\u064A\u062D
5. \u0644\u0627 \u064A\u0648\u062C\u062F \u0633\u0628\u0627\u0645 \u0623\u0648 \u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0645\u0636\u0644\u0644\u0629

\u0623\u062C\u0628 \u0628\u0640 JSON \u0641\u0642\u0637:
{
  "approved": true/false,
  "score": 0-100,
  "issues": ["\u0645\u0634\u0643\u0644\u06291", "\u0645\u0634\u0643\u0644\u06292"],
  "suggestions": ["\u0627\u0642\u062A\u0631\u0627\u062D1", "\u0627\u0642\u062A\u0631\u0627\u062D2"],
  "riskLevel": "low|medium|high",
  "category": "\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0635\u062D\u064A\u062D",
  "summary": "\u0645\u0644\u062E\u0635 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064A"
}`
        },
        {
          role: "user",
          content: `\u0631\u0627\u062C\u0639 \u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0644\u0644\u062A\u0631\u0648\u064A\u062C:
\u0627\u0644\u0645\u062D\u062A\u0648\u0649: ${postContent}
\u0627\u0644\u062A\u0635\u0646\u064A\u0641: ${postCategory}
\u0627\u0644\u0633\u0639\u0631: ${postPrice} \u062C.\u0645`
        }
      ],
      temperature: 0.3,
      max_tokens: 800
    });
    let aiResult;
    try {
      const content2 = completion.choices?.[0]?.message?.content || "";
      const jsonMatch = content2.match(/\{[\s\S]*\}/);
      aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      aiResult = {
        approved: true,
        score: 70,
        issues: [],
        suggestions: [],
        riskLevel: "low",
        category: postCategory,
        summary: "\u0645\u0631\u0627\u062C\u0639\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0629 - \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u064A\u0628\u062F\u0648 \u0645\u0646\u0627\u0633\u0628\u0627\u064B"
      };
    }
    res.json({ success: true, data: aiResult });
  } catch (error) {
    console.error("[AI] Review error:", error.message);
    const { content, category } = req.body;
    const hasInappropriate = /سب|لعن|حما|اقت|سلا|سكر/i.test(content || "");
    const hasPrice = /ج\.م|جنيه|EGP|سعر|\d{3,}/.test(content || "");
    const hasImage = /صور|image|img|صورة/i.test(content || "");
    res.json({
      success: true,
      data: {
        approved: !hasInappropriate,
        score: hasInappropriate ? 20 : hasPrice ? 75 : 55,
        issues: hasInappropriate ? ["\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0642\u062F \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0643\u0644\u0645\u0627\u062A \u063A\u064A\u0631 \u0645\u0646\u0627\u0633\u0628\u0629"] : [],
        suggestions: [
          ...hasPrice ? [] : ["\u0623\u0636\u0641 \u0627\u0644\u0633\u0639\u0631 \u0644\u0632\u064A\u0627\u062F\u0629 \u0645\u0635\u062F\u0627\u0642\u064A\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646"],
          ...hasImage ? [] : ["\u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0644\u0644\u0645\u0646\u062A\u062C \u0644\u062C\u0630\u0628 \u0627\u0644\u0645\u0632\u064A\u062F"],
          "\u0627\u062C\u0639\u0644 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0648\u0627\u0636\u062D \u0648\u0645\u0628\u0627\u0634\u0631"
        ],
        riskLevel: hasInappropriate ? "high" : "low",
        category: category || "other",
        summary: hasInappropriate ? "\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u064A\u062D\u062A\u0627\u062C \u0645\u0631\u0627\u062C\u0639\u0629 \u064A\u062F\u0648\u064A\u0629" : "\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u064A\u0628\u062F\u0648 \u0645\u0646\u0627\u0633\u0628\u0627\u064B \u0644\u0644\u062A\u0631\u0648\u064A\u062C"
      }
    });
  }
});
router9.post("/assistant", async (req, res) => {
  try {
    const { message, context, userId } = req.body;
    if (!message) {
      return res.status(400).json({ error: "\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0645\u0637\u0644\u0648\u0628\u0629" });
    }
    let userInfo = "";
    if (userId) {
      const user = getUserById(userId);
      if (user) {
        const db2 = database_default;
        const userPosts = db2.prepare("SELECT COUNT(*) as count FROM posts WHERE author_id = ?").get(userId);
        const userPromos = db2.prepare("SELECT COUNT(*) as count FROM posts WHERE author_id = ? AND is_promoted = 1").get(userId);
        const walletBalance = user.wallet_balance || 0;
        userInfo = `
\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:
- \u0627\u0644\u0627\u0633\u0645: ${user.name}
- \u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062D\u0641\u0638\u0629: ${walletBalance} \u062C.\u0645
- \u0639\u062F\u062F \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A: ${userPosts?.count || 0}
- \u0639\u062F\u062F \u0627\u0644\u062A\u0631\u0648\u064A\u062C\u0627\u062A: ${userPromos?.count || 0}
- \u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A: ${user.interests || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}
- \u0627\u0644\u0645\u0648\u0642\u0639: ${user.location || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}`;
        const userPostsList = db2.prepare("SELECT id, content, category, price, location, type, image, likes, comments, is_promoted, promotion_status, created_at FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 20").all(userId);
        const postsSummary = userPostsList.map(
          (p, i) => `${i + 1}. [${p.is_promoted ? "\u0645\u0631\u0648\u0651\u062C" : "\u063A\u064A\u0631 \u0645\u0631\u0648\u0651\u062C"}] "${p.content?.slice(0, 100)}..." | \u062A\u0635\u0646\u064A\u0641: ${p.category || "\u0639\u0627\u0645"} | \u0633\u0639\u0631: ${p.price || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"} \u062C.\u0645 | \u0625\u0639\u062C\u0627\u0628\u0627\u062A: ${p.likes || 0} | ${p.image ? "\u{1F4F8} \u0635\u0648\u0631\u0629" : "\u274C \u0628\u062F\u0648\u0646 \u0635\u0648\u0631\u0629"}`
        ).join("\n");
        if (postsSummary) {
          userInfo += `

\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:
${postsSummary}`;
        }
      }
    }
    const zai = await getAI();
    if (!zai) {
      const { message: message2 } = req.body;
      const msg = (message2 || "").toLowerCase();
      let reply = "";
      if (msg.includes("\u0628\u0627\u0642\u0629") || msg.includes("\u0623\u0641\u0636\u0644") || msg.includes("\u0627\u0642\u062A\u0631\u062D")) {
        reply = '\u0623\u0642\u062A\u0631\u062D \u0628\u0627\u0642\u0629 "\u0645\u0645\u064A\u0632" - \u0627\u0644\u0623\u0643\u062B\u0631 \u0637\u0644\u0628\u0627\u064B! \u0628\u0640 250 \u062C.\u0645 \u062A\u062D\u0635\u0644 \u0639\u0644\u0649 8,000 \u0648\u0635\u0648\u0644 \u06487 \u0623\u064A\u0627\u0645 \u062A\u0631\u0648\u064A\u062C \u0645\u0639 \u0631\u0633\u0627\u0626\u0644 \u062A\u0631\u0648\u064A\u062C\u064A\u0629 \u0645\u0628\u0627\u0634\u0631\u0629. \u0625\u0630\u0627 \u0645\u064A\u0632\u0627\u0646\u064A\u062A\u0643 \u0623\u0642\u0644\u060C \u0627\u0628\u062F\u0623 \u0628\u0628\u0627\u0642\u0629 "\u0642\u064A\u0627\u0633\u064A" \u0628\u0640 120 \u062C.\u0645.';
      } else if (msg.includes("\u0633\u0639\u0631") || msg.includes("\u0643\u0645") || msg.includes("\u062A\u0643\u0644\u0641\u0629")) {
        reply = "\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u062A\u0631\u0648\u064A\u062C \u062A\u0628\u062F\u0623 \u0645\u0646 50 \u062C.\u0645 \u0644\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629. \u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0642\u064A\u0627\u0633\u064A\u0629 120 \u062C.\u0645\u060C \u0627\u0644\u0645\u0645\u064A\u0632\u0629 250 \u062C.\u0645\u060C \u0648VIP \u0628\u0640 500 \u062C.\u0645. \u0643\u0644\u0645\u0627 \u0632\u0627\u062F\u062A \u0627\u0644\u0628\u0627\u0642\u0629\u060C \u0632\u0627\u062F \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0625\u0639\u0644\u0627\u0646\u0643!";
      } else if (msg.includes("\u0643\u064A\u0641") || msg.includes("\u0637\u0631\u064A\u0642\u0629") || msg.includes("\u0634\u0631\u062D")) {
        reply = '\u0627\u0644\u062A\u0631\u0648\u064A\u062C \u0633\u0647\u0644! 1) \u0627\u062E\u062A\u0631 \u0625\u0639\u0644\u0627\u0646\u0643\u060C 2) \u0627\u0636\u063A\u0637 "\u062A\u0631\u0648\u064A\u062C"\u060C 3) \u0627\u062E\u062A\u0631 \u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629\u060C 4) \u0627\u062F\u0641\u0639 \u0645\u0646 \u0645\u062D\u0641\u0638\u062A\u0643. \u0628\u0639\u062F \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u062E\u0644\u0627\u0644 \u062F\u0642\u0627\u0626\u0642\u060C \u064A\u0628\u062F\u0623 \u0627\u0644\u062A\u0631\u0648\u064A\u062C \u0641\u0648\u0631\u0627\u064B!';
      } else if (msg.includes("\u062A\u062D\u0633\u064A\u0646") || msg.includes("\u0646\u0635\u064A\u062D\u0629") || msg.includes("\u0646\u0635\u0627\u0626\u062D")) {
        reply = "\u0646\u0635\u0627\u0626\u062D \u0644\u0632\u064A\u0627\u062F\u0629 \u0641\u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u062A\u0631\u0648\u064A\u062C: 1) \u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0648\u0627\u0636\u062D\u0629 \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u062C\u0648\u062F\u0629\u060C 2) \u0627\u0643\u062A\u0628 \u0639\u0646\u0648\u0627\u0646 \u062C\u0630\u0627\u0628\u060C 3) \u062D\u062F\u062F \u0627\u0644\u0633\u0639\u0631 \u0628\u0648\u0636\u0648\u062D\u060C 4) \u0627\u062E\u062A\u0631 \u0627\u0644\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0644\u0645\u0646\u0627\u0633\u0628 \u0644\u062C\u0645\u0647\u0648\u0631\u0643\u060C 5) \u0631\u062F \u0639\u0644\u0649 \u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A \u0628\u0633\u0631\u0639\u0629!";
      } else {
        reply = "\u0623\u0646\u0627 \u0645\u0633\u0627\u0639\u062F \u0627\u0644\u062A\u0631\u0648\u064A\u062C \u0627\u0644\u0630\u0643\u064A! \u064A\u0645\u0643\u0646\u0646\u064A \u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0641\u064A: \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629\u060C \u062A\u062D\u0633\u064A\u0646 \u0625\u0639\u0644\u0627\u0646\u0643\u060C \u0646\u0635\u0627\u0626\u062D \u0644\u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u0648\u0635\u0648\u0644\u060C \u0623\u0648 \u0623\u064A \u0633\u0624\u0627\u0644 \u0639\u0646 \u0627\u0644\u062A\u0631\u0648\u064A\u062C. \u0645\u0627\u0630\u0627 \u062A\u0631\u064A\u062F \u0623\u0646 \u062A\u0639\u0631\u0641\u061F";
      }
      return res.json({ success: true, reply });
    }
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `\u0623\u0646\u062A \u0645\u0633\u0627\u0639\u062F \u0630\u0643\u064A \u0644\u0644\u062A\u0631\u0648\u064A\u062C \u0639\u0644\u0649 \u0645\u0646\u0635\u0629 "\u0646\u0648\u0627\u0642\u0635" - \u0645\u0646\u0635\u0629 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0627\u0644\u0630\u0643\u064A\u0629 \u0641\u064A \u0645\u0635\u0631.
\u0645\u0647\u0645\u062A\u0643 \u0645\u0633\u0627\u0639\u062F\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646 \u0641\u064A:
- \u0627\u062E\u062A\u064A\u0627\u0631 \u0623\u0641\u0636\u0644 \u0628\u0627\u0642\u0629 \u062A\u0631\u0648\u064A\u062C \u0644\u0645\u064A\u0632\u0627\u0646\u064A\u062A\u0647\u0645
- \u062A\u062D\u0633\u064A\u0646 \u0645\u062D\u062A\u0648\u0649 \u0625\u0639\u0644\u0627\u0646\u0627\u062A\u0647\u0645
- \u0641\u0647\u0645 \u0643\u064A\u0641 \u064A\u0639\u0645\u0644 \u0627\u0644\u062A\u0631\u0648\u064A\u062C
- \u0646\u0635\u0627\u0626\u062D \u0644\u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u0648\u0635\u0648\u0644 \u0648\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A
- \u062D\u0644 \u0645\u0634\u0627\u0643\u0644 \u0627\u0644\u062A\u0631\u0648\u064A\u062C
- \u062A\u062D\u0644\u064A\u0644 \u0645\u0646\u0634\u0648\u0631\u0627\u062A\u0647\u0645 \u0648\u0627\u0642\u062A\u0631\u0627\u062D \u0623\u0641\u0636\u0644\u0647\u0627 \u0644\u0644\u062A\u0631\u0648\u064A\u062C

\u0628\u0627\u0642\u0627\u062A \u0627\u0644\u062A\u0631\u0648\u064A\u062C \u0627\u0644\u0645\u062A\u0627\u062D\u0629:
- \u0623\u0633\u0627\u0633\u064A (50 \u062C.\u0645): 900 \u0648\u0635\u0648\u0644\u060C 3 \u0623\u064A\u0627\u0645\u060C 30 \u0625\u0634\u0639\u0627\u0631
- \u0642\u064A\u0627\u0633\u064A (120 \u062C.\u0645): 3,000 \u0648\u0635\u0648\u0644\u060C 5 \u0623\u064A\u0627\u0645\u060C 100 \u0625\u0634\u0639\u0627\u0631
- \u0645\u0645\u064A\u0632 (250 \u062C.\u0645): 8,000 \u0648\u0635\u0648\u0644\u060C 7 \u0623\u064A\u0627\u0645\u060C 250 \u0625\u0634\u0639\u0627\u0631 (\u0627\u0644\u0623\u0643\u062B\u0631 \u0637\u0644\u0628\u0627\u064B)
- VIP (500 \u062C.\u0645): 25,000 \u0648\u0635\u0648\u0644\u060C 10 \u0623\u064A\u0627\u0645\u060C 600 \u0625\u0634\u0639\u0627\u0631
- \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0645\u062F\u0646 (\u0645\u0646 120 \u062C.\u0645): \u0627\u062E\u062A\u064A\u0627\u0631 1-27 \u0645\u062F\u064A\u0646\u0629 \u0645\u0635\u0631\u064A\u0629
- \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A (200 \u062C.\u0645): 7,000 \u0648\u0635\u0648\u0644\u060C 5 \u0623\u064A\u0627\u0645\u060C 200 \u0625\u0634\u0639\u0627\u0631

\u0645\u0647\u0645: \u0639\u0646\u062F\u0645\u0627 \u062A\u0630\u0643\u0631 \u0627\u0633\u0645 \u0628\u0627\u0642\u0629 \u0641\u064A \u0627\u0644\u0646\u0635\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0631\u0628\u064A \u062F\u0627\u0626\u0645\u0627\u064B (\u0623\u0633\u0627\u0633\u064A\u060C \u0642\u064A\u0627\u0633\u064A\u060C \u0645\u0645\u064A\u0632\u060C VIP\u060C \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0645\u062F\u0646\u060C \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A) \u0648\u0644\u0627 \u062A\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A \u0623\u0628\u062F\u0627\u064B.

\u0623\u062C\u0628 \u0628\u0627\u0644\u0639\u0631\u0628\u064A \u062F\u0627\u0626\u0645\u0627\u064B \u0628\u0634\u0643\u0644 \u0645\u062E\u062A\u0635\u0631 \u0648\u0645\u0641\u064A\u062F. \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0623\u0631\u0642\u0627\u0645 \u0648\u0627\u0644\u0623\u0645\u062B\u0644\u0629. \u0643\u0646 \u0648\u062F\u0648\u062F\u0627\u064B \u0648\u0645\u062D\u0641\u0632\u0627\u064B.
\u0639\u0646\u062F\u0645\u0627 \u064A\u0633\u0623\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0639\u0646 \u0645\u0646\u0634\u0648\u0631\u0627\u062A\u0647\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0623\u062F\u0646\u0627\u0647 \u0644\u062A\u0642\u062F\u064A\u0645 \u0646\u0635\u0627\u0626\u062D \u0645\u062E\u0635\u0635\u0629 \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0645\u062D\u062A\u0648\u0649 \u0645\u0646\u0634\u0648\u0631\u0627\u062A\u0647 \u0627\u0644\u0641\u0639\u0644\u064A\u0629.
${userInfo}`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.8,
      max_tokens: 600
    });
    const aiReply = completion.choices?.[0]?.message?.content || "\u0639\u0630\u0631\u0627\u064B\u060C \u0644\u0645 \u0623\u062A\u0645\u0643\u0646 \u0645\u0646 \u0645\u0639\u0627\u0644\u062C\u0629 \u0637\u0644\u0628\u0643. \u062D\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.";
    res.json({ success: true, reply: aiReply });
  } catch (error) {
    console.error("[AI] Assistant error:", error.message);
    const { message } = req.body;
    const msg = (message || "").toLowerCase();
    let reply = "";
    if (msg.includes("\u0628\u0627\u0642\u0629") || msg.includes("\u0623\u0641\u0636\u0644") || msg.includes("\u0627\u0642\u062A\u0631\u062D")) {
      reply = '\u0623\u0642\u062A\u0631\u062D \u0628\u0627\u0642\u0629 "\u0645\u0645\u064A\u0632" - \u0627\u0644\u0623\u0643\u062B\u0631 \u0637\u0644\u0628\u0627\u064B! \u0628\u0640 250 \u062C.\u0645 \u062A\u062D\u0635\u0644 \u0639\u0644\u0649 8,000 \u0648\u0635\u0648\u0644 \u06487 \u0623\u064A\u0627\u0645 \u062A\u0631\u0648\u064A\u062C \u0645\u0639 \u0631\u0633\u0627\u0626\u0644 \u062A\u0631\u0648\u064A\u062C\u064A\u0629 \u0645\u0628\u0627\u0634\u0631\u0629. \u0625\u0630\u0627 \u0645\u064A\u0632\u0627\u0646\u064A\u062A\u0643 \u0623\u0642\u0644\u060C \u0627\u0628\u062F\u0623 \u0628\u0628\u0627\u0642\u0629 "\u0642\u064A\u0627\u0633\u064A" \u0628\u0640 120 \u062C.\u0645.';
    } else if (msg.includes("\u0633\u0639\u0631") || msg.includes("\u0643\u0645") || msg.includes("\u062A\u0643\u0644\u0641\u0629")) {
      reply = "\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u062A\u0631\u0648\u064A\u062C \u062A\u0628\u062F\u0623 \u0645\u0646 50 \u062C.\u0645 \u0644\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629. \u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0642\u064A\u0627\u0633\u064A\u0629 120 \u062C.\u0645\u060C \u0627\u0644\u0645\u0645\u064A\u0632\u0629 250 \u062C.\u0645\u060C \u0648VIP \u0628\u0640 500 \u062C.\u0645. \u0643\u0644\u0645\u0627 \u0632\u0627\u062F\u062A \u0627\u0644\u0628\u0627\u0642\u0629\u060C \u0632\u0627\u062F \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0625\u0639\u0644\u0627\u0646\u0643!";
    } else if (msg.includes("\u0643\u064A\u0641") || msg.includes("\u0637\u0631\u064A\u0642\u0629") || msg.includes("\u0634\u0631\u062D")) {
      reply = '\u0627\u0644\u062A\u0631\u0648\u064A\u062C \u0633\u0647\u0644! 1) \u0627\u062E\u062A\u0631 \u0625\u0639\u0644\u0627\u0646\u0643\u060C 2) \u0627\u0636\u063A\u0637 "\u062A\u0631\u0648\u064A\u062C"\u060C 3) \u0627\u062E\u062A\u0631 \u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629\u060C 4) \u0627\u062F\u0641\u0639 \u0645\u0646 \u0645\u062D\u0641\u0638\u062A\u0643. \u0628\u0639\u062F \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u062E\u0644\u0627\u0644 \u062F\u0642\u0627\u0626\u0642\u060C \u064A\u0628\u062F\u0623 \u0627\u0644\u062A\u0631\u0648\u064A\u062C \u0641\u0648\u0631\u0627\u064B!';
    } else if (msg.includes("\u062A\u062D\u0633\u064A\u0646") || msg.includes("\u0646\u0635\u064A\u062D\u0629") || msg.includes("\u0646\u0635\u0627\u0626\u062D")) {
      reply = "\u0646\u0635\u0627\u0626\u062D \u0644\u0632\u064A\u0627\u062F\u0629 \u0641\u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u062A\u0631\u0648\u064A\u062C: 1) \u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0648\u0627\u0636\u062D\u0629 \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u062C\u0648\u062F\u0629\u060C 2) \u0627\u0643\u062A\u0628 \u0639\u0646\u0648\u0627\u0646 \u062C\u0630\u0627\u0628\u060C 3) \u062D\u062F\u062F \u0627\u0644\u0633\u0639\u0631 \u0628\u0648\u0636\u0648\u062D\u060C 4) \u0627\u062E\u062A\u0631 \u0627\u0644\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0644\u0645\u0646\u0627\u0633\u0628 \u0644\u062C\u0645\u0647\u0648\u0631\u0643\u060C 5) \u0631\u062F \u0639\u0644\u0649 \u0627\u0644\u062A\u0639\u0644\u064A\u0642\u0627\u062A \u0628\u0633\u0631\u0639\u0629!";
    } else {
      reply = "\u0623\u0646\u0627 \u0645\u0633\u0627\u0639\u062F \u0627\u0644\u062A\u0631\u0648\u064A\u062C \u0627\u0644\u0630\u0643\u064A! \u064A\u0645\u0643\u0646\u0646\u064A \u0645\u0633\u0627\u0639\u062F\u062A\u0643 \u0641\u064A: \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629\u060C \u062A\u062D\u0633\u064A\u0646 \u0625\u0639\u0644\u0627\u0646\u0643\u060C \u0646\u0635\u0627\u0626\u062D \u0644\u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u0648\u0635\u0648\u0644\u060C \u0623\u0648 \u0623\u064A \u0633\u0624\u0627\u0644 \u0639\u0646 \u0627\u0644\u062A\u0631\u0648\u064A\u062C. \u0645\u0627\u0630\u0627 \u062A\u0631\u064A\u062F \u0623\u0646 \u062A\u0639\u0631\u0641\u061F";
    }
    res.json({ success: true, reply });
  }
});
router9.post("/budget-suggestion", async (req, res) => {
  try {
    const { budget, category, price, goal } = req.body;
    const userId = req.user?.userId;
    let walletBalance = 0;
    if (userId) {
      const user = getUserById(userId);
      walletBalance = user?.wallet_balance || 0;
    }
    const actualBudget = budget || walletBalance || 0;
    const packages = [
      { id: "basic", name: "\u0623\u0633\u0627\u0633\u064A", price: 50, reach: 900, days: 3, notifications: 30 },
      { id: "standard", name: "\u0642\u064A\u0627\u0633\u064A", price: 120, reach: 3e3, days: 5, notifications: 100 },
      { id: "premium", name: "\u0645\u0645\u064A\u0632", price: 250, reach: 8e3, days: 7, notifications: 250 },
      { id: "vip", name: "VIP", price: 500, reach: 25e3, days: 10, notifications: 600 },
      { id: "interest_target", name: "\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A", price: 200, reach: 7e3, days: 5, notifications: 200 },
      { id: "city_target", name: "\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0645\u062F\u0646", price: 120, reach: 4500, days: 5, notifications: 150 }
    ];
    const affordable = packages.filter((p) => p.price <= actualBudget);
    const bestValue = affordable.length > 0 ? affordable.reduce((best, p) => p.reach / p.price > best.reach / best.price ? p : best, affordable[0]) : null;
    let recommended = null;
    let reasoning = "";
    if (actualBudget >= 500) {
      recommended = packages.find((p) => p.id === "vip");
      reasoning = "\u0645\u064A\u0632\u0627\u0646\u064A\u062A\u0643 \u062A\u0633\u0645\u062D \u0628\u0623\u0641\u0636\u0644 \u0628\u0627\u0642\u0629 VIP - \u0648\u0635\u0648\u0644 \u0647\u0627\u0626\u0644 \u0644\u0640 25,000 \u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0647\u062A\u0645!";
    } else if (actualBudget >= 250) {
      recommended = packages.find((p) => p.id === "premium");
      reasoning = "\u0628\u0627\u0642\u0629 \u0645\u0645\u064A\u0632\u0629 \u0645\u0645\u062A\u0627\u0632\u0629 \u0644\u064A\u0643 - \u0627\u0644\u0623\u0643\u062B\u0631 \u0637\u0644\u0628\u0627\u064B! \u0648\u0635\u0648\u0644 8,000 \u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0647\u062A\u0645";
    } else if (actualBudget >= 200) {
      recommended = packages.find((p) => p.id === "interest_target");
      reasoning = "\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A \u0645\u0646\u0627\u0633\u0628 \u0644\u0645\u064A\u0632\u0627\u0646\u064A\u062A\u0643 - \u064A\u0648\u0635\u0644 \u0625\u0639\u0644\u0627\u0646\u0643 \u0644\u0640 7,000 \u0645\u0647\u062A\u0645 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A";
    } else if (actualBudget >= 120) {
      recommended = packages.find((p) => p.id === "standard");
      reasoning = "\u0628\u0627\u0642\u0629 \u0642\u064A\u0627\u0633\u064A\u0629 \u062C\u064A\u062F\u0629 - 3,000 \u0648\u0635\u0648\u0644 \u06485 \u0623\u064A\u0627\u0645 \u062A\u0631\u0648\u064A\u062C";
    } else if (actualBudget >= 50) {
      recommended = packages.find((p) => p.id === "basic");
      reasoning = "\u0628\u0627\u0642\u0629 \u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u0628\u062F\u0627\u064A\u0629 - 900 \u0648\u0635\u0648\u0644 \u06483 \u0623\u064A\u0627\u0645";
    } else {
      reasoning = "\u062A\u062D\u062A\u0627\u062C \u0634\u062D\u0646 \u0645\u062D\u0641\u0638\u062A\u0643 \u0623\u0648\u0644\u0627\u064B. \u0623\u0642\u0644 \u0628\u0627\u0642\u0629 \u062A\u0628\u062F\u0623 \u0645\u0646 50 \u062C.\u0645";
    }
    let aiInsight = "";
    try {
      const zai = await getAI();
      if (!zai) {
      } else {
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u062A\u0633\u0648\u064A\u0642. \u0623\u062C\u0628 \u0628\u0627\u0644\u0639\u0631\u0628\u064A \u0641\u064A \u062C\u0645\u0644\u0629 \u0648\u0627\u062D\u062F\u0629: \u0645\u0627 \u0623\u0641\u0636\u0644 \u0646\u0635\u064A\u062D\u0629 \u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629 " + actualBudget + " \u062C.\u0645\u061F"
            },
            {
              role: "user",
              content: `\u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629: ${actualBudget} \u062C.\u0645\u060C \u0627\u0644\u062A\u0635\u0646\u064A\u0641: ${category || "\u0639\u0627\u0645"}\u060C \u0647\u062F\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${goal || "\u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u0648\u0635\u0648\u0644"}`
            }
          ],
          temperature: 0.7,
          max_tokens: 100
        });
        aiInsight = completion.choices?.[0]?.message?.content || "";
      }
    } catch {
    }
    res.json({
      success: true,
      data: {
        walletBalance: actualBudget,
        recommended,
        bestValue,
        affordable,
        needsCharging: actualBudget < 50,
        minimumRequired: 50,
        reasoning,
        aiInsight,
        tips: actualBudget < 50 ? ["\u0627\u0634\u062D\u0646 \u0645\u062D\u0641\u0638\u062A\u0643 \u0628\u0640 50 \u062C.\u0645 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u0644\u0628\u062F\u0621"] : actualBudget < 150 ? ["\u0627\u0628\u062F\u0623 \u0628\u0628\u0627\u0642\u0629 \u0623\u0633\u0627\u0633\u064A\u0629 \u0648\u0627\u062E\u062A\u0628\u0631 \u0627\u0644\u0646\u062A\u0627\u0626\u062C", "\u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0644\u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u0628\u0646\u0633\u0628\u0629 40%"] : actualBudget < 350 ? ["\u0628\u0627\u0642\u0629 \u0642\u064A\u0627\u0633\u064A\u0629 \u062A\u0648\u0641\u0631 \u062A\u0648\u0627\u0632\u0646 \u062C\u064A\u062F \u0628\u064A\u0646 \u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u0644\u0648\u0635\u0648\u0644", "\u0627\u0633\u062A\u0647\u062F\u0641 \u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A \u062C\u0645\u0647\u0648\u0631\u0643 \u0628\u062F\u0642\u0629"] : ["\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u0645\u064A\u0632\u0629/VIP \u062A\u0636\u0645\u0646 \u0623\u0642\u0635\u0649 \u0648\u0635\u0648\u0644", "\u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A \u0644\u0644\u0648\u0635\u0648\u0644 \u0644\u0644\u0645\u0647\u062A\u0645\u064A\u0646 \u0641\u0639\u0644\u0627\u064B"]
      }
    });
  } catch (error) {
    console.error("[AI] Budget suggestion error:", error.message);
    res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u0627\u0642\u062A\u0631\u0627\u062D \u0627\u0644\u0645\u064A\u0632\u0627\u0646\u064A\u0629" });
  }
});
router9.get("/insights", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "\u064A\u062C\u0628 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
    const db2 = database_default;
    const user = getUserById(userId);
    const walletBalance = user?.wallet_balance || 0;
    let allUserPosts = [];
    try {
      allUserPosts = db2.prepare("SELECT id, content, category, price, is_promoted, promotion_tier, likes, comments, reach_count, click_count, created_at FROM posts WHERE author_id = ? ORDER BY created_at DESC").all(userId);
    } catch (dbErr) {
      console.error("[AI] Insights posts query error:", dbErr.message);
    }
    const totalPosts = allUserPosts.length;
    const promotedPosts = allUserPosts.filter((p) => p.is_promoted === 1).length;
    const unpromotedPosts = totalPosts - promotedPosts;
    let myPromotions = [];
    try {
      myPromotions = db2.prepare(`
        SELECT p.*, pr.tier as promotion_tier, pr.status as promotion_status, pr.targeting, pr.target_city, pr.target_interests,
               pr.price as promotion_price, p.promotion_expires_at
        FROM posts p
        LEFT JOIN promotion_requests pr ON pr.post_id = p.id
        WHERE p.author_id = ? AND p.is_promoted = 1
        ORDER BY p.created_at DESC
      `).all(userId);
    } catch (dbErr) {
      console.error("[AI] Insights DB query error:", dbErr.message);
      myPromotions = [];
    }
    const totalSpent = myPromotions.reduce((sum, p) => sum + (p.promotion_price || 0), 0);
    const totalReach = myPromotions.reduce((sum, p) => sum + (p.reach_count || 0), 0);
    const totalClicks = myPromotions.reduce((sum, p) => sum + (p.click_count || 0), 0);
    const activePromotions = myPromotions.filter((p) => {
      try {
        return p.promotion_status === "approved" && p.promotion_expires_at && new Date(p.promotion_expires_at) > /* @__PURE__ */ new Date();
      } catch {
        return false;
      }
    }).length;
    const categoryPerformance = {};
    myPromotions.forEach((p) => {
      const cat = p.category || "other";
      if (!categoryPerformance[cat]) categoryPerformance[cat] = { count: 0, reach: 0, clicks: 0 };
      categoryPerformance[cat].count++;
      categoryPerformance[cat].reach += p.reach_count || 0;
      categoryPerformance[cat].clicks += p.click_count || 0;
    });
    let bestCategory = "";
    let bestCTR = 0;
    Object.entries(categoryPerformance).forEach(([cat, data]) => {
      const ctr = data.reach > 0 ? data.clicks / data.reach : 0;
      if (ctr > bestCTR) {
        bestCTR = ctr;
        bestCategory = cat;
      }
    });
    const tierPerformance = {};
    myPromotions.forEach((p) => {
      const tier = p.promotion_tier || "basic";
      if (!tierPerformance[tier]) tierPerformance[tier] = { count: 0, reach: 0, cost: 0 };
      tierPerformance[tier].count++;
      tierPerformance[tier].reach += p.reach_count || 0;
      tierPerformance[tier].cost += p.promotion_price || 0;
    });
    let bestROITier = "";
    let bestROI = 0;
    Object.entries(tierPerformance).forEach(([tier, data]) => {
      const roi = data.cost > 0 ? data.reach / data.cost : 0;
      if (roi > bestROI) {
        bestROI = roi;
        bestROITier = tier;
      }
    });
    let aiInsights = [];
    const postsSummary = allUserPosts.slice(0, 10).map((p, i) => {
      const tier = p.promotion_tier || p.promotion_tier || "\u063A\u064A\u0631 \u0645\u0631\u0648\u0651\u062C";
      return `${i + 1}. [${p.is_promoted ? "\u0645\u0631\u0648\u0651\u062C - " + arPkg(tier) : "\u063A\u064A\u0631 \u0645\u0631\u0648\u0651\u062C"}] "${(p.content || "").slice(0, 60)}..." | \u062A\u0635\u0646\u064A\u0641: ${p.category || "\u0639\u0627\u0645"} | \u0633\u0639\u0631: ${p.price || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"} \u062C.\u0645 | \u0625\u0639\u062C\u0627\u0628\u0627\u062A: ${p.likes || 0}`;
    }).join("\n");
    try {
      const zai = await getAI();
      if (!zai) {
        if (totalReach === 0) {
          aiInsights = ["\u0627\u0628\u062F\u0623 \u0628\u062A\u0631\u0648\u064A\u062C \u0625\u0639\u0644\u0627\u0646\u0643 \u0623\u0648\u0644\u0627\u064B \u0644\u0631\u0624\u064A\u0629 \u0627\u0644\u062A\u062D\u0644\u064A\u0644\u0627\u062A", "\u0628\u0627\u0642\u0629 \u0642\u064A\u0627\u0633\u064A\u0629 \u0647\u064A \u0646\u0642\u0637\u0629 \u0628\u062F\u0627\u064A\u0629 \u0645\u0645\u062A\u0627\u0632\u0629", "\u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0644\u0625\u0639\u0644\u0627\u0646\u0643 \u0644\u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u0646\u0642\u0631\u0627\u062A"];
        } else {
          const ctr = totalReach > 0 ? (totalClicks / totalReach * 100).toFixed(1) : "0";
          aiInsights = [
            `\u0646\u0633\u0628\u0629 \u0627\u0644\u0646\u0642\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 ${ctr}% - ${parseFloat(ctr) > 3 ? "\u0645\u0645\u062A\u0627\u0632\u0629!" : parseFloat(ctr) > 1 ? "\u062C\u064A\u062F\u0629 \u0648\u064A\u0645\u0643\u0646 \u062A\u062D\u0633\u064A\u0646\u0647\u0627" : "\u062A\u062D\u062A\u0627\u062C \u062A\u062D\u0633\u064A\u0646 - \u062C\u0631\u0628 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0635\u0648\u0631\u0629 \u0623\u0648 \u0627\u0644\u0639\u0646\u0648\u0627\u0646"}`,
            bestCategory ? `\u062A\u0635\u0646\u064A\u0641 "${bestCategory}" \u064A\u062D\u0642\u0642 \u0623\u0641\u0636\u0644 \u0646\u062A\u0627\u0626\u062C - \u0631\u0643\u0632 \u0639\u0644\u064A\u0647` : "\u0627\u062E\u062A\u0628\u0631 \u062A\u0635\u0646\u064A\u0641\u0627\u062A \u0645\u062E\u062A\u0644\u0641\u0629 \u0644\u0645\u0639\u0631\u0641\u0629 \u0627\u0644\u0623\u0641\u0636\u0644",
            bestROITier ? `\u0628\u0627\u0642\u0629 "${replacePkgNamesInText(arPkg(bestROITier))}" \u062A\u0639\u0637\u064A \u0623\u0641\u0636\u0644 \u0639\u0627\u0626\u062F - \u0627\u0633\u062A\u062B\u0645\u0631 \u0641\u064A\u0647\u0627 \u0623\u0643\u062B\u0631` : '\u062C\u0631\u0628 \u0628\u0627\u0642\u0629 "\u0645\u0645\u064A\u0632" - \u0627\u0644\u0623\u0643\u062B\u0631 \u0637\u0644\u0628\u0627\u064B \u0648\u0623\u0641\u0636\u0644 \u0639\u0627\u0626\u062F'
          ];
        }
      } else {
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `\u0623\u0646\u062A \u0645\u062D\u0644\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0630\u0643\u064A \u0644\u0645\u0646\u0635\u0629 \u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0645\u0635\u0631\u064A\u0629 \u0627\u0633\u0645\u0647\u0627 "\u0646\u0648\u0627\u0642\u0635".
\u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0627\u0644\u064A\u0629\u060C \u0623\u0639\u0637\u0650 3-5 \u062A\u0648\u0635\u064A\u0627\u062A \u0642\u0635\u064A\u0631\u0629 \u0648\u0645\u0641\u064A\u062F\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064A \u0644\u062A\u062D\u0633\u064A\u0646 \u0623\u062F\u0627\u0621 \u0627\u0644\u062A\u0631\u0648\u064A\u062C.
\u0643\u0644 \u062A\u0648\u0635\u064A\u0629 \u0641\u064A \u0633\u0637\u0631 \u0645\u0646\u0641\u0635\u0644. \u0643\u0646 \u0645\u062D\u062F\u062F\u0627\u064B \u0648\u0639\u0645\u0644\u064A\u0627\u064B.
\u0645\u0647\u0645: \u0627\u0633\u062A\u062E\u062F\u0645 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0628\u0627\u0642\u0627\u062A \u0627\u0644\u0639\u0631\u0628\u064A\u0629 (\u0623\u0633\u0627\u0633\u064A\u060C \u0642\u064A\u0627\u0633\u064A\u060C \u0645\u0645\u064A\u0632\u060C VIP\u060C \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0645\u062F\u0646\u060C \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A) \u0648\u0644\u0627 \u062A\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A\u0629 \u0623\u0628\u062F\u0627\u064B.`
            },
            {
              role: "user",
              content: `\u062A\u062D\u0644\u064A\u0644\u0627\u062A\u064A:
- \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0625\u0646\u0641\u0627\u0642: ${totalSpent} \u062C.\u0645
- \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0648\u0635\u0648\u0644: ${totalReach}
- \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0646\u0642\u0631\u0627\u062A: ${totalClicks}
- \u0627\u0644\u062A\u0631\u0648\u064A\u062C\u0627\u062A \u0627\u0644\u0646\u0634\u0637\u0629: ${activePromotions}
- \u0623\u0641\u0636\u0644 \u062A\u0635\u0646\u064A\u0641: ${bestCategory || "\u0644\u0627 \u064A\u0648\u062C\u062F"}
- \u0623\u0641\u0636\u0644 \u0628\u0627\u0642\u0629: ${bestROITier ? arPkg(bestROITier) : "\u0644\u0627 \u064A\u0648\u062C\u062F"}
- \u0639\u062F\u062F \u0627\u0644\u062A\u0631\u0648\u064A\u062C\u0627\u062A: ${myPromotions.length}
- \u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062D\u0641\u0638\u0629: ${walletBalance} \u062C.\u0645
- \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A: ${totalPosts} (\u0645\u0631\u0648\u0651\u062C\u0629: ${promotedPosts}, \u063A\u064A\u0631 \u0645\u0631\u0648\u0651\u062C\u0629: ${unpromotedPosts})

\u0645\u0646\u0634\u0648\u0631\u0627\u062A\u064A:
${postsSummary || "\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0628\u0639\u062F"}`
            }
          ],
          temperature: 0.7,
          max_tokens: 400
        });
        const content = completion.choices?.[0]?.message?.content || "";
        aiInsights = content.split("\n").filter((l) => l.trim().length > 0).slice(0, 5);
      }
    } catch {
      if (totalReach === 0) {
        aiInsights = ["\u0627\u0628\u062F\u0623 \u0628\u062A\u0631\u0648\u064A\u062C \u0625\u0639\u0644\u0627\u0646\u0643 \u0623\u0648\u0644\u0627\u064B \u0644\u0631\u0624\u064A\u0629 \u0627\u0644\u062A\u062D\u0644\u064A\u0644\u0627\u062A", "\u0628\u0627\u0642\u0629 \u0642\u064A\u0627\u0633\u064A\u0629 \u0647\u064A \u0646\u0642\u0637\u0629 \u0628\u062F\u0627\u064A\u0629 \u0645\u0645\u062A\u0627\u0632\u0629", "\u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0644\u0625\u0639\u0644\u0627\u0646\u0643 \u0644\u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u0646\u0642\u0631\u0627\u062A"];
      } else {
        const ctr = totalReach > 0 ? (totalClicks / totalReach * 100).toFixed(1) : "0";
        aiInsights = [
          `\u0646\u0633\u0628\u0629 \u0627\u0644\u0646\u0642\u0631 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 ${ctr}% - ${parseFloat(ctr) > 3 ? "\u0645\u0645\u062A\u0627\u0632\u0629!" : parseFloat(ctr) > 1 ? "\u062C\u064A\u062F\u0629 \u0648\u064A\u0645\u0643\u0646 \u062A\u062D\u0633\u064A\u0646\u0647\u0627" : "\u062A\u062D\u062A\u0627\u062C \u062A\u062D\u0633\u064A\u0646 - \u062C\u0631\u0628 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0635\u0648\u0631\u0629 \u0623\u0648 \u0627\u0644\u0639\u0646\u0648\u0627\u0646"}`,
          bestCategory ? `\u062A\u0635\u0646\u064A\u0641 "${bestCategory}" \u064A\u062D\u0642\u0642 \u0623\u0641\u0636\u0644 \u0646\u062A\u0627\u0626\u062C - \u0631\u0643\u0632 \u0639\u0644\u064A\u0647` : "\u0627\u062E\u062A\u0628\u0631 \u062A\u0635\u0646\u064A\u0641\u0627\u062A \u0645\u062E\u062A\u0644\u0641\u0629 \u0644\u0645\u0639\u0631\u0641\u0629 \u0627\u0644\u0623\u0641\u0636\u0644",
          bestROITier ? `\u0628\u0627\u0642\u0629 "${replacePkgNamesInText(arPkg(bestROITier))}" \u062A\u0639\u0637\u064A \u0623\u0641\u0636\u0644 \u0639\u0627\u0626\u062F - \u0627\u0633\u062A\u062B\u0645\u0631 \u0641\u064A\u0647\u0627 \u0623\u0643\u062B\u0631` : '\u062C\u0631\u0628 \u0628\u0627\u0642\u0629 "\u0645\u0645\u064A\u0632" - \u0627\u0644\u0623\u0643\u062B\u0631 \u0637\u0644\u0628\u0627\u064B \u0648\u0623\u0641\u0636\u0644 \u0639\u0627\u0626\u062F'
        ];
      }
    }
    res.json({
      success: true,
      data: {
        summary: {
          totalSpent,
          totalReach,
          totalClicks,
          activePromotions,
          totalPromotions: myPromotions.length,
          avgCTR: totalReach > 0 ? (totalClicks / totalReach * 100).toFixed(1) : "0",
          totalPosts,
          promotedPosts,
          unpromotedPosts,
          walletBalance
        },
        categoryPerformance,
        tierPerformance,
        bestCategory,
        bestROITier: bestROITier ? arPkg(bestROITier) : "",
        aiInsights,
        posts: allUserPosts.slice(0, 10).map((p) => ({
          id: p.id,
          content: p.content,
          contentPreview: (p.content || "").slice(0, 80),
          category: p.category,
          price: p.price,
          isPromoted: !!p.is_promoted,
          promotionTier: p.is_promoted ? arPkg(p.promotion_tier || "basic") : null,
          likes: p.likes || 0,
          comments: p.comments || 0,
          reachCount: p.reach_count || 0,
          clickCount: p.click_count || 0,
          createdAt: p.created_at
        })),
        recommendations: {
          nextBestAction: activePromotions > 0 ? "\u0631\u0627\u0642\u0628 \u0623\u062F\u0627\u0621 \u062A\u0631\u0648\u064A\u062C\u0627\u062A\u0643 \u0627\u0644\u062D\u0627\u0644\u064A\u0629 \u0648\u0642\u0627\u0631\u0646 \u0627\u0644\u0646\u062A\u0627\u0626\u062C" : unpromotedPosts > 0 ? `\u0644\u062F\u064A\u0643 ${unpromotedPosts} \u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0631\u0648\u0651\u062C - \u0627\u062E\u062A\u0631 \u0627\u0644\u0623\u0641\u0636\u0644 \u0648\u0627\u0628\u062F\u0623 \u0627\u0644\u062A\u0631\u0648\u064A\u062C!` : "\u0627\u0628\u062F\u0623 \u0628\u0625\u0646\u0634\u0627\u0621 \u0645\u0646\u0634\u0648\u0631 \u062B\u0645 \u0631\u0648\u0651\u062C\u0647 - \u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0642\u064A\u0627\u0633\u064A\u0629 \u062E\u064A\u0627\u0631 \u0645\u0645\u062A\u0627\u0632",
          suggestedBudget: totalSpent === 0 ? 150 : Math.max(150, Math.round(totalSpent * 0.3))
        }
      }
    });
  } catch (error) {
    console.error("[AI] Insights error:", error.message);
    res.json({
      success: true,
      data: {
        summary: {
          totalSpent: 0,
          totalReach: 0,
          totalClicks: 0,
          activePromotions: 0,
          totalPromotions: 0,
          avgCTR: "0"
        },
        categoryPerformance: {},
        tierPerformance: {},
        bestCategory: "",
        bestROITier: "",
        aiInsights: ["\u0627\u0628\u062F\u0623 \u0628\u062A\u0631\u0648\u064A\u062C \u0625\u0639\u0644\u0627\u0646\u0643 \u0623\u0648\u0644\u0627\u064B \u0644\u0631\u0624\u064A\u0629 \u0627\u0644\u062A\u062D\u0644\u064A\u0644\u0627\u062A", "\u0628\u0627\u0642\u0629 \u0642\u064A\u0627\u0633\u064A\u0629 \u0647\u064A \u0646\u0642\u0637\u0629 \u0628\u062F\u0627\u064A\u0629 \u0645\u0645\u062A\u0627\u0632\u0629", "\u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0644\u0625\u0639\u0644\u0627\u0646\u0643 \u0644\u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u0646\u0642\u0631\u0627\u062A"],
        recommendations: {
          nextBestAction: "\u0627\u0628\u062F\u0623 \u0628\u062A\u0631\u0648\u064A\u062C \u0625\u0639\u0644\u0627\u0646\u0643 \u0627\u0644\u0622\u0646 - \u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0642\u064A\u0627\u0633\u064A\u0629 \u062E\u064A\u0627\u0631 \u0645\u0645\u062A\u0627\u0632",
          suggestedBudget: 150
        }
      }
    });
  }
});
router9.post("/enhance-content", async (req, res) => {
  try {
    const { content, category, price } = req.body;
    if (!content) return res.status(400).json({ error: "\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0645\u0637\u0644\u0648\u0628" });
    const zai = await getAI();
    if (!zai) {
      const { content: content2 } = req.body;
      return res.json({
        success: true,
        data: {
          enhancedContent: content2,
          title: "",
          hashtags: [],
          callToAction: "\u0627\u0637\u0644\u0628 \u0627\u0644\u0622\u0646!",
          scoreImprovement: 10,
          tips: ["\u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0648\u0627\u0636\u062D\u0629 \u0644\u0644\u0645\u0646\u062A\u062C", "\u062D\u062F\u062F \u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u0644\u0645\u0648\u0642\u0639", "\u0627\u0630\u0643\u0631 \u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0646\u062A\u062C", "\u0627\u0633\u062A\u062E\u062F\u0645 \u0643\u0644\u0645\u0627\u062A \u0645\u0641\u062A\u0627\u062D\u064A\u0629 \u0641\u064A \u0627\u0644\u0648\u0635\u0641"]
        }
      });
    }
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u0643\u062A\u0627\u0628\u0629 \u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0639\u0644\u0649 \u0645\u0646\u0635\u0629 "\u0646\u0648\u0627\u0642\u0635" \u0627\u0644\u0645\u0635\u0631\u064A\u0629.
\u062D\u0633\u0651\u0646 \u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0644\u062C\u0639\u0644\u0647 \u0623\u0643\u062B\u0631 \u062C\u0627\u0630\u0628\u064A\u0629 \u0648\u0641\u0639\u0627\u0644\u064A\u0629.
\u0623\u062C\u0628 \u0628\u0640 JSON \u0641\u0642\u0637:
{
  "enhancedContent": "\u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u0633\u0646",
  "title": "\u0639\u0646\u0648\u0627\u0646 \u062C\u0630\u0627\u0628",
  "hashtags": ["\u0647\u0627\u0634\u062A\u0627\u06421", "\u0647\u0627\u0634\u062A\u0627\u06422"],
  "callToAction": "\u0639\u0628\u0627\u0631\u0629 \u062A\u062D\u0641\u064A\u0632\u064A\u0629 \u0644\u0644\u0634\u0631\u0627\u0621",
  "scoreImprovement": 25,
  "tips": ["\u0646\u0635\u064A\u062D\u06291", "\u0646\u0635\u064A\u062D\u06292"]
}`
        },
        {
          role: "user",
          content: `\u062D\u0633\u0651\u0646 \u0647\u0630\u0627 \u0627\u0644\u0625\u0639\u0644\u0627\u0646:
\u0627\u0644\u0645\u062D\u062A\u0648\u0649: ${content}
\u0627\u0644\u062A\u0635\u0646\u064A\u0641: ${category || "\u0639\u0627\u0645"}
\u0627\u0644\u0633\u0639\u0631: ${price || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"} \u062C.\u0645`
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });
    let aiResult;
    try {
      const content2 = completion.choices?.[0]?.message?.content || "";
      const jsonMatch = content2.match(/\{[\s\S]*\}/);
      aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      aiResult = {
        enhancedContent: content,
        title: "",
        hashtags: [],
        callToAction: "\u0627\u0637\u0644\u0628 \u0627\u0644\u0622\u0646!",
        scoreImprovement: 15,
        tips: ["\u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0648\u0627\u0636\u062D\u0629", "\u062D\u062F\u062F \u0627\u0644\u0633\u0639\u0631 \u0628\u0648\u0636\u0648\u062D"]
      };
    }
    res.json({ success: true, data: aiResult });
  } catch (error) {
    console.error("[AI] Content enhancement error:", error.message);
    const { content } = req.body;
    res.json({
      success: true,
      data: {
        enhancedContent: content,
        title: "",
        hashtags: [],
        callToAction: "\u0627\u0637\u0644\u0628 \u0627\u0644\u0622\u0646!",
        scoreImprovement: 10,
        tips: ["\u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0648\u0627\u0636\u062D\u0629 \u0644\u0644\u0645\u0646\u062A\u062C", "\u062D\u062F\u062F \u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u0644\u0645\u0648\u0642\u0639", "\u0627\u0630\u0643\u0631 \u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0646\u062A\u062C", "\u0627\u0633\u062A\u062E\u062F\u0645 \u0643\u0644\u0645\u0627\u062A \u0645\u0641\u062A\u0627\u062D\u064A\u0629 \u0641\u064A \u0627\u0644\u0648\u0635\u0641"]
      }
    });
  }
});
router9.post("/smart-placement", async (req, res) => {
  try {
    const { promotedPosts, totalPosts, feedType, userInterests } = req.body;
    const userId = req.user?.userId || null;
    if (!Array.isArray(promotedPosts) || promotedPosts.length === 0) {
      return res.json({ success: true, positions: [], strategy: "none" });
    }
    const db2 = database_default;
    const promotedCount = promotedPosts.length;
    const regularCount = (totalPosts || 20) - promotedCount;
    let engagementData = [];
    try {
      engagementData = db2.prepare(`
        SELECT feed_position, action, COUNT(*) as count,
               AVG(time_on_screen) as avg_time,
               AVG(scroll_depth) as avg_scroll_depth
        FROM promotion_engagement
        WHERE feed_type = ? AND created_at >= datetime('now', '-7 days')
        GROUP BY feed_position, action
        ORDER BY feed_position
      `).all(feedType || "home");
    } catch {
    }
    const positionStats = {};
    for (const row of engagementData) {
      if (!positionStats[row.feed_position]) {
        positionStats[row.feed_position] = { impressions: 0, clicks: 0, avgTime: 0, avgScroll: 0 };
      }
      if (row.action === "impression") positionStats[row.feed_position].impressions = row.count;
      if (row.action === "click") positionStats[row.feed_position].clicks = row.count;
      positionStats[row.feed_position].avgTime = row.avg_time || 0;
      positionStats[row.feed_position].avgScroll = row.avg_scroll_depth || 0;
    }
    const hourKey = (/* @__PURE__ */ new Date()).getHours();
    const interestsKey = Array.isArray(userInterests) ? userInterests.slice(0, 3).sort().join(",") : "";
    const cacheKey = `placement_${feedType || "home"}_${hourKey}_${promotedCount}_${interestsKey}`;
    let cachedStrategy = null;
    try {
      const cached = db2.prepare(
        'SELECT strategy FROM ai_placement_cache WHERE cache_key = ? AND expires_at > datetime("now")'
      ).get(cacheKey);
      if (cached) {
        cachedStrategy = JSON.parse(cached.strategy);
        db2.prepare("UPDATE ai_placement_cache SET hit_count = hit_count + 1 WHERE cache_key = ?").run(cacheKey);
      }
    } catch {
    }
    if (cachedStrategy) {
      return res.json({ success: true, ...cachedStrategy, fromCache: true });
    }
    const engagementSummary = Object.entries(positionStats).map(([pos, stats]) => `\u0627\u0644\u0645\u0648\u0636\u0639 ${pos}: \u0627\u0646\u0637\u0628\u0627\u0639\u0627\u062A=${stats.impressions}, \u0646\u0642\u0631\u0627\u062A=${stats.clicks}, \u0645\u0639\u062F\u0644 \u0627\u0644\u0646\u0642\u0631=${stats.impressions > 0 ? (stats.clicks / stats.impressions * 100).toFixed(1) : 0}%, \u0648\u0642\u062A_\u0645\u0634\u0627\u0647\u062F\u0629=${stats.avgTime.toFixed(1)}\u062B`).join("\n");
    const currentHour = (/* @__PURE__ */ new Date()).getHours();
    let timeContext = "";
    if (currentHour >= 5 && currentHour < 12) timeContext = "\u0635\u0628\u0627\u062D\u0627\u064B - \u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646 \u0623\u0643\u062B\u0631 \u0646\u0634\u0627\u0637\u0627\u064B \u0648\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u064B \u0628\u0627\u0644\u062A\u0633\u0648\u0642";
    else if (currentHour >= 12 && currentHour < 17) timeContext = "\u0638\u0647\u0631\u0627\u064B - \u0641\u062A\u0631\u0629 \u0631\u0627\u062D\u0629\u060C \u062A\u0641\u0627\u0639\u0644 \u0645\u062A\u0648\u0633\u0637";
    else if (currentHour >= 17 && currentHour < 22) timeContext = "\u0645\u0633\u0627\u0621\u064B - \u0623\u0639\u0644\u0649 \u0641\u062A\u0631\u0629 \u062A\u0641\u0627\u0639\u0644 \u0648\u062A\u0645\u0636\u064A\u0629 \u0648\u0642\u062A";
    else timeContext = "\u0644\u064A\u0644\u0627\u064B - \u062A\u0641\u0627\u0639\u0644 \u0623\u0642\u0644 \u0644\u0643\u0646 \u0645\u0633\u062A\u062E\u062F\u0645\u0648\u0646 \u0623\u0643\u062B\u0631 \u062A\u0631\u0643\u064A\u0632\u0627\u064B";
    const promotedSummary = promotedPosts.slice(0, 10).map((p, i) => {
      const tier = p.promotionTier || p.promotion_tier || "basic";
      const interests = p.targetInterests || p.target_interests || [];
      const category = p.category || "";
      return `${i + 1}. \u0645\u0633\u062A\u0648\u0649=${tier}, \u062A\u0635\u0646\u064A\u0641=${category}, \u0627\u0633\u062A\u0647\u062F\u0627\u0641=${interests.join("/")}`;
    }).join("\n");
    let aiResult = null;
    try {
      const zai = await getAI();
      if (!zai) {
      } else {
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `\u0623\u0646\u062A \u0645\u062D\u0631\u0643 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064A \u0644\u062A\u062D\u062F\u064A\u062F \u0645\u0648\u0627\u0636\u0639 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0631\u0648\u062C\u0629 \u0641\u064A \u0635\u0641\u062D\u0629 \u0645\u0646\u0635\u0629 \u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0645\u0635\u0631\u064A\u0629 "\u0646\u0648\u0627\u0642\u0635".
\u0645\u0647\u0645\u062A\u0643 \u062A\u062D\u062F\u064A\u062F \u0623\u0641\u0636\u0644 \u0627\u0644\u0645\u0648\u0627\u0636\u0639 \u0644\u0643\u0644 \u0625\u0639\u0644\u0627\u0646 \u0645\u0631\u0648\u062C \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649:
1. \u0623\u062F\u0627\u0621 \u0627\u0644\u0645\u0648\u0627\u0636\u0639 \u0627\u0644\u0633\u0627\u0628\u0642\u0629 (\u0623\u064A \u0645\u0648\u0636\u0639 \u062D\u0642\u0642 \u0623\u0639\u0644\u0649 \u062A\u0641\u0627\u0639\u0644)
2. \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0628\u0627\u0642\u0629 (VIP \u064A\u062D\u062A\u0627\u062C \u0645\u0648\u0636\u0639 \u0623\u0641\u0636\u0644 \u0645\u0646 Basic)
3. \u0645\u0644\u0627\u0621\u0645\u0629 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645
4. \u0648\u0642\u062A \u0627\u0644\u064A\u0648\u0645 \u0648\u0623\u0646\u0645\u0627\u0637 \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645
5. \u0633\u064A\u0627\u0642 \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u064A\u0637 (\u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0627\u0644\u0645\u0634\u0627\u0628\u0647\u0629 \u0642\u0631\u064A\u0628\u0629)

\u0642\u0648\u0627\u0639\u062F:
- \u0627\u0644\u0645\u0648\u0636\u0639 \u064A\u0628\u062F\u0623 \u0645\u0646 0 (\u0623\u0648\u0644 \u0645\u0646\u0634\u0648\u0631)
- \u0644\u0627 \u062A\u0636\u0639 \u0625\u0639\u0644\u0627\u0646\u064A\u0646 \u0645\u0631\u0648\u062C\u064A\u0646 \u0645\u062A\u062C\u0627\u0648\u0631\u064A\u0646
- \u0623\u0648\u0644 \u0625\u0639\u0644\u0627\u0646 \u0645\u0631\u0648\u062C \u064A\u0638\u0647\u0631 \u0628\u0639\u062F \u0627\u0644\u0645\u0648\u0636\u0639 1 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644
- \u0625\u0639\u0644\u0627\u0646\u0627\u062A VIP \u062A\u0638\u0647\u0631 \u0641\u064A \u0645\u0648\u0627\u0636\u0639 \u0623\u0643\u062B\u0631 \u0628\u0631\u0648\u0632\u0627\u064B
- \u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0627\u0644\u0623\u0647\u0645\u064A\u0629 \u0627\u0644\u0645\u062A\u0637\u0627\u0628\u0642\u0629 \u062A\u0638\u0647\u0631 \u0623\u0648\u0644\u0627\u064B
- \u0627\u0644\u0648\u0632\u0646 \u0628\u064A\u0646 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0627\u0644\u0639\u0627\u062F\u064A\u0629 \u0648\u0627\u0644\u0645\u0631\u0648\u062C\u0629 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u062A\u0648\u0627\u0632\u0646\u0627\u064B

\u0623\u062C\u0628 \u0628\u0640 JSON \u0641\u0642\u0637 \u0628\u0627\u0644\u0634\u0643\u0644 \u0627\u0644\u062A\u0627\u0644\u064A:
{
  "positions": [{"postIndex": 0, "feedPosition": 2, "reason": "\u0627\u0644\u0633\u0628\u0628"}],
  "strategy": "\u0648\u0635\u0641 \u0627\u0644\u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A\u0629",
  "peakPositions": [2, 5, 8],
  "avoidPositions": [0, 1],
  "reasoning": "\u0634\u0631\u062D \u0639\u0627\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064A",
  "confidence": 0.85
}`
            },
            {
              role: "user",
              content: `\u062D\u062F\u062F \u0645\u0648\u0627\u0636\u0639 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0631\u0648\u062C\u0629:
\u0639\u062F\u062F \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0631\u0648\u062C\u0629: ${promotedCount}
\u0639\u062F\u062F \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0627\u0644\u0639\u0627\u062F\u064A\u0629: ${Math.max(regularCount, 0)}
\u0646\u0648\u0639 \u0627\u0644\u0635\u0641\u062D\u0629: ${feedType === "market" ? "\u0627\u0644\u0633\u0648\u0642 \u0627\u0644\u0630\u0643\u064A" : feedType === "matches" ? "\u0645\u062A\u0648\u0627\u0641\u0642 \u0645\u0639\u064A" : "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629"}
\u0648\u0642\u062A \u0627\u0644\u064A\u0648\u0645: ${timeContext}
\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${interestsKey || "\u0639\u0627\u0645"}

\u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0631\u0648\u062C\u0629:
${promotedSummary}

\u0623\u062F\u0627\u0621 \u0627\u0644\u0645\u0648\u0627\u0636\u0639 \u0627\u0644\u0633\u0627\u0628\u0642\u0629:
${engagementSummary || "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0633\u0627\u0628\u0642\u0629 - \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u062A\u0648\u0632\u064A\u0639 \u0627\u0644\u0645\u062A\u0648\u0627\u0632\u0646"}`
            }
          ],
          temperature: 0.5,
          max_tokens: 800
        });
        const content = completion.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (aiError) {
      console.error("[AI] Smart placement AI error:", aiError.message);
    }
    let result;
    if (aiResult && Array.isArray(aiResult.positions) && aiResult.positions.length > 0) {
      result = {
        positions: aiResult.positions,
        strategy: aiResult.strategy || "AI \u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A\u0629 \u0630\u0643\u064A\u0629",
        peakPositions: aiResult.peakPositions || [2, 5, 8],
        avoidPositions: aiResult.avoidPositions || [0, 1],
        reasoning: aiResult.reasoning || "\u062A\u062D\u0644\u064A\u0644 \u0630\u0643\u064A \u0628\u0646\u0627\u0621\u064B \u0639\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u0648\u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A",
        confidence: aiResult.confidence || 0.7
      };
    } else {
      const positions = [];
      const tierOrder = { vip: 4, premium: 3, interest_target: 3, standard: 2, city_target: 2, basic: 1 };
      const sortedPromoted = promotedPosts.map((p, i) => ({
        index: i,
        tier: p.promotionTier || p.promotion_tier || "basic",
        interests: p.targetInterests || p.target_interests || [],
        category: p.category || ""
      })).sort((a, b) => (tierOrder[b.tier] || 0) - (tierOrder[a.tier] || 0));
      let baseFrequency = Math.max(2, Math.floor(regularCount / (promotedCount || 1)));
      if (baseFrequency > 6) baseFrequency = 6;
      if (baseFrequency < 2) baseFrequency = 2;
      const bestPositions = [];
      const worstPositions = [];
      if (Object.keys(positionStats).length > 0) {
        const sortedPositions = Object.entries(positionStats).map(([pos, stats]) => ({
          position: parseInt(pos),
          ctr: stats.impressions > 0 ? stats.clicks / stats.impressions : 0
        })).sort((a, b) => b.ctr - a.ctr);
        bestPositions.push(...sortedPositions.slice(0, 5).map((p) => p.position));
        worstPositions.push(...sortedPositions.slice(-3).map((p) => p.position));
      }
      let positionOffset = 1;
      if (currentHour >= 17 && currentHour < 22) {
        positionOffset = 1;
      } else if (currentHour >= 5 && currentHour < 12) {
        positionOffset = 2;
      } else if (currentHour >= 22 || currentHour < 5) {
        baseFrequency = Math.max(2, baseFrequency - 1);
        positionOffset = 1;
      }
      let nextPosition = positionOffset;
      for (let i = 0; i < sortedPromoted.length; i++) {
        const promo = sortedPromoted[i];
        const tier = promo.tier;
        let tierFrequency = baseFrequency;
        if (tier === "vip") tierFrequency = Math.max(2, baseFrequency - 1);
        else if (tier === "premium" || tier === "interest_target") tierFrequency = baseFrequency;
        else if (tier === "basic") tierFrequency = baseFrequency + 1;
        let finalPosition = nextPosition;
        if (bestPositions.length > 0) {
          const bestPos = bestPositions.find((p) => p >= nextPosition && !positions.some((pp) => pp.feedPosition === p));
          if (bestPos !== void 0) finalPosition = bestPos;
        }
        if (worstPositions.includes(finalPosition)) {
          finalPosition = worstPositions.includes(finalPosition + 1) ? finalPosition + 2 : finalPosition + 1;
        }
        positions.push({
          postIndex: promo.index,
          feedPosition: finalPosition,
          reason: `${tier === "vip" ? "\u0645\u0648\u0636\u0639 \u0645\u062A\u0645\u064A\u0632 \u0644\u0628\u0627\u0642\u0629 VIP" : tier === "premium" ? "\u0645\u0648\u0636\u0639 \u0645\u0645\u064A\u0632" : "\u062A\u0648\u0632\u064A\u0639 \u0645\u062A\u0648\u0627\u0632\u0646"}`
        });
        nextPosition = finalPosition + tierFrequency;
      }
      result = {
        positions,
        strategy: "\u062A\u0648\u0632\u064A\u0639 \u0630\u0643\u064A \u0645\u0628\u0646\u064A \u0639\u0644\u0649 \u0627\u0644\u0642\u0648\u0627\u0639\u062F \u0648\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A",
        peakPositions: bestPositions.length > 0 ? bestPositions : [2, 5, 8],
        avoidPositions: worstPositions.length > 0 ? worstPositions : [0, 1],
        reasoning: `\u062A\u0648\u0632\u064A\u0639 \u0630\u0643\u064A: ${promotedCount} \u0625\u0639\u0644\u0627\u0646 \u0645\u0631\u0648\u062C \u0628\u064A\u0646 ${regularCount} \u0645\u0646\u0634\u0648\u0631 \u0639\u0627\u062F\u064A. \u0641\u062A\u0631\u0629 ${timeContext.split(" - ")[0]}. \u062A\u0643\u0631\u0627\u0631 \u0643\u0644 ${baseFrequency} \u0645\u0646\u0634\u0648\u0631\u0627\u062A.`,
        confidence: 0.6
      };
    }
    try {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1e3).toISOString();
      db2.prepare(`
        INSERT OR REPLACE INTO ai_placement_cache (cache_key, strategy, feed_type, user_id, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(cacheKey, JSON.stringify(result), feedType || "home", userId || null, expiresAt);
    } catch {
    }
    res.json({ success: true, ...result, fromCache: false });
  } catch (error) {
    console.error("[AI] Smart placement error:", error.message);
    const { promotedPosts, totalPosts } = req.body;
    const promotedCount = Array.isArray(promotedPosts) ? promotedPosts.length : 0;
    const regularCount = (totalPosts || 20) - promotedCount;
    const frequency = Math.max(2, Math.floor(regularCount / (promotedCount || 1)));
    const positions = promotedPosts.map((_, i) => ({
      postIndex: i,
      feedPosition: 1 + i * frequency,
      reason: "\u062A\u0648\u0632\u064A\u0639 \u0645\u062A\u0633\u0627\u0648\u064D"
    }));
    res.json({
      success: true,
      positions,
      strategy: "\u062A\u0648\u0632\u064A\u0639 \u0628\u0633\u064A\u0637 \u0645\u062A\u0633\u0627\u0648\u064D",
      peakPositions: [2, 5, 8],
      avoidPositions: [0, 1],
      reasoning: "\u062A\u0648\u0632\u064A\u0639 \u0623\u0633\u0627\u0633\u064A - \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D",
      confidence: 0.3
    });
  }
});
router9.post("/track-engagement", async (req, res) => {
  try {
    const userId = req.user?.userId || null;
    if (!userId) return res.status(401).json({ error: "\u064A\u062C\u0628 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.json({ tracked: 0 });
    }
    const db2 = database_default;
    const sessionId = req.headers["x-session-id"] || "";
    let trackedCount = 0;
    const insertStmt = db2.prepare(`
      INSERT INTO promotion_engagement (post_id, user_id, feed_position, feed_type, action, time_on_screen, scroll_depth, session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const event of events) {
      try {
        if (!event.postId || !event.action) continue;
        insertStmt.run(
          event.postId,
          userId,
          event.feedPosition || 0,
          event.feedType || "home",
          event.action,
          // 'impression', 'click', 'view', 'scroll_past'
          event.timeOnScreen || 0,
          event.scrollDepth || 0,
          sessionId
        );
        trackedCount++;
      } catch {
      }
    }
    if (trackedCount > 5) {
      try {
        db2.prepare("UPDATE ai_placement_cache SET expires_at = datetime('now') WHERE feed_type IN ('home', 'market')").run();
      } catch {
      }
    }
    res.json({ tracked: trackedCount });
  } catch (error) {
    console.error("[AI] Engagement tracking error:", error.message);
    res.json({ tracked: 0 });
  }
});
router9.get("/placement-analytics", async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "\u064A\u062C\u0628 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
    const db2 = database_default;
    const { feedType, days } = req.query;
    const feed = feedType || "home";
    const daysBack = parseInt(days) || 7;
    const positionPerformance = db2.prepare(`
      SELECT
        feed_position,
        COUNT(CASE WHEN action = 'impression' THEN 1 END) as impressions,
        COUNT(CASE WHEN action = 'click' THEN 1 END) as clicks,
        COUNT(CASE WHEN action = 'view' THEN 1 END) as views,
        AVG(CASE WHEN action = 'impression' THEN time_on_screen END) as avg_time_on_screen,
        AVG(CASE WHEN action = 'impression' THEN scroll_depth END) as avg_scroll_depth
      FROM promotion_engagement
      WHERE feed_type = ? AND created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY feed_position
      ORDER BY feed_position
    `).all(feed, daysBack);
    const analyzedPositions = positionPerformance.map((p) => ({
      ...p,
      ctr: p.impressions > 0 ? (p.clicks / p.impressions * 100).toFixed(2) : "0",
      engagementScore: p.impressions > 0 ? Math.round((p.clicks * 3 + p.views * 1 + p.avg_time_on_screen * 0.5) / p.impressions * 100) / 100 : 0
    }));
    const bestPosition = analyzedPositions.length > 0 ? analyzedPositions.reduce((best, p) => parseFloat(p.ctr) > parseFloat(best.ctr) ? p : best) : null;
    const worstPosition = analyzedPositions.length > 0 ? analyzedPositions.reduce((worst, p) => parseFloat(p.ctr) < parseFloat(worst.ctr) ? p : worst) : null;
    const timePerformance = db2.prepare(`
      SELECT
        CAST(strftime('%H', created_at) AS INTEGER) as hour,
        COUNT(CASE WHEN action = 'impression' THEN 1 END) as impressions,
        COUNT(CASE WHEN action = 'click' THEN 1 END) as clicks
      FROM promotion_engagement
      WHERE feed_type = ? AND created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY hour
      ORDER BY hour
    `).all(feed, daysBack);
    const feedComparison = db2.prepare(`
      SELECT
        feed_type,
        COUNT(CASE WHEN action = 'impression' THEN 1 END) as impressions,
        COUNT(CASE WHEN action = 'click' THEN 1 END) as clicks
      FROM promotion_engagement
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY feed_type
    `).all(daysBack);
    let aiRecommendations = [];
    try {
      const bestPos = bestPosition?.feed_position || 3;
      const worstPos = worstPosition?.feed_position || 0;
      const bestHour = timePerformance.length > 0 ? timePerformance.reduce(
        (best, h) => h.impressions > 0 && h.clicks / h.impressions > (best.impressions > 0 ? best.clicks / best.impressions : 0) ? h : best
      ).hour : null;
      if (bestPos !== void 0) aiRecommendations.push(`\u0623\u0641\u0636\u0644 \u0645\u0648\u0636\u0639 \u0644\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0647\u0648 \u0627\u0644\u0645\u0648\u0636\u0639 ${bestPos} - \u062D\u0642\u0642 \u0623\u0639\u0644\u0649 \u0645\u0639\u062F\u0644 \u0646\u0642\u0631`);
      if (worstPos !== void 0) aiRecommendations.push(`\u062A\u062C\u0646\u0651\u0628 \u0627\u0644\u0645\u0648\u0636\u0639 ${worstPos} - \u0623\u0642\u0644 \u0645\u0639\u062F\u0644 \u062A\u0641\u0627\u0639\u0644`);
      if (bestHour !== null) aiRecommendations.push(`\u0623\u0641\u0636\u0644 \u0633\u0627\u0639\u0629 \u0644\u0644\u062A\u0641\u0627\u0639\u0644 \u0647\u064A ${bestHour}:00 - \u0641\u0643\u0651\u0631 \u0641\u064A \u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u062A\u0631\u0648\u064A\u062C \u0641\u064A \u0647\u0630\u0627 \u0627\u0644\u0648\u0642\u062A`);
      if (analyzedPositions.length === 0) aiRecommendations.push("\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A \u0643\u0627\u0641\u064A\u0629 \u0628\u0639\u062F - \u0627\u0633\u062A\u0645\u0631 \u0641\u064A \u0627\u0644\u062A\u0631\u0648\u064A\u062C \u0644\u062C\u0645\u0639 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A");
    } catch {
    }
    res.json({
      success: true,
      data: {
        positionPerformance: analyzedPositions,
        bestPosition,
        worstPosition,
        timePerformance,
        feedComparison,
        aiRecommendations,
        totalEvents: analyzedPositions.reduce((sum, p) => sum + p.impressions + p.clicks + p.views, 0)
      }
    });
  } catch (error) {
    console.error("[AI] Placement analytics error:", error.message);
    res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u0644\u064A\u0644\u0627\u062A \u0627\u0644\u0645\u0648\u0627\u0636\u0639" });
  }
});
router9.post("/analyze-my-posts", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "\u064A\u062C\u0628 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
    const db2 = database_default;
    const userPosts = db2.prepare(
      "SELECT id, content, category, price, location, type, image, likes, comments, shares, is_promoted, promotion_status, promotion_tier, created_at FROM posts WHERE author_id = ? ORDER BY created_at DESC"
    ).all(userId);
    const user = getUserById(userId);
    const walletBalance = user?.wallet_balance || 0;
    const userInterests = user?.interests || "";
    const userLocation = user?.location || "";
    const totalPosts = userPosts.length;
    const promotedPosts = userPosts.filter((p) => p.is_promoted === 1).length;
    const unpromotedPosts = totalPosts - promotedPosts;
    if (totalPosts === 0) {
      return res.json({
        success: true,
        data: {
          totalPosts: 0,
          promotedPosts: 0,
          unpromotedPosts: 0,
          posts: [],
          topPick: null,
          overallStrategy: "\u0644\u064A\u0633 \u0644\u062F\u064A\u0643 \u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0628\u0639\u062F. \u0623\u0646\u0634\u0626 \u0645\u0646\u0634\u0648\u0631 \u0623\u0648\u0644\u0627\u064B \u062B\u0645 \u0639\u062F \u0644\u062A\u062D\u0644\u064A\u0644\u0647\u0627!",
          budgetRecommendation: { totalNeeded: 0, suggestedPackages: [] },
          aiTips: ["\u0623\u0646\u0634\u0626 \u0625\u0639\u0644\u0627\u0646 \u0628\u062A\u0635\u0646\u064A\u0641 \u0648\u0627\u0636\u062D \u0648\u0635\u0648\u0631\u0629 \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u062C\u0648\u062F\u0629", "\u062D\u062F\u062F \u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u0644\u0645\u0648\u0642\u0639 \u0641\u064A \u0627\u0644\u0625\u0639\u0644\u0627\u0646", "\u0628\u0639\u062F \u0627\u0644\u0625\u0646\u0634\u0627\u0621\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u062A\u062D\u0644\u064A\u0644 \u0645\u0646\u0634\u0648\u0631\u0627\u062A\u064A \u0644\u0645\u0639\u0631\u0641\u0629 \u0623\u0641\u0636\u0644\u0647\u0627 \u0644\u0644\u062A\u0631\u0648\u064A\u062C"]
        }
      });
    }
    const postsSummary = userPosts.map((p, i) => {
      const daysAgo = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1e3 * 60 * 60 * 24));
      return `${i + 1}. [${p.is_promoted ? "\u0645\u0631\u0648\u0651\u062C" : "\u063A\u064A\u0631 \u0645\u0631\u0648\u0651\u062C"}] "${p.content?.slice(0, 150) || ""}" | \u062A\u0635\u0646\u064A\u0641: ${p.category || "\u0639\u0627\u0645"} | \u0633\u0639\u0631: ${p.price || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"} \u062C.\u0645 | \u0645\u0648\u0642\u0639: ${p.location || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"} | \u0625\u0639\u062C\u0627\u0628\u0627\u062A: ${p.likes || 0} | \u062A\u0639\u0644\u064A\u0642\u0627\u062A: ${p.comments || 0} | \u0645\u0634\u0627\u0631\u0643\u0627\u062A: ${p.shares || 0} | ${p.image ? "\u{1F4F8} \u0644\u062F\u064A\u0647 \u0635\u0648\u0631\u0629" : "\u274C \u0628\u062F\u0648\u0646 \u0635\u0648\u0631\u0629"} | \u0642\u0628\u0644 ${daysAgo} \u064A\u0648\u0645${p.is_promoted ? ` | \u0628\u0627\u0642\u0629: ${p.promotion_tier || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}` : ""}`;
    }).join("\n");
    let aiResult = null;
    try {
      const zai = await getAI();
      if (!zai) {
      } else {
        const completion = await zai.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `\u0623\u0646\u062A \u062E\u0628\u064A\u0631 \u062A\u0633\u0648\u064A\u0642 \u0648\u062A\u0631\u0648\u064A\u062C \u0639\u0644\u0649 \u0645\u0646\u0635\u0629 \u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0630\u0643\u064A\u0629 \u0641\u064A \u0645\u0635\u0631 \u0627\u0633\u0645\u0647\u0627 "\u0646\u0648\u0627\u0642\u0635".
\u0645\u0647\u0645\u062A\u0643 \u062A\u062D\u0644\u064A\u0644 \u0643\u0644 \u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0648\u062A\u0642\u062F\u064A\u0645 \u062A\u0648\u0635\u064A\u0627\u062A \u0634\u0627\u0645\u0644\u0629 \u0644\u0644\u062A\u0631\u0648\u064A\u062C.

\u0628\u0627\u0642\u0627\u062A \u0627\u0644\u062A\u0631\u0648\u064A\u062C \u0627\u0644\u0645\u062A\u0627\u062D\u0629:
- \u0623\u0633\u0627\u0633\u064A (50 \u062C.\u0645): 900 \u0648\u0635\u0648\u0644\u060C 3 \u0623\u064A\u0627\u0645\u060C 30 \u0625\u0634\u0639\u0627\u0631
- \u0642\u064A\u0627\u0633\u064A (120 \u062C.\u0645): 3,000 \u0648\u0635\u0648\u0644\u060C 5 \u0623\u064A\u0627\u0645\u060C 100 \u0625\u0634\u0639\u0627\u0631
- \u0645\u0645\u064A\u0632 (250 \u062C.\u0645): 8,000 \u0648\u0635\u0648\u0644\u060C 7 \u0623\u064A\u0627\u0645\u060C 250 \u0625\u0634\u0639\u0627\u0631 (\u0627\u0644\u0623\u0643\u062B\u0631 \u0637\u0644\u0628\u0627\u064B)
- VIP (500 \u062C.\u0645): 25,000 \u0648\u0635\u0648\u0644\u060C 10 \u0623\u064A\u0627\u0645\u060C 600 \u0625\u0634\u0639\u0627\u0631
- \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0645\u062F\u0646 (\u0645\u0646 120 \u062C.\u0645): \u0627\u062E\u062A\u064A\u0627\u0631 1-27 \u0645\u062F\u064A\u0646\u0629 \u0645\u0635\u0631\u064A\u0629
- \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A (200 \u062C.\u0645): 7,000 \u0648\u0635\u0648\u0644\u060C 5 \u0623\u064A\u0627\u0645\u060C 200 \u0625\u0634\u0639\u0627\u0631

\u0645\u0647\u0645: \u0639\u0646\u062F\u0645\u0627 \u062A\u0630\u0643\u0631 \u0627\u0633\u0645 \u0628\u0627\u0642\u0629 \u0641\u064A \u0627\u0644\u0646\u0635\u060C \u0627\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0639\u0631\u0628\u064A \u062F\u0627\u0626\u0645\u0627\u064B (\u0623\u0633\u0627\u0633\u064A\u060C \u0642\u064A\u0627\u0633\u064A\u060C \u0645\u0645\u064A\u0632\u060C VIP\u060C \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0645\u062F\u0646\u060C \u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A) \u0648\u0644\u0627 \u062A\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A \u0623\u0628\u062F\u0627\u064B.

\u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A \u0627\u0644\u0645\u062A\u0627\u062D\u0629: phones, electronics, games, cars, realEstate, fashion, beauty, sports, food, jobs, services, education, books, animals, travel, photography, health, other

\u0627\u0644\u0645\u062F\u0646 \u0627\u0644\u0645\u0635\u0631\u064A\u0629: \u0627\u0644\u0642\u0627\u0647\u0631\u0629\u060C \u0627\u0644\u062C\u064A\u0632\u0629\u060C \u0627\u0644\u0625\u0633\u0643\u0646\u062F\u0631\u064A\u0629\u060C \u0627\u0644\u0645\u0646\u0635\u0648\u0631\u0629\u060C \u0637\u0646\u0637\u0627\u060C \u0627\u0644\u0632\u0642\u0627\u0632\u064A\u0642\u060C \u0628\u0648\u0631\u0633\u0639\u064A\u062F\u060C \u0627\u0644\u0633\u0648\u064A\u0633\u060C \u0627\u0644\u0625\u0633\u0645\u0627\u0639\u064A\u0644\u064A\u0629\u060C \u0627\u0644\u0641\u064A\u0648\u0645\u060C \u0623\u0633\u064A\u0648\u0637\u060C \u0627\u0644\u0645\u0646\u064A\u0627\u060C \u0633\u0648\u0647\u0627\u062C\u060C \u0642\u0646\u0627\u060C \u0627\u0644\u0623\u0642\u0635\u0631\u060C \u0623\u0633\u0648\u0627\u0646\u060C \u062F\u0645\u064A\u0627\u0637\u060C \u0643\u0641\u0631 \u0627\u0644\u0634\u064A\u062E\u060C \u0628\u0646\u0647\u0627\u060C \u0634\u0628\u064A\u0646 \u0627\u0644\u0643\u0648\u0645\u060C \u0645\u0631\u0633\u0649 \u0645\u0637\u0631\u0648\u062D\u060C \u0627\u0644\u063A\u0631\u062F\u0642\u0629\u060C \u0634\u0631\u0645 \u0627\u0644\u0634\u064A\u062E

\u062D\u0644\u0644 \u0643\u0644 \u0645\u0646\u0634\u0648\u0631 \u0648\u0642\u064A\u0651\u0645 \u0625\u0645\u0643\u0627\u0646\u064A\u0629 \u0627\u0644\u062A\u0631\u0648\u064A\u062C. \u0623\u062C\u0628 \u0628\u0640 JSON \u0641\u0642\u0637 \u0628\u0627\u0644\u0634\u0643\u0644 \u0627\u0644\u062A\u0627\u0644\u064A:
{
  "posts": [
    {
      "promotionScore": 85,
      "promotionPotential": "high|medium|low",
      "suggestedPackage": "premium|standard|basic|vip|city_target|interest_target",
      "suggestedInterests": ["interest1", "interest2"],
      "suggestedCities": ["\u0645\u062F\u064A\u0646\u06291", "\u0645\u062F\u064A\u0646\u06292"],
      "contentTips": ["\u0646\u0635\u064A\u062D\u06291", "\u0646\u0635\u064A\u062D\u06292"]
    }
  ],
  "topPickIndex": 0,
  "topPickReason": "\u0633\u0628\u0628 \u0627\u062E\u062A\u064A\u0627\u0631 \u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u0643\u0623\u0641\u0636\u0644 \u062E\u064A\u0627\u0631",
  "overallStrategy": "\u0627\u0633\u062A\u0631\u0627\u062A\u064A\u062C\u064A\u0629 \u0634\u0627\u0645\u0644\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064A",
  "budgetRecommendation": {
    "totalNeeded": 500,
    "suggestedPackages": [
      {"priority": 1, "postId": "id", "package": "premium", "price": 350, "reason": "\u0627\u0644\u0633\u0628\u0628"},
      {"priority": 2, "postId": "id", "package": "standard", "price": 150, "reason": "\u0627\u0644\u0633\u0628\u0628"}
    ]
  },
  "aiTips": ["\u0646\u0635\u064A\u062D\u06291", "\u0646\u0635\u064A\u062D\u06292", "\u0646\u0635\u064A\u062D\u06293"]
}`
            },
            {
              role: "user",
              content: `\u062D\u0644\u0644 \u0645\u0646\u0634\u0648\u0631\u0627\u062A\u064A \u0648\u0627\u0642\u062A\u0631\u062D \u0623\u0641\u0636\u0644\u0647\u0627 \u0644\u0644\u062A\u0631\u0648\u064A\u062C:

\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645:
- \u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062D\u0641\u0638\u0629: ${walletBalance} \u062C.\u0645
- \u0627\u0644\u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A: ${userInterests || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}
- \u0627\u0644\u0645\u0648\u0642\u0639: ${userLocation || "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}
- \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A: ${totalPosts}
- \u0645\u0631\u0648\u0651\u062C\u0629: ${promotedPosts} | \u063A\u064A\u0631 \u0645\u0631\u0648\u0651\u062C\u0629: ${unpromotedPosts}

\u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A:
${postsSummary}`
            }
          ],
          temperature: 0.7,
          max_tokens: 2e3
        });
        const content = completion.choices?.[0]?.message?.content || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (aiError) {
      console.error("[AI] Analyze my posts AI error:", aiError.message);
    }
    const categoryToInterests = {
      phones: ["phones", "electronics"],
      electronics: ["electronics", "phones"],
      cars: ["cars"],
      realEstate: ["realEstate"],
      games: ["games", "electronics"],
      fashion: ["fashion", "beauty"],
      beauty: ["beauty", "fashion"],
      sports: ["sports"],
      food: ["food"],
      jobs: ["jobs", "education"],
      services: ["services", "jobs"],
      education: ["education", "books"],
      books: ["books", "education"],
      animals: ["animals"],
      travel: ["travel", "photography"],
      photography: ["photography", "travel"],
      health: ["health", "beauty"]
    };
    const postsAnalysis = userPosts.map((p, i) => {
      const daysAgo = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1e3 * 60 * 60 * 24));
      const aiPost = aiResult?.posts?.[i] || null;
      let score = 50;
      if (p.image) score += 15;
      if (p.price && p.price > 0) score += 10;
      if (p.category) score += 5;
      if (p.content && p.content.length > 50) score += 5;
      if (p.likes > 5) score += 5;
      if (p.comments > 2) score += 5;
      if (daysAgo <= 3) score += 5;
      if (p.is_promoted) score -= 20;
      if (!p.image) score -= 10;
      if (!p.price) score -= 5;
      score = Math.max(0, Math.min(100, score));
      const cat = p.category || "other";
      const suggestedInterests = aiPost?.suggestedInterests || categoryToInterests[cat] || ["other"];
      const suggestedCities = aiPost?.suggestedCities || [p.location || userLocation || "\u0627\u0644\u0642\u0627\u0647\u0631\u0629"];
      let suggestedPackageId = aiPost?.suggestedPackage || "standard";
      const arToEngMap = { "\u0623\u0633\u0627\u0633\u064A": "basic", "\u0642\u064A\u0627\u0633\u064A": "standard", "\u0645\u0645\u064A\u0632": "premium", "VIP": "vip", "\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0645\u062F\u0646": "city_target", "\u0627\u0633\u062A\u0647\u062F\u0627\u0641 \u0627\u0647\u062A\u0645\u0627\u0645\u0627\u062A": "interest_target" };
      if (arToEngMap[suggestedPackageId]) suggestedPackageId = arToEngMap[suggestedPackageId];
      if (p.price && p.price > 1e4 && !aiPost) suggestedPackageId = "premium";
      const suggestedPackageAr = arPkg(suggestedPackageId);
      return {
        postId: p.id,
        contentPreview: (p.content || "").slice(0, 80),
        category: p.category || "\u0639\u0627\u0645",
        price: p.price || 0,
        promotionScore: aiPost?.promotionScore || score,
        promotionPotential: aiPost?.promotionPotential || (score >= 70 ? "high" : score >= 40 ? "medium" : "low"),
        suggestedPackage: suggestedPackageAr,
        suggestedPackageId,
        suggestedInterests,
        suggestedCities,
        contentTips: aiPost?.contentTips || [
          ...p.image ? [] : ["\u0623\u0636\u0641 \u0635\u0648\u0631\u0629 \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u062C\u0648\u062F\u0629 - \u062A\u0632\u064A\u062F \u0627\u0644\u062A\u0641\u0627\u0639\u0644 40%"],
          ...p.price ? [] : ["\u062D\u062F\u062F \u0627\u0644\u0633\u0639\u0631 \u0628\u0648\u0636\u0648\u062D \u0644\u062C\u0630\u0628 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0646 \u0627\u0644\u062C\u0627\u062F\u064A\u0646"],
          ...p.content?.length > 30 ? [] : ["\u0623\u0636\u0641 \u062A\u0641\u0627\u0635\u064A\u0644 \u0623\u0643\u062B\u0631 \u0639\u0646 \u0627\u0644\u0645\u0646\u062A\u062C"],
          "\u0627\u0630\u0643\u0631 \u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0646\u062A\u062C \u0648\u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062A\u0648\u0627\u0635\u0644"
        ],
        hasImage: !!p.image,
        likes: p.likes || 0,
        isPromoted: !!p.is_promoted,
        daysAgo
      };
    });
    const sortedByScore = [...postsAnalysis].filter((p) => !p.isPromoted).sort((a, b) => b.promotionScore - a.promotionScore);
    const topPickPost = sortedByScore[0] || postsAnalysis[0];
    const topPick = {
      postId: topPickPost.postId,
      reason: replacePkgNamesInText(aiResult?.topPickReason || `\u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u0634\u0648\u0631 \u062D\u0635\u0644 \u0639\u0644\u0649 \u0623\u0639\u0644\u0649 \u0646\u0642\u0627\u0637 \u062A\u0631\u0648\u064A\u062C (${topPickPost.promotionScore}/100) - ${topPickPost.hasImage ? "\u0644\u062F\u064A\u0647 \u0635\u0648\u0631\u0629" : "\u064A\u0646\u0635\u062D \u0628\u0625\u0636\u0627\u0641\u0629 \u0635\u0648\u0631\u0629"}\u060C \u062A\u0635\u0646\u064A\u0641 "${topPickPost.category}"\u060C \u0648\u0627\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u0642\u062A\u0631\u062D\u0629 "${topPickPost.suggestedPackage}"`)
    };
    const overallStrategy = replacePkgNamesInText(aiResult?.overallStrategy || (unpromotedPosts > 0 ? `\u0644\u062F\u064A\u0643 ${unpromotedPosts} \u0645\u0646\u0634\u0648\u0631 \u063A\u064A\u0631 \u0645\u0631\u0648\u0651\u062C. \u0646\u0646\u0635\u062D \u0628\u0627\u0644\u0628\u062F\u0621 \u0628\u0645\u0646\u0634\u0648\u0631 "${topPickPost.contentPreview.slice(0, 30)}..." \u0648\u0628\u0627\u0642\u0629 ${topPickPost.suggestedPackage}. \u0631\u0643\u0632 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0630\u0627\u062A \u0627\u0644\u0635\u0648\u0631 \u0648\u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0648\u0627\u0636\u062D\u0629 \u0623\u0648\u0644\u0627\u064B.` : "\u062C\u0645\u064A\u0639 \u0645\u0646\u0634\u0648\u0631\u0627\u062A\u0643 \u0645\u0631\u0648\u0651\u062C\u0629! \u0631\u0627\u0642\u0628 \u0623\u062F\u0627\u0621\u0647\u0627 \u0648\u062C\u0631\u0651\u0628 \u0628\u0627\u0642\u0627\u062A \u0623\u0639\u0644\u0649 \u0644\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A \u0627\u0644\u0623\u0643\u062B\u0631 \u062A\u0641\u0627\u0639\u0644\u0627\u064B."));
    const unpromotedHighPotential = postsAnalysis.filter((p) => !p.isPromoted && p.promotionScore >= 60).sort((a, b) => b.promotionScore - a.promotionScore);
    const pkgPrices = { basic: 50, standard: 120, premium: 250, vip: 500, city_target: 120, interest_target: 200 };
    const suggestedPackages = aiResult?.budgetRecommendation?.suggestedPackages ? aiResult.budgetRecommendation.suggestedPackages.map((sp) => ({
      ...sp,
      package: arPkg(sp.package),
      reason: replacePkgNamesInText(sp.reason || "")
    })) : unpromotedHighPotential.slice(0, 3).map((p, i) => ({
      priority: i + 1,
      postId: p.postId,
      package: p.suggestedPackage || "\u0642\u064A\u0627\u0633\u064A",
      price: pkgPrices[p.suggestedPackageId] || 120,
      reason: `\u0645\u0646\u0634\u0648\u0631 \u0628\u0646\u0642\u0627\u0637 ${p.promotionScore}/100 - ${p.hasImage ? "\u0644\u062F\u064A\u0647 \u0635\u0648\u0631\u0629" : "\u064A\u062D\u062A\u0627\u062C \u0635\u0648\u0631\u0629"}`
    }));
    const totalNeeded = aiResult?.budgetRecommendation?.totalNeeded || suggestedPackages.reduce((sum, p) => sum + (p.price || 0), 0);
    const aiTips = (aiResult?.aiTips || [
      "\u0623\u0636\u0641 \u0635\u0648\u0631 \u0639\u0627\u0644\u064A\u0629 \u0627\u0644\u062C\u0648\u062F\u0629 \u0644\u0643\u0644 \u0625\u0639\u0644\u0627\u0646 - \u062A\u0632\u064A\u062F \u0627\u0644\u062A\u0641\u0627\u0639\u0644 \u0628\u0646\u0633\u0628\u0629 40%",
      "\u062D\u062F\u062F \u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u0644\u0645\u0648\u0642\u0639 \u062F\u0627\u0626\u0645\u0627\u064B - \u0625\u0639\u0644\u0627\u0646\u0627\u062A \u0648\u0627\u0636\u062D\u0629 \u062A\u062D\u0642\u0642 \u0646\u062A\u0627\u0626\u062C \u0623\u0641\u0636\u0644",
      "\u0627\u0628\u062F\u0623 \u0628\u0628\u0627\u0642\u0629 \u0642\u064A\u0627\u0633\u064A \u0623\u0648 \u0645\u0645\u064A\u0632 - \u062A\u0648\u0627\u0632\u0646 \u062C\u064A\u062F \u0628\u064A\u0646 \u0627\u0644\u062A\u0643\u0644\u0641\u0629 \u0648\u0627\u0644\u0648\u0635\u0648\u0644"
    ]).map((tip) => replacePkgNamesInText(tip));
    res.json({
      success: true,
      data: {
        totalPosts,
        promotedPosts,
        unpromotedPosts,
        posts: postsAnalysis,
        topPick,
        overallStrategy,
        budgetRecommendation: {
          totalNeeded,
          suggestedPackages
        },
        aiTips
      }
    });
  } catch (error) {
    console.error("[AI] Analyze my posts error:", error.message);
    res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0641\u064A \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0646\u0634\u0648\u0631\u0627\u062A" });
  }
});
var ai_default = router9;

// src/server.ts
var rootDir = process.cwd();
var PERSISTENT_DIR2 = fs5.existsSync("/data") ? "/data" : path5.resolve(rootDir, "data");
console.log(`[SETUP] Persistent storage: ${PERSISTENT_DIR2}`);
var envPath = fs5.existsSync(path5.resolve(PERSISTENT_DIR2, ".env")) ? path5.resolve(PERSISTENT_DIR2, ".env") : path5.resolve(rootDir, ".env");
var envExamplePath = path5.resolve(rootDir, ".env.example");
if (!fs5.existsSync(envPath) && fs5.existsSync(envExamplePath)) {
  fs5.copyFileSync(envExamplePath, envPath);
  console.log(`[SETUP] Created .env at ${envPath}`);
}
for (const dir of ["uploads", "data", "backups"]) {
  const dirPath = path5.resolve(rootDir, dir);
  if (!fs5.existsSync(dirPath)) {
    fs5.mkdirSync(dirPath, { recursive: true });
    console.log(`[SETUP] Created ${dir}/ directory`);
  }
}
for (const dir of ["uploads", "uploads/videos", "backups"]) {
  const dirPath = path5.resolve(PERSISTENT_DIR2, dir);
  if (!fs5.existsSync(dirPath)) {
    fs5.mkdirSync(dirPath, { recursive: true });
    console.log(`[SETUP] Created persistent ${dir}/ directory`);
  }
}
dotenv.config({ path: envPath });
dotenv.config({ path: path5.resolve(rootDir, ".env.local") });
function autoSetEnv(key, value) {
  process.env[key] = value;
  try {
    const envContent = fs5.existsSync(envPath) ? fs5.readFileSync(envPath, "utf-8") : "";
    const lines = envContent.split("\n");
    const keyPattern = new RegExp(`^${key}=`);
    const existingIndex = lines.findIndex((l) => keyPattern.test(l));
    if (existingIndex >= 0) {
      lines[existingIndex] = `${key}=${value}`;
    } else {
      lines.push(`${key}=${value}`);
    }
    fs5.writeFileSync(envPath, lines.join("\n"), "utf-8");
    const persistentEnvPath = path5.resolve(PERSISTENT_DIR2, ".env");
    if (persistentEnvPath !== envPath) {
      try {
        const pEnvContent = fs5.existsSync(persistentEnvPath) ? fs5.readFileSync(persistentEnvPath, "utf-8") : "";
        const pLines = pEnvContent.split("\n");
        const pExistingIndex = pLines.findIndex((l) => keyPattern.test(l));
        if (pExistingIndex >= 0) {
          pLines[pExistingIndex] = `${key}=${value}`;
        } else {
          pLines.push(`${key}=${value}`);
        }
        fs5.writeFileSync(persistentEnvPath, pLines.join("\n"), "utf-8");
      } catch {
      }
    }
  } catch {
  }
}
var jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret === "REPLACE-WITH-YOUR-OWN-SECURE-RANDOM-STRING") {
  const generatedSecret = crypto6.randomBytes(64).toString("hex");
  autoSetEnv("JWT_SECRET", generatedSecret);
  console.log("[CONFIG] JWT_SECRET auto-generated and saved to .env");
}
async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);
  const isDev = process.env.NODE_ENV !== "production";
  process.on("uncaughtException", (err) => {
    console.error("[FATAL] Uncaught Exception:", err.message);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[FATAL] Unhandled Rejection:", reason);
  });
  const allowedOrigins = isDev ? true : [
    process.env.APP_URL || `http://localhost:${PORT}`,
    "https://huggingface.co",
    "https://*.huggingface.co",
    /^https:\/\/[a-zA-Z0-9-]+\.huggingface\.co$/,
    /^https:\/\/[a-zA-Z0-9-]+\.hf\.space$/,
    /^https:\/\/[a-zA-Z0-9-]+-[a-zA-Z0-9-]+\.hf\.space$/
  ];
  app.use(cors({
    origin: allowedOrigins,
    credentials: true
  }));
  app.use(securityHeaders);
  app.use(express.json({ limit: "50mb" }));
  app.use((err, _req, res, next) => {
    if (err.type === "entity.parse.failed") {
      res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      return;
    }
    next(err);
  });
  app.use(rateLimit);
  app.use(validateInput);
  app.use("/uploads", express.static(path5.resolve("uploads"), {
    maxAge: "7d",
    etag: true,
    lastModified: true
  }));
  const videosDir = path5.resolve("uploads/videos");
  if (!fs5.existsSync(videosDir)) fs5.mkdirSync(videosDir, { recursive: true });
  app.use("/api/auth", auth_default);
  app.use("/api/posts", posts_default);
  app.use("/api/chat", chat_default);
  app.use("/api/wallet", wallet_default);
  app.use("/api/admin", admin_default);
  app.use("/api/market", market_default);
  app.use("/api/smart-reach", smartReach_default);
  app.use("/api/ai", ai_default);
  app.use("/api", api_default);
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      env: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      version: "2.0.0"
    });
  });
  const registeredRoutes = [];
  app._router?.stack?.forEach((layer) => {
    if (layer.route) {
      registeredRoutes.push(`${Object.keys(layer.route.methods).join(",").toUpperCase()} ${layer.route.path}`);
    } else if (layer.name === "router" && layer.regexp) {
      const match = layer.regexp.toString().match(/\/api\/\w+/);
      if (match) registeredRoutes.push(`Router: ${match[0]}`);
    }
  });
  console.log("[API] Registered routes:", registeredRoutes.join(", "));
  app.get("/api/diagnostics", async (req, res) => {
    if (!isDev) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { verifyToken: verifyToken2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
      const token = authHeader.split(" ")[1];
      const payload = verifyToken2(token);
      if (!payload || !payload.isAdmin) {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
    }
    const routes = [];
    app._router?.stack?.forEach((layer) => {
      if (layer.route) {
        routes.push(`${Object.keys(layer.route.methods).join(",").toUpperCase()} ${layer.route.path}`);
      } else if (layer.name === "router" && layer.regexp) {
        const match = layer.regexp.toString().match(/\/api\/\w+/);
        if (match) routes.push(`Router: ${match[0]}`);
      }
    });
    res.json({
      status: "ok",
      env: process.env.NODE_ENV || "development",
      port: PORT,
      uptime: process.uptime(),
      routes,
      ts: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.use("/api", (req, res) => {
    console.log(`[404] API route not found: ${req.method} ${req.path}`);
    res.status(404).json({ error: "API endpoint not found", path: req.path, method: req.method });
  });
  if (isDev) {
    const vite = await createViteServer({
      root: rootDir,
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const clientPath = path5.resolve(rootDir, "dist", "client");
    const distPath = fs5.existsSync(clientPath) ? clientPath : path5.resolve(rootDir, "dist");
    console.log(`[PROD] Serving static files from: ${distPath}`);
    app.use(express.static(distPath, {
      maxAge: "1d",
      etag: true,
      lastModified: true
    }));
    app.get("*", (_req, res) => {
      res.sendFile(path5.join(distPath, "index.html"));
    });
  }
  app.use((err, req, res, _next) => {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
    res.status(err.status || 500).json({
      error: isDev ? err.message : "Internal server error",
      ...isDev && { stack: err.stack }
    });
  });
  const server = createHttpServer(app);
  wsManager.initialize(server);
  app.locals.wsManager = wsManager;
  server.listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("================================================");
    console.log(`  Nawaqes Server running on http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`  Health: http://localhost:${PORT}/api/health`);
    console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
    console.log("================================================");
    console.log("");
    if (isDev) {
      console.log("[DEV] Vite HMR is active. Rate limit: 500/10s.");
    } else {
      console.log("[PROD] Security headers enabled. Rate limit: 100/min.");
      console.log("[PROD] JWT_SECRET: \u2705 Configured");
      console.log("[PROD] HSTS: \u2705 Enabled");
    }
  });
}
startServer().catch((err) => {
  console.error("[STARTUP] Failed to start server:", err);
  process.exit(1);
});
//# sourceMappingURL=server.mjs.map
