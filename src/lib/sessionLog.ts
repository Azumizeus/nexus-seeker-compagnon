/**
 * Wallet connection log — kept on THIS device only (IndexedDB "sessions").
 * It is a convenience, not an audit trail: anyone with access to the device can
 * clear it, and it disappears with the browser profile.
 */
import { getAll, getOne, put, remove, clearStore } from "./localDb";
import { uid } from "./utils";

export interface SessionEntry {
  id: string;
  address: string;
  walletName: string;
  network: string;
  device: string;
  startedAt: number;
  lastSeenAt: number;
  /** Set on an explicit disconnect. Missing = tab closed while connected, or still open. */
  endedAt?: number;
}

export type SessionInput = Pick<SessionEntry, "address" | "walletName" | "network" | "device">;

/** A reconnection within this window updates the previous entry instead of adding one. */
export const SESSION_MERGE_WINDOW_MS = 30 * 60 * 1000;
export const SESSION_HISTORY_LIMIT = 20;
export const SESSION_HEARTBEAT_MS = 5 * 60 * 1000;

/** "macOS · Chrome" from a user-agent string. */
export function deviceLabel(userAgent: string): string {
  const os = /iPhone|iPad|iPod/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /CrOS/.test(userAgent)
        ? "ChromeOS"
        : /Macintosh|Mac OS X/.test(userAgent)
          ? "macOS"
          : /Windows/.test(userAgent)
            ? "Windows"
            : /Linux/.test(userAgent)
              ? "Linux"
              : "Système inconnu";
  const browser = /Edg(A|iOS)?\//.test(userAgent)
    ? "Edge"
    : /OPR\/|Opera/.test(userAgent)
      ? "Opera"
      : /SamsungBrowser/.test(userAgent)
        ? "Samsung Internet"
        : /Firefox\/|FxiOS/.test(userAgent)
          ? "Firefox"
          : /CriOS|Chrome\//.test(userAgent)
            ? "Chrome"
            : /Safari\//.test(userAgent)
              ? "Safari"
              : "Navigateur inconnu";
  return `${os} · ${browser}`;
}

/** Pure: which entry to write and which old ids to drop for a new connection. */
export function planConnect(entries: SessionEntry[], input: SessionInput, now: number, newId: string = uid()) {
  const previous = entries
    .filter((e) => e.address === input.address && e.walletName === input.walletName && e.device === input.device)
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)[0];

  let upsert: SessionEntry;
  if (previous && now - (previous.endedAt ?? previous.lastSeenAt) <= SESSION_MERGE_WINDOW_MS) {
    upsert = { ...previous, network: input.network, lastSeenAt: now };
    delete upsert.endedAt;
  } else {
    upsert = { id: newId, ...input, startedAt: now, lastSeenAt: now };
  }

  const kept = [upsert, ...entries.filter((e) => e.id !== upsert.id)].sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  const drop = kept.slice(SESSION_HISTORY_LIMIT).map((e) => e.id);
  return { upsert, drop };
}

/* -------- serialised writes (StrictMode / fast reconnects can overlap) -------- */

let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

export function recordConnect(input: SessionInput): Promise<string> {
  return enqueue(async () => {
    const { upsert, drop } = planConnect(await getAll<SessionEntry>("sessions"), input, Date.now());
    await put("sessions", upsert);
    await Promise.all(drop.map((id) => remove("sessions", id)));
    return upsert.id;
  });
}

async function touch(id: string, ended: boolean) {
  const entry = await getOne<SessionEntry>("sessions", id);
  if (!entry) return;
  const now = Date.now();
  await put("sessions", ended ? { ...entry, lastSeenAt: now, endedAt: now } : { ...entry, lastSeenAt: now });
}

export const recordSeen = (id: string) => enqueue(() => touch(id, false));
export const recordDisconnect = (id: string) => enqueue(() => touch(id, true));
export const clearSessions = () => enqueue(() => clearStore("sessions"));

export const loadSessions = async () =>
  (await getAll<SessionEntry>("sessions")).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
