// Offline support: cache the app shell so PC Doctor works without internet after the first visit.
var CACHE = 'pcdoctor-v3';
var FILES = ['./', 'index.html', 'style.css?v=3', 'app.js?v=2', 'matcher.js?v=2', 'data.js?v=2', 'config.js?v=2', 'count.js?v=2', 'icon.svg',
  'fonts/NotoSansMalayalam-Regular.woff2', 'fonts/NotoSansMalayalam-Bold.woff2', 'manifest.webmanifest'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
// network first (so updates show up), cache as fallback when offline
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); return res;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: false }).then(function (r) { return r || caches.match('index.html'); }); }));
});
