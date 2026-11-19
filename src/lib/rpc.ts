import { Connection, type ConnectionConfig } from "@solana/web3.js";

/**
 * RPC resilience.
 *
 * The app must work without a paid provider: the public devnet endpoint rate
 * limits (HTTP 429), so every read is retried with a short backoff and rotated
 * to the next configured endpoint. A key from VITE_SOLANA_RPC_URL still takes
 * priority; VITE_SOLANA_RPC_FALLBACK_URL can add a second provider.
 */

export const PUBLIC_DEVNET_RPC = "https://api.devnet.solana.com";

export interface RpcEnv {
  VITE_SOLANA_RPC_URL?: string;
  VITE_SOLANA_RPC_FALLBACK_URL?: string;
}

/** Configured endpoints first, in order, then the public devnet fallback (deduplicated). */
export function resolveRpcEndpoints(env: RpcEnv = import.meta.env as unknown as RpcEnv): string[] {
  const configured = [env.VITE_SOLANA_RPC_URL, env.VITE_SOLANA_RPC_FALLBACK_URL]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  return [...new Set([...configured, PUBLIC_DEVNET_RPC])];
}

type ErrorLike = { message?: string; statusCode?: number; code?: number | string };

/**
 * Rate limits, timeouts and gateway hiccups are worth another endpoint;
 * a rejected instruction or a bad parameter is not.
 */
export function isRetryableRpcError(error: unknown): boolean {
  const e = (error ?? {}) as ErrorLike;
  if (e.statusCode === 429) return true;
  const text = `${e.message ?? ""} ${String(e.code ?? "")}`.toLowerCase();
  if (/429|too many requests|rate.?limit/.test(text)) return true;
  if (/fetch failed|econnreset|econnrefused|etimedout|enotfound|socket hang up|network/.test(text)) return true;
  return /(^|\D)(502|503|504)(\D|$)/.test(text);
}

export interface FailoverOptions {
  /** Passes over the endpoint list. One pass rotates through every endpoint once. */
  rounds?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  shouldRetry?: (error: unknown) => boolean;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Runs `run` against each endpoint until one succeeds or every attempt is used. */
export async function withRpcFailover<T>(
  endpoints: readonly string[],
  run: (endpoint: string) => Promise<T>,
  options: FailoverOptions = {},
): Promise<T> {
  const {
    rounds = 3,
    baseDelayMs = 1_000,
    maxDelayMs = 4_000,
    sleep = wait,
    shouldRetry = isRetryableRpcError,
  } = options;

  const list = endpoints.length > 0 ? endpoints : [PUBLIC_DEVNET_RPC];
  const passes = Math.max(1, rounds);
  let delay = baseDelayMs;
  let lastError: unknown;

  for (let round = 0; round < passes; round++) {
    for (const endpoint of list) {
      try {
        return await run(endpoint);
      } catch (error) {
        // A rejected instruction will fail the same way everywhere: surface it now.
        if (!shouldRetry(error)) throw error;
        lastError = error;
      }
    }
    if (round < passes - 1) {
      await sleep(delay);
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Serialises calls with at least `minIntervalMs` between them.
 *
 * The public devnet endpoint allows only a few requests per second, and the app
 * fires several reads at once on mount; spacing them keeps us under the limit
 * instead of collecting 429s.
 */
export function createRequestSpacer(minIntervalMs: number) {
  let tail: Promise<unknown> = Promise.resolve();
  let lastStart = 0;

  return function spaced<T>(run: () => Promise<T>): Promise<T> {
    const next = tail.then(async () => {
      const gap = minIntervalMs - (Date.now() - lastStart);
      if (gap > 0) await wait(gap);
      lastStart = Date.now();
      return run();
    });
    // Keep the chain alive even when a call rejects.
    tail = next.catch(() => undefined);
    return next;
  };
}

/**
 * Connection whose JSON-RPC calls go through the failover above.
 *
 * `_rpcRequest` is web3.js's internal transport hook (not typed, but stable
 * across 1.x): wrapping it keeps every caller — Anchor, hooks, wallet adapter —
 * on the same retry/rotation path without touching each call site.
 */
export interface ResilientConnectionOptions {
  /** Minimum gap between two JSON-RPC calls, in milliseconds. */
  minRequestIntervalMs?: number;
}

export function createResilientConnection(
  endpoints: readonly string[] = resolveRpcEndpoints(),
  config: ConnectionConfig = {},
  options: ResilientConnectionOptions = {},
): Connection {
  const { minRequestIntervalMs = 100 } = options;
  const list = endpoints.length > 0 ? [...endpoints] : [PUBLIC_DEVNET_RPC];
  const connection = new Connection(list[0], {
    commitment: "confirmed",
    // Our failover owns retries; web3.js's own loop would only add 4s stalls.
    disableRetryOnRateLimit: true,
    ...config,
  });

  const transport = connection as unknown as {
    _rpcEndpoint: string;
    _rpcRequest: (...args: unknown[]) => Promise<unknown>;
  };
  const send = transport._rpcRequest.bind(connection);
  const spaced = createRequestSpacer(minRequestIntervalMs);

  transport._rpcRequest = (...args: unknown[]) =>
    spaced(() =>
      withRpcFailover(list, async (endpoint) => {
        transport._rpcEndpoint = endpoint;
        return send(...args);
      }),
    );

  return connection;
}
