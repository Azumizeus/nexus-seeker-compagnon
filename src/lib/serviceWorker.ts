/**
 * Registers the notification service worker (public/sw.js).
 *
 * Android Chrome shows system notifications only through a registration, so
 * without this worker the "system" switch reports unsupported on the phone.
 * Safe to call on every load — the browser dedupes registrations by scope.
 */
export function registerServiceWorker(): void {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
    // Private mode or blocked storage: never let a registration failure break the app.
    console.error("[serviceWorker]", error);
  });
}
