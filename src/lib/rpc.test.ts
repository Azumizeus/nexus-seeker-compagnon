import { describe, expect, it, vi } from "vitest";
import { PUBLIC_DEVNET_RPC, createRequestSpacer, isRetryableRpcError, resolveRpcEndpoints, withRpcFailover } from "./rpc";

const rateLimited = (statusCode = 429) => Object.assign(new Error(`Server responded with ${statusCode}`), { statusCode });
const noSleep = async () => {};

describe("resolveRpcEndpoints", () => {
  it("falls back to the public devnet endpoint when nothing is configured", () => {
    expect(resolveRpcEndpoints({})).toEqual([PUBLIC_DEVNET_RPC]);
  });

  it("puts the configured endpoint first and keeps the public fallback", () => {
    expect(resolveRpcEndpoints({ VITE_SOLANA_RPC_URL: "https://paid.example/rpc" })).toEqual([
      "https://paid.example/rpc",
      PUBLIC_DEVNET_RPC,
    ]);
  });

  it("adds the fallback endpoint before the public one", () => {
    expect(
      resolveRpcEndpoints({
        VITE_SOLANA_RPC_URL: "https://primary.example/rpc",
        VITE_SOLANA_RPC_FALLBACK_URL: "https://secondary.example/rpc",
      }),
    ).toEqual(["https://primary.example/rpc", "https://secondary.example/rpc", PUBLIC_DEVNET_RPC]);
  });

  it("trims values, drops blanks and deduplicates", () => {
    expect(
      resolveRpcEndpoints({
        VITE_SOLANA_RPC_URL: "  https://primary.example/rpc  ",
        VITE_SOLANA_RPC_FALLBACK_URL: PUBLIC_DEVNET_RPC,
      }),
    ).toEqual(["https://primary.example/rpc", PUBLIC_DEVNET_RPC]);
    expect(resolveRpcEndpoints({ VITE_SOLANA_RPC_URL: "   " })).toEqual([PUBLIC_DEVNET_RPC]);
  });
});

describe("isRetryableRpcError", () => {
  it("retries rate limits and transient network failures", () => {
    expect(isRetryableRpcError(rateLimited())).toBe(true);
    expect(isRetryableRpcError(new Error("429 Too Many Requests"))).toBe(true);
    expect(isRetryableRpcError(new Error("fetch failed"))).toBe(true);
    expect(isRetryableRpcError(Object.assign(new Error("boom"), { code: "ECONNRESET" }))).toBe(true);
    expect(isRetryableRpcError(new Error("502 Bad Gateway"))).toBe(true);
  });

  it("does not retry a rejected instruction", () => {
    expect(isRetryableRpcError(new Error("Invalid param: WrongSize"))).toBe(false);
    expect(isRetryableRpcError(new Error("custom program error: 0x1770"))).toBe(false);
    expect(isRetryableRpcError(null)).toBe(false);
  });
});

describe("withRpcFailover", () => {
  it("returns the first successful result without touching later endpoints", async () => {
    const run = vi.fn(async () => "ok");
    await expect(withRpcFailover(["a", "b"], run, { sleep: noSleep })).resolves.toBe("ok");
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith("a");
  });

  it("rotates to the next endpoint when the first is rate limited", async () => {
    const run = vi.fn(async (endpoint: string) => {
      if (endpoint === "a") throw rateLimited();
      return `ok:${endpoint}`;
    });
    await expect(withRpcFailover(["a", "b"], run, { sleep: noSleep })).resolves.toBe("ok:b");
    expect(run.mock.calls.map(([endpoint]) => endpoint)).toEqual(["a", "b"]);
  });

  it("throws the last error once every endpoint and round is used", async () => {
    const run = vi.fn(async (endpoint: string) => {
      throw rateLimited(endpoint === "a" ? 429 : 503);
    });
    await expect(withRpcFailover(["a", "b"], run, { sleep: noSleep, rounds: 2 })).rejects.toThrow("503");
    expect(run.mock.calls.map(([endpoint]) => endpoint)).toEqual(["a", "b", "a", "b"]);
  });

  it("fails fast on a non-retryable error", async () => {
    const run = vi.fn(async () => {
      throw new Error("Invalid param: WrongSize");
    });
    await expect(withRpcFailover(["a", "b"], run, { sleep: noSleep })).rejects.toThrow("Invalid param");
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("waits with backoff between rounds", async () => {
    const sleep = vi.fn(noSleep);
    const run = vi.fn(async () => {
      throw rateLimited();
    });
    await expect(withRpcFailover(["only"], run, { sleep, rounds: 2 })).rejects.toThrow();
    expect(run).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(1_000);
  });

  it("doubles the wait on each round, capped at maxDelayMs", async () => {
    const sleep = vi.fn(async (ms: number) => {
      void ms;
    });
    const run = vi.fn(async () => {
      throw rateLimited();
    });
    await expect(withRpcFailover(["only"], run, { sleep, rounds: 3 })).rejects.toThrow();
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1_000, 2_000]);
  });
});

describe("createRequestSpacer", () => {
  it("never runs two calls at once", async () => {
    const spaced = createRequestSpacer(0);
    let active = 0;
    let peak = 0;
    const call = () =>
      spaced(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
      });
    await Promise.all([call(), call(), call()]);
    expect(peak).toBe(1);
  });

  it("keeps going after a rejected call", async () => {
    const spaced = createRequestSpacer(0);
    await expect(spaced(async () => Promise.reject(new Error("429")))).rejects.toThrow("429");
    await expect(spaced(async () => "ok")).resolves.toBe("ok");
  });

  it("waits at least the minimum interval between calls", async () => {
    const spaced = createRequestSpacer(30);
    const starts: number[] = [];
    const call = () =>
      spaced(async () => {
        starts.push(Date.now());
        return "ok";
      });
    await call();
    await call();
    expect(starts).toHaveLength(2);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(25);
  });
});
