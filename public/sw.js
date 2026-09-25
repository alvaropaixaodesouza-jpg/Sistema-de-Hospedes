const CACHE_NAME = 'pousada-hospedes-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('pousada-hospedes-') && k !== CACHE_NAME).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});
// HTML must be refreshed from the network so published fixes reach installed PWAs.
// Never return HTML for a missing JS/CSS resource or cache authenticated data.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE_NAME).then(c => c.put('/index.html', copy))); }
    return response;
  }).catch(async () => (await caches.match('/index.html')) || Response.error()));
});
