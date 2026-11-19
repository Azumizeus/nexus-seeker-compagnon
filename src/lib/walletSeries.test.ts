import { describe, expect, it } from "vitest";
import {
  balanceDelta,
  buildBalanceSeries,
  buildPolyline,
  orderedAccountKeys,
  resolveAccountIndex,
  type WalletTxPoint,
} from "./walletSeries";

const tx = (signature: string, blockTime: number, deltaLamports: number): WalletTxPoint => ({
  signature,
  blockTime,
  deltaLamports,
});

describe("balanceDelta", () => {
  it("returns the difference between the post and pre balances", () => {
    expect(balanceDelta(1_000, 2_500)).toBe(1_500);
    expect(balanceDelta(2_500, 1_000)).toBe(-1_500);
  });

  it("returns 0 when one side is missing", () => {
    expect(balanceDelta(undefined, 2_500)).toBe(0);
    expect(balanceDelta(1_000, undefined)).toBe(0);
  });
});

describe("orderedAccountKeys", () => {
  it("keeps static keys first, then writable then readonly loaded addresses", () => {
    expect(
      orderedAccountKeys(["a", "b"], { writable: ["c"], readonly: ["d"] }),
    ).toEqual(["a", "b", "c", "d"]);
  });

  it("works without loaded addresses (legacy transaction)", () => {
    expect(orderedAccountKeys(["a", "b"], null)).toEqual(["a", "b"]);
  });
});

describe("resolveAccountIndex", () => {
  it("finds the index of the wallet in the ordered key list", () => {
    expect(resolveAccountIndex(["a", "b", "c"], "c")).toBe(2);
  });

  it("returns -1 when the wallet is not part of the transaction", () => {
    expect(resolveAccountIndex(["a", "b"], "zzz")).toBe(-1);
  });
});

describe("buildBalanceSeries", () => {
  // Newest first, as the RPC returns them.
  const newestFirst = [tx("t3", 300, -1_000), tx("t2", 200, 5_000), tx("t1", 100, -2_000)];

  it("walks back from the current balance and returns points oldest first", () => {
    const series = buildBalanceSeries(10_000, newestFirst, { now: 400_000 });
    // Before t1: 8 000 → before t2: 6 000 → before t3: 11 000 → now: 10 000.
    expect(series).toEqual([
      { at: 100_000, lamports: 8_000 },
      { at: 200_000, lamports: 6_000 },
      { at: 300_000, lamports: 11_000 },
      { at: 400_000, lamports: 10_000 },
    ]);
  });

  it("ignores transactions without a block time", () => {
    const series = buildBalanceSeries(1_000, [{ signature: "x", blockTime: null, deltaLamports: -999 }], { now: 5_000 });
    expect(series).toEqual([{ at: 5_000, lamports: 1_000 }]);
  });

  it("never reports a negative balance", () => {
    // The wallet gained 2 000, so it held at most 0 before the transfer.
    const series = buildBalanceSeries(500, [tx("t1", 100, 2_000)], { now: 200_000 });
    expect(series.map((p) => p.lamports)).toEqual([0, 500]);
  });

  it("collapses points that share a timestamp, keeping the balance closest to now", () => {
    const series = buildBalanceSeries(3_000, [tx("t2", 100, -1_000), tx("t1", 100, -1_000)], { now: 200_000 });
    expect(series).toEqual([
      { at: 100_000, lamports: 4_000 },
      { at: 200_000, lamports: 3_000 },
    ]);
  });

  it("keeps only the most recent points when a limit is set", () => {
    const series = buildBalanceSeries(10_000, newestFirst, { now: 400_000, limit: 2 });
    expect(series).toEqual([
      { at: 300_000, lamports: 11_000 },
      { at: 400_000, lamports: 10_000 },
    ]);
  });

  it("still returns the current balance when there is no history", () => {
    expect(buildBalanceSeries(7_000, [], { now: 1_000 })).toEqual([{ at: 1_000, lamports: 7_000 }]);
  });
});

describe("buildPolyline", () => {
  it("maps every point inside the box", () => {
    const points = buildPolyline(
      [
        { at: 0, lamports: 0 },
        { at: 50, lamports: 100 },
        { at: 100, lamports: 50 },
      ],
      100,
      40,
      2,
    );
    const pairs = points.split(" ").map((pair) => pair.split(",").map(Number));
    expect(pairs).toHaveLength(3);
    for (const [x, y] of pairs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(40);
    }
    // Lowest balance sits on the bottom edge, highest on the top edge.
    expect(pairs[0][1]).toBe(38);
    expect(pairs[1][1]).toBe(2);
  });

  it("draws a flat line through the middle when every value is equal", () => {
    const points = buildPolyline(
      [
        { at: 0, lamports: 5 },
        { at: 10, lamports: 5 },
      ],
      100,
      40,
      2,
    );
    expect(points).toBe("2,20 98,20");
  });

  it("returns an empty string for an empty series", () => {
    expect(buildPolyline([], 100, 40)).toBe("");
  });
});
