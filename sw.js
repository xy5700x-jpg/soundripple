/* 声澜 · Service Worker
   离线可用，但绝不把旧页面/旧图标一直喂给浏览器。
   v3：缓存名升级 + 静态资源改网络优先，改完 index.html 刷新即生效。 */
const CACHE = "sr-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192-v2.png",
  "./icon-512-v2.png",
  "./icon-maskable-512-v2.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(ASSETS.map(a => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 音频是 blob:，不经过这里
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // 网络优先：拿得到就用新的并顺手写缓存，拿不到才回落离线缓存
  e.respondWith(
    fetch(req).then(r => {
      if (r && r.status === 200 && r.type === "basic") {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./index.html" : req, copy)).catch(() => {});
      }
      return r;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === "navigate" ? caches.match("./index.html") : null)))
  );
});
