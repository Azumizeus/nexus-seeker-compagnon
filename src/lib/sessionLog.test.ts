import { describe, expect, it } from "vitest";
import { SESSION_HISTORY_LIMIT, SESSION_MERGE_WINDOW_MS, deviceLabel, planConnect, type SessionEntry } from "./sessionLog";
import { categoryForEvent, shouldAlert, DEFAULT_NOTIFICATION_PREFS } from "./notificationPrefs";

const input = { address: "Addr1", walletName: "Phantom", network: "Devnet", device: "macOS · Chrome" };
const entry = (id: string, lastSeenAt: number, extra: Partial<SessionEntry> = {}): SessionEntry => ({
  id,
  ...input,
  startedAt: lastSeenAt,
  lastSeenAt,
  ...extra,
});

describe("deviceLabel", () => {
  it("detects common OS / browser pairs", () => {
    expect(deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36")).toBe("macOS · Chrome");
    expect(deviceLabel("Mozilla/5.0 (Linux; Android 14; Seeker) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36")).toBe("Android · Chrome");
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1")).toBe("iOS · Safari");
    expect(deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36 Edg/130.0")).toBe("Windows · Edge");
    expect(deviceLabel("Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0")).toBe("Linux · Firefox");
  });
});

describe("planConnect", () => {
  it("creates an entry when the history is empty", () => {
    const { upsert, drop } = planConnect([], input, 1000, "new");
    expect(upsert).toMatchObject({ id: "new", startedAt: 1000, lastSeenAt: 1000 });
    expect(drop).toEqual([]);
  });

  it("merges a reconnection within 30 minutes and clears endedAt", () => {
    const now = 10 * SESSION_MERGE_WINDOW_MS;
    const prev = entry("a", now - 60_000, { endedAt: now - 60_000, startedAt: now - 600_000 });
    const { upsert } = planConnect([prev], input, now, "new");
    expect(upsert.id).toBe("a");
    expect(upsert.startedAt).toBe(now - 600_000);
    expect(upsert.lastSeenAt).toBe(now);
    expect(upsert.endedAt).toBeUndefined();
  });

  it("starts a new entry after 30 minutes or for another wallet", () => {
    const now = 10 * SESSION_MERGE_WINDOW_MS;
    const old = entry("a", now - SESSION_MERGE_WINDOW_MS - 1);
    expect(planConnect([old], input, now, "new").upsert.id).toBe("new");
    expect(planConnect([entry("b", now - 1000)], { ...input, address: "Addr2" }, now, "new").upsert.id).toBe("new");
  });

  it("keeps only the 20 most recent entries", () => {
    const entries = Array.from({ length: SESSION_HISTORY_LIMIT }, (_, i) => entry(`e${i}`, i, { address: `A${i}` }));
    const { drop } = planConnect(entries, input, 10_000_000, "new");
    expect(drop).toEqual(["e0"]);
  });
});

describe("notification categories", () => {
  it("always alerts on safety events, optional ones follow the prefs", () => {
    expect(shouldAlert(categoryForEvent("spendRecorded", true), DEFAULT_NOTIFICATION_PREFS)).toBe(true);
    expect(shouldAlert(categoryForEvent("controlTakenBack"), DEFAULT_NOTIFICATION_PREFS)).toBe(true);
    expect(shouldAlert(categoryForEvent("guardianUpdated"), DEFAULT_NOTIFICATION_PREFS)).toBe(true);
    expect(shouldAlert(categoryForEvent("spendRecorded", false), DEFAULT_NOTIFICATION_PREFS)).toBe(false);
    expect(shouldAlert(categoryForEvent("agentWalletRegistered"), DEFAULT_NOTIFICATION_PREFS)).toBe(false);
    expect(shouldAlert(categoryForEvent("agentWalletRegistered"), { ...DEFAULT_NOTIFICATION_PREFS, registry: true })).toBe(true);
  });
});
