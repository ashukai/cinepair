// CinePair Service Worker v17
const CACHE = 'cinepair-v17';

// Pre-cache the app shell + CDN assets on install
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept Supabase or TMDB — always need fresh data
  if (url.hostname.includes('supabase.co') || url.hostname.includes('tmdb.org')) {
    return;
  }

  // Navigation requests.
  if (e.request.mode === 'navigate') {
    const p = url.pathname;
    const isRoot = url.origin === self.location.origin && (p === '/' || p === '/index.html');

    // ONLY the landing/root is served from the cached index.html (clean 200, works
    // offline, avoids the Safari PWA redirect error). Every other page — control.html,
    // join, app.html, privacy, terms — must load ITSELF, so standalone pages are never
    // shadowed by the landing. Those go network-first with a cache fallback.
    if (isRoot) {
      e.respondWith(
        caches.open(CACHE).then(cache =>
          cache.match('/index.html').then(cached => {
            fetch('/index.html').then(res => { if (res.ok) cache.put('/index.html', res); }).catch(() => {});
            return cached || fetch(e.request);
          })
        )
      );
    } else {
      e.respondWith(
        fetch(e.request).then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
          return res;
        }).catch(() => caches.match(e.request).then(r => r || fetch(e.request)))
      );
    }
    return;
  }

  // CDN assets (fonts, icons, supabase SDK) — cache-first, fetch & cache on miss
  if (url.hostname.includes('jsdelivr') || url.hostname.includes('fonts.gstatic') ||
      url.hostname.includes('fonts.googleapis') || url.hostname.includes('cdn.')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached ||
        fetch(e.request).then(response => {
          if (response.ok) caches.open(CACHE).then(c => c.put(e.request, response.clone()));
          return response;
        })
      )
    );
    return;
  }

  // Everything else — cache-first with network fallback
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
