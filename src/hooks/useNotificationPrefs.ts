import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  getNotificationPrefs,
  requestSystemPermission,
  setNotificationPrefs,
  subscribeNotificationPrefs,
  systemPermission,
  type NotificationPrefs,
  type SystemPermission,
} from "@/lib/notificationPrefs";

/** Notification preferences of this device + browser notification permission. */
export function useNotificationPrefs() {
  const prefs = useSyncExternalStore(subscribeNotificationPrefs, getNotificationPrefs, getNotificationPrefs);
  // Read only — the permission is never *requested* here, only on a click (see setSystem).
  const [permission, setPermission] = useState<SystemPermission>(() => systemPermission());

  // The user may unblock notifications in the browser settings, then come back: re-read on return.
  useEffect(() => {
    const refresh = () => setPermission(systemPermission());
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const update = useCallback((patch: Partial<NotificationPrefs>) => setNotificationPrefs(patch), []);

  /**
   * Only call from the switch's onCheckedChange (a click): the permission
   * request runs synchronously inside that gesture, before any await.
   */
  const setSystem = useCallback((enabled: boolean) => {
    if (!enabled) {
      setNotificationPrefs({ system: false });
      return;
    }
    void requestSystemPermission().then((result) => {
      setPermission(result);
      setNotificationPrefs({ system: result === "granted" });
    });
  }, []);

  return { prefs, update, permission, setSystem };
}
