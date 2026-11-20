/*
 * Nexus Seeker — service worker for system notifications.
 *
 * Android Chrome refuses `new Notification()` (TypeError): a notification has
 * to come out of a registration. That is the only reason this file exists.
 *
 * Nothing is cached on purpose. A cached shell would outlive a deploy and pin
 * an old bundle on the phone, which is the one thing this app can't afford.
 */

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/* Tapping the alert comes back to the app instead of opening a second window. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => "focus" in client);
      if (open) return open.focus();
      return self.clients.openWindow("/");
    })()
  );
});
