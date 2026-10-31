// Keeps a copy of the app on the device so it opens instantly and offline. hosting/deploy.ps1 fills in
// VERSION and ASSETS; a new VERSION makes the browser install the new copy and the page reloads onto it.
const VERSION = 'dev';
const ASSETS = [];
const CACHE = `daybook-${VERSION}`, DATA = 'daybook-data';

self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(CACHE);
  for (const a of ASSETS) {
    const r = await fetch(a, { cache: 'no-store' });
    if (!r.ok || r.redirected || r.headers.get('x-daybook-login')) throw new Error('signed out: not caching');
    await c.put(a, r);
  }
  await self.skipWaiting();
})()));

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE && k !== DATA) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url), p = url.pathname;
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (p.startsWith('/api/') || p === '/login' || p === '/logout') return;
  if (p === '/js/food-data.js') return e.respondWith(networkFirst(e.request));
  e.respondWith((async () => {
    const hit = await caches.match(e.request.mode === 'navigate' ? './' : p.slice(1), { cacheName: CACHE });
    return hit || fetch(e.request);
  })());
});

async function networkFirst(req){
  const c = await caches.open(DATA);
  try { const r = await fetch(req); if (r.ok) await c.put('/js/food-data.js', r.clone()); return r; }
  catch { return (await c.match('/js/food-data.js')) || new Response('', { headers: { 'content-type': 'text/javascript' } }); }
}

self.addEventListener('push', e => {
  const m = e.data ? e.data.json() : { title: 'Daybook' };
  e.waitUntil(self.registration.showNotification(m.title, { body: m.body, tag: m.tag, icon: 'icons/icon-192.png', data: { url: m.url || '' } }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '', self.registration.scope).href;
  e.waitUntil((async () => {
    const [win] = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (win) { await win.focus(); return win.navigate(url).catch(() => {}); }
    return clients.openWindow(url);
  })());
});
