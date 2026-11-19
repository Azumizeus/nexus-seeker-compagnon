/**
 * Telegram account link: types + contract of the server function + in-memory mock.
 *
 * Real flow (later):
 *  1. The client asks the server for a one-time link code bound to the connected wallet.
 *  2. The user opens the bot with `/start <code>`; the bot (server side) stores the chat id.
 *  3. The client only ever sees the status and a masked handle. The bot token and the
 *     chat id never reach the browser or the frontend bundle.
 * Nothing here touches the network.
 */
import { uid } from "./utils";

/** Placeholder: no real bot exists yet. Replace once the bot is created. */
export const TELEGRAM_BOT_USERNAME = "NexusSeekerBot";
export const TELEGRAM_LINK_CODE_TTL_MS = 10 * 60 * 1000;

/** The fake "bot confirm" shortcut only exists in development (and tests), never in a production build. */
export const TELEGRAM_MOCK_BOT_ENABLED: boolean = import.meta.env.DEV;

/**
 * The mock bot exists only in development builds. A production build never simulates a
 * link, so nothing can look connected without a real server behind it.
 */
export const TELEGRAM_MOCK_BOT_ENABLED = import.meta.env.DEV;

export type TelegramLink =
  | { status: "disconnected" }
  | { status: "pending"; requestId: string; code: string; expiresAt: number }
  | { status: "connected"; handleHint: string; linkedAt: number; demo?: boolean };

export const DISCONNECTED: TelegramLink = { status: "disconnected" };

/** Masks a Telegram handle: "@mikael_dev" -> "@mi•••ev". */
export function maskHandle(handle: string): string {
  const h = handle.replace(/^@/, "");
  if (h.length <= 4) return `@${h[0] ?? ""}•••`;
  return `@${h.slice(0, 2)}•••${h.slice(-2)}`;
}

function randomCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export interface TelegramLinkServer {
  subscribe(listener: () => void): () => void;
  getSnapshot(): ReadonlyMap<string, TelegramLink>;
  requestLink(owner: string): Promise<TelegramLink>;
  /** Skeleton only: stands in for the bot receiving `/start <code>`. */
  simulateBotConfirm(owner: string): Promise<void>;
  cancelLink(owner: string): Promise<void>;
  disconnect(owner: string): Promise<void>;
}

function createMockServer(): TelegramLinkServer {
  let links = new Map<string, TelegramLink>();
  const listeners = new Set<() => void>();
  const tick = () => new Promise((resolve) => setTimeout(resolve, 250));

  const set = (owner: string, link: TelegramLink) => {
    links = new Map(links);
    links.set(owner, link);
    listeners.forEach((l) => l());
  };
  const get = (owner: string) => links.get(owner) ?? DISCONNECTED;

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => links,

    async requestLink(owner) {
      await tick();
      if (get(owner).status === "connected") throw new Error("Un compte Telegram est déjà lié à ce wallet.");
      const link: TelegramLink = { status: "pending", requestId: uid(), code: randomCode(), expiresAt: Date.now() + TELEGRAM_LINK_CODE_TTL_MS };
      set(owner, link);
      return link;
    },

    async simulateBotConfirm(owner) {
      if (!TELEGRAM_MOCK_BOT_ENABLED) throw new Error("Aucun bot n'est branché : la simulation est désactivée hors développement.");
      await tick();
      if (!TELEGRAM_MOCK_BOT_ENABLED) throw new Error("Simulation du bot désactivée en production.");
      const current = get(owner);
      if (current.status !== "pending") throw new Error("Aucune liaison en attente.");
      if (Date.now() > current.expiresAt) {
        set(owner, DISCONNECTED);
        throw new Error("Code expiré. Relance la connexion.");
      }
      set(owner, { status: "connected", handleHint: maskHandle("@demo_seeker"), linkedAt: Date.now(), demo: true });
    },

    async cancelLink(owner) {
      await tick();
      if (get(owner).status === "pending") set(owner, DISCONNECTED);
    },

    async disconnect(owner) {
      await tick();
      set(owner, DISCONNECTED);
    },
  };
}

export const telegramLinkServer: TelegramLinkServer = createMockServer();
