/* The build you are running changes when you ask it to, and not before.
   The app's own files are served from SHELL, which nothing replaces on its
   own; only the in-app Update button clears the caches and reloads. */
const VERSION = "1.0.1";
const ASSETS = "habits-" + VERSION;   /* icons, manifest, notes — versioned, purged */
const SHELL = "habits-shell";         /* the app itself — replaced only on request */

const SHELL_URLS = ["./index.html", "./data.js", "./core.js", "./habits.js", "./fitness.js", "./diary.js", "./reports.js", "./settings.js"];
const ASSET_URLS = ["./manifest.webmanifest", "./RELEASES.md", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"];

const fresh = (u) => fetch(new Request(u, { cache: "reload" }));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(ASSETS).then((c) => c.addAll(ASSET_URLS)).catch(() => {})
      .then(() => caches.open(SHELL))
      .then((shell) => Promise.all(SHELL_URLS.map((u) => shell.match(u).then((hit) =>
        hit ? null : fresh(u).then((res) => res && res.ok ? shell.put(u, res) : null)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== ASSETS && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  /* version.json is how the app asks whether there is something newer — never cached */
  if (url.pathname.endsWith("/version.json")) return;

  const isDoc = req.mode === "navigate" || req.destination === "document";
  const file = isDoc ? "./index.html" : "." + url.pathname.slice(url.pathname.lastIndexOf("/"));
  if (SHELL_URLS.indexOf(file) >= 0 && (isDoc || url.search === "")) {
    event.respondWith(
      caches.open(SHELL).then((shell) => shell.match(file).then((hit) => hit ||
        fresh(file).then((res) => { if (res && res.ok) shell.put(file, res.clone()); return res; })
          .catch(() => caches.match(req))))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(ASSETS).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window" }).then((cs) => cs.length ? cs[0].focus() : self.clients.openWindow("./")));
});
