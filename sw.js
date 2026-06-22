// CinePair Service Worker v14
const CACHE = 'cinepair-v14';

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

  // Never intercept navigation requests — Safari PWA throws "Response served by service worker
  // has redirections" if the SW returns a redirect (e.g. from Cloudflare HTTPS upgrade).
  // Let the browser handle page navigation natively.
  if (e.request.mode === 'navigate') {
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
