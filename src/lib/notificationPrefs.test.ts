import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFS,
  alertChannels,
  notifySystem,
  requestSystemPermission,
  systemPermission,
  type NotificationCategory,
} from "./notificationPrefs";

const setHidden = (hidden: boolean) => Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setHidden(false);
});

describe("system notifications without the Notification API (jsdom, old browsers)", () => {
  it("reports unsupported and never throws", async () => {
    vi.stubGlobal("Notification", undefined);
    setHidden(true);
    expect(systemPermission()).toBe("unsupported");
    expect(() => notifySystem("Signature autonome", "Agent · 0.1 SOL")).not.toThrow();
    await expect(requestSystemPermission()).resolves.toBe("unsupported");
  });
});

describe("system notifications with the API", () => {
  it("only notifies when granted and the tab is hidden", () => {
    const ctor = vi.fn();
    vi.stubGlobal("Notification", Object.assign(ctor, { permission: "granted" }));
    setHidden(false);
    notifySystem("A");
    expect(ctor).not.toHaveBeenCalled();
    setHidden(true);
    notifySystem("B");
    expect(ctor).toHaveBeenCalledTimes(1);
  });

  it("does not request permission when already decided", async () => {
    const requestPermission = vi.fn();
    vi.stubGlobal("Notification", { permission: "denied", requestPermission });
    await expect(requestSystemPermission()).resolves.toBe("denied");
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("is unsupported on Android without a service worker (new Notification throws there)", () => {
    vi.stubGlobal("Notification", { permission: "granted" });
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 14; Seeker) Chrome/130.0 Mobile");
    expect(systemPermission()).toBe("unsupported");
  });
});

describe("alertChannels: the system switch is separate from the locked alerts", () => {
  const locked: NotificationCategory[] = ["autonomous", "control", "governance"];

  it("locked categories always toast, whatever the system switch says", () => {
    for (const category of locked) {
      expect(alertChannels(category, { ...DEFAULT_NOTIFICATION_PREFS, system: false }).toast).toBe(true);
      expect(alertChannels(category, { ...DEFAULT_NOTIFICATION_PREFS, system: true })).toEqual({ toast: true, system: true });
    }
  });

  it("the system channel never fires for a category the user muted", () => {
    expect(alertChannels("spends", { ...DEFAULT_NOTIFICATION_PREFS, system: true })).toEqual({ toast: false, system: false });
  });
});
