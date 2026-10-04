/* The build you are running changes when you ask it to, and not before.
   The app's own files are served from SHELL, which nothing replaces on its
   own; only the in-app Update button clears the caches and reloads. */
const VERSION = "1.1.3";
const ASSETS = "habits-" + VERSION;   /* icons, manifest, notes — versioned, purged */
const SHELL = "habits-shell";         /* the app itself — replaced only on request */

const SHELL_URLS = ["./index.html", "./data.js", "./core.js", "./habits.js", "./fitness.js", "./moves.js", "./diary.js", "./reports.js", "./settings.js"];
/* exercise illustrations (moves/README.md) */
const EK_URLS = ["./moves/0005-relaxation.svg", "./moves/0005-tension.svg", "./moves/0016-relaxation.svg", "./moves/0016-tension.svg", "./moves/0018-relaxation.svg", "./moves/0018-tension.svg", "./moves/0020-relaxation.svg", "./moves/0020-tension.svg", "./moves/0021-relaxation.svg", "./moves/0021-tension.svg", "./moves/0024-relaxation.svg", "./moves/0024-tension.svg", "./moves/0027-relaxation.svg", "./moves/0027-tension.svg", "./moves/0032-relaxation.svg", "./moves/0032-tension.svg", "./moves/0033-relaxation.svg", "./moves/0033-tension.svg", "./moves/0038-relaxation.svg", "./moves/0038-tension.svg", "./moves/0055-relaxation.svg", "./moves/0055-tension.svg", "./moves/0056-relaxation.svg", "./moves/0056-tension.svg", "./moves/0075-relaxation.svg", "./moves/0075-tension.svg", "./moves/0077-relaxation.svg", "./moves/0077-tension.svg", "./moves/0090-relaxation.svg", "./moves/0090-tension.svg", "./moves/0105-relaxation.svg", "./moves/0105-tension.svg", "./moves/0107-relaxation.svg", "./moves/0107-tension.svg", "./moves/0109-relaxation.svg", "./moves/0109-tension.svg", "./moves/0111-relaxation.svg", "./moves/0111-tension.svg", "./moves/0113-relaxation.svg", "./moves/0113-tension.svg", "./moves/0115-relaxation.svg", "./moves/0115-tension.svg", "./moves/0116-relaxation.svg", "./moves/0116-tension.svg", "./moves/0129-relaxation.svg", "./moves/0129-tension.svg", "./moves/0130-relaxation.svg", "./moves/0130-tension.svg", "./moves/0136-relaxation.svg", "./moves/0136-tension.svg", "./moves/0137-relaxation.svg", "./moves/0137-tension.svg", "./moves/0152-relaxation.svg", "./moves/0152-tension.svg", "./moves/0162-relaxation.svg", "./moves/0162-tension.svg", "./moves/0181-relaxation.svg", "./moves/0181-tension.svg", "./moves/0188-relaxation.svg", "./moves/0188-tension.svg", "./moves/0198-relaxation.svg", "./moves/0198-tension.svg", "./moves/0204-relaxation.svg", "./moves/0204-tension.svg", "./moves/0220-relaxation.svg", "./moves/0220-tension.svg", "./moves/0221-relaxation.svg", "./moves/0221-tension.svg", "./moves/0224-relaxation.svg", "./moves/0224-tension.svg", "./moves/0227-relaxation.svg", "./moves/0227-tension.svg", "./moves/0241-relaxation.svg", "./moves/0241-tension.svg", "./moves/0251-relaxation.svg", "./moves/0251-tension.svg", "./moves/0257-relaxation.svg", "./moves/0257-tension.svg", "./moves/0261-relaxation.svg", "./moves/0261-tension.svg", "./moves/0276-relaxation.svg", "./moves/0276-tension.svg", "./moves/0281-relaxation.svg", "./moves/0281-tension.svg", "./moves/0284-relaxation.svg", "./moves/0284-tension.svg", "./moves/0287-relaxation.svg", "./moves/0287-tension.svg", "./moves/0289-relaxation.svg", "./moves/0289-tension.svg", "./moves/0291-relaxation.svg", "./moves/0291-tension.svg", "./moves/0294-relaxation.svg", "./moves/0294-tension.svg"];
const ASSET_URLS = EK_URLS.concat(["./manifest.webmanifest", "./RELEASES.md", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png"]);

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
