// =====================================================
// Nawaqes Service Worker
// =====================================================
// Strategy:
// - Precache: app shell (icons, manifest)
// - Runtime: stale-while-revalidate for same-origin assets & API
// - Network-first for navigation requests (always get latest UI)
// - Cache-first for static images/icons
// =====================================================

const CACHE_VERSION = 'nawaqes-v2-0-0';
const STATIC_CACHE  = `nawaqes-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `nawaqes-runtime-${CACHE_VERSION}`;
const API_CACHE     = `nawaqes-api-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/icons/favicon-16.png',
  '/offline.html',
];

// =====================================================
// Install: precache critical resources
// =====================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Use addAll with tolerance for individual failures
      await Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] precache skip:', url, err.message))
        )
      );
    })
  );
  self.skipWaiting();
});

// =====================================================
// Activate: cleanup old caches
// =====================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => ![STATIC_CACHE, RUNTIME_CACHE, API_CACHE].includes(key))
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// =====================================================
// Helper strategies
// =====================================================
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // If navigation, return offline fallback
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

// =====================================================
// Fetch: route by request type
// =====================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip cross-origin (Hugging Face static assets handled separately)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip Vite HMR (dev only)
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/node_modules/')) {
    return;
  }

  // Skip WebSocket
  if (request.headers.get('upgrade') === 'websocket') return;

  // 1. Navigation requests → network-first (always latest UI)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // 2. API requests → network-first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // 3. Static images/icons → cache-first
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/uploads/') ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|avif|woff2?)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // 4. JS/CSS assets → stale-while-revalidate
  if (/\.(?:js|css|mjs|ts|tsx)$/i.test(url.pathname) || url.pathname.startsWith('/assets/')) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // 5. Default → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

// =====================================================
// Message: allow page to trigger skipWaiting
// =====================================================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// =====================================================
// Push Notifications (FCM via web push)
// =====================================================
self.addEventListener('push', (event) => {
  let payload = { title: 'نواقص', body: 'لديك إشعار جديد', icon: '/icons/icon-192.png', badge: '/icons/favicon-32.png', data: {} };
  try {
    if (event.data) {
      const text = event.data.text();
      try {
        payload = { ...payload, ...JSON.parse(text) };
      } catch {
        payload.body = text;
      }
    }
  } catch (e) {
    console.warn('[SW] push parse error:', e);
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/favicon-32.png',
    vibrate: [100, 50, 100],
    dir: 'rtl',
    lang: 'ar',
    data: { url: payload.url || '/', ...payload.data },
    actions: [
      { action: 'open', title: 'فتح' },
      { action: 'dismiss', title: 'إغلاق' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'نواقص', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing window if found
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(targetUrl);
    })
  );
});
