// Minimal service worker: makes the app installable (Android/Chrome) without
// caching anything - pages and APIs sit behind a login and must always be live.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
