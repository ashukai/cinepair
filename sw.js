const CACHE='cinepair-v11';
const ASSETS=['/','/index.html','/manifest.json','/apple-touch-icon.png','/icon-192.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(e.request.url.includes('supabase.co')||e.request.url.includes('tmdb.org')||
     e.request.url.includes('googleapis')||e.request.url.includes('jsdelivr'))return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
