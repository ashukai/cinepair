// CinePair Service Worker v12
const CACHE = 'cinepair-v12';

// Only cache the bare minimum for offline
const PRECACHE = ['/manifest.json', '/apple-touch-icon.png', '/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
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

  // Always fetch fresh from network for HTML files
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Skip external APIs
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('tmdb.org') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('jsdelivr') ||
      url.hostname.includes('fonts.g')) {
    return;
  }

  // Cache-first for icons and manifest
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
