const CACHE = "streaks-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./favicon.svg",
  "./og-image.svg",
  "./modules/db.js",
  "./modules/habits.js",
  "./modules/stats.js",
  "./modules/heatmap.js",
  "./modules/notifications.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => {
    if (cached) return cached;
    return fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match("./index.html"));
  }));
});

self.addEventListener("message", event => {
  if (event.data?.type === "NOTIFY") {
    event.waitUntil(self.registration.showNotification(event.data.title || "Streaks", {
      body: event.data.body || "",
      icon: "./favicon.svg",
      badge: "./favicon.svg",
      tag: "streaks-notification"
    }));
  }
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
    const client = clientList.find(item => "focus" in item);
    if (client) return client.focus();
    return clients.openWindow("./");
  }));
});