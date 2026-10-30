/* 声澜 · Service Worker
   目的：装成桌面应用后，断网也能秒开。音频文件走本地句柄，不经过这里。 */
const CACHE = "sr-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
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
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先（拿新版本），断网时回落缓存
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy)).catch(() => {});
          return r;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // 静态资源：缓存优先
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(r => {
        if (r && r.status === 200 && r.type === "basic") {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return r;
      }).catch(() => hit);
    })
  );
});
