/**
 * Notification preferences — which on-chain program events raise an alert.
 * Stored on this device (localStorage), like theme and density.
 * The activity journal always records every event, whatever these settings say.
 */

export type NotificationCategory = "autonomous" | "control" | "governance" | "spends" | "registry";

export interface NotificationPrefs {
  /** Validated spends (human validation / agent asks). */
  spends: boolean;
  /** Registry changes: wallets registered/revoked, modes, caps, counters. */
  registry: boolean;
  /** Also show a system notification when the tab is in the background. */
  system: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { spends: false, registry: false, system: false };

/**
 * Safety alerts that can't be turned off: an autonomous signature, a pause or a
 * take-back of control, and any change of guardian/authority.
 */
export const LOCKED_CATEGORIES: readonly NotificationCategory[] = ["autonomous", "control", "governance"];

const EVENT_CATEGORY: Record<string, NotificationCategory> = {
  controlTakenBack: "control",
  controlReleased: "control",
  paused: "control",
  unpaused: "control",
  guardianUpdated: "governance",
  authorityProposed: "governance",
  authorityAccepted: "governance",
  walletModeUpdated: "registry",
  walletSpendCapUpdated: "registry",
  agentWalletRegistered: "registry",
  agentWalletRevoked: "registry",
  sharedWalletAssigned: "registry",
  walletSpentReset: "registry",
  globalSpentReset: "registry",
  globalSpendCapUpdated: "registry",
  perAgentLimitUpdated: "registry",
};

export function categoryForEvent(eventName: string, autonomous = false): NotificationCategory {
  if (eventName === "spendRecorded") return autonomous ? "autonomous" : "spends";
  return EVENT_CATEGORY[eventName] ?? "registry";
}

export function shouldAlert(category: NotificationCategory, prefs: NotificationPrefs) {
  if (LOCKED_CATEGORIES.includes(category)) return true;
  return category === "spends" ? prefs.spends : prefs.registry;
}

/* ------------------------------ store ------------------------------ */

const KEY = "nexus.notifications";
const listeners = new Set<() => void>();
let cache: NotificationPrefs | null = null;

function read(): NotificationPrefs {
  if (typeof localStorage === "undefined") return DEFAULT_NOTIFICATION_PREFS;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<NotificationPrefs>;
    return {
      spends: typeof parsed.spends === "boolean" ? parsed.spends : DEFAULT_NOTIFICATION_PREFS.spends,
      registry: typeof parsed.registry === "boolean" ? parsed.registry : DEFAULT_NOTIFICATION_PREFS.registry,
      system: typeof parsed.system === "boolean" ? parsed.system : DEFAULT_NOTIFICATION_PREFS.system,
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

/** Stable snapshot (same object until a write) — safe for useSyncExternalStore. */
export function getNotificationPrefs(): NotificationPrefs {
  if (!cache) cache = read();
  return cache;
}

export function setNotificationPrefs(patch: Partial<NotificationPrefs>) {
  cache = { ...getNotificationPrefs(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

export function subscribeNotificationPrefs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* ------------------------ system notifications ------------------------ */

export type SystemPermission = NotificationPermission | "unsupported";

export function systemPermission(): SystemPermission {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

/** Shows a browser notification, only when the tab is hidden (the toast covers the visible case). */
export function notifySystem(title: string, body?: string) {
  if (systemPermission() !== "granted" || typeof document === "undefined" || !document.hidden) return;
  try {
    new Notification(title, { body, icon: "/icon.svg", tag: `nexus-${title}` });
  } catch (error) {
    console.error("[notifications]", error);
  }
}
