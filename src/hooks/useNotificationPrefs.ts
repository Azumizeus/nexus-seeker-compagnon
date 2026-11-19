import { useCallback, useState, useSyncExternalStore } from "react";
import {
  getNotificationPrefs,
  setNotificationPrefs,
  subscribeNotificationPrefs,
  systemPermission,
  type NotificationPrefs,
  type SystemPermission,
} from "@/lib/notificationPrefs";

/** Notification preferences of this device + browser notification permission. */
export function useNotificationPrefs() {
  const prefs = useSyncExternalStore(subscribeNotificationPrefs, getNotificationPrefs, getNotificationPrefs);
  const [permission, setPermission] = useState<SystemPermission>(() => systemPermission());

  const update = useCallback((patch: Partial<NotificationPrefs>) => setNotificationPrefs(patch), []);

  /** Turning system notifications on asks the browser for permission first. */
  const setSystem = useCallback(async (enabled: boolean) => {
    if (!enabled) return setNotificationPrefs({ system: false });
    if (systemPermission() === "unsupported") return;
    const result = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    setPermission(result);
    setNotificationPrefs({ system: result === "granted" });
  }, []);

  return { prefs, update, permission, setSystem };
}
