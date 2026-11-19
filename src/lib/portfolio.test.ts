import { describe, expect, it } from "vitest";
import { buildAgentPnl, mergePortfolioSeries, pnlOf, valueAt, type WalletPnlInput } from "./portfolio";
import type { BalancePoint } from "./walletSeries";

const point = (at: number, lamports: number): BalancePoint => ({ at, lamports });

const wallet = (overrides: Partial<WalletPnlInput> & Pick<WalletPnlInput, "address">): WalletPnlInput => ({
  slot: 0,
  isShared: false,
  assignedAgentsMask: 0,
  series: [],
  ...overrides,
});

describe("pnlOf", () => {
  it("measures the change between the oldest and the newest point", () => {
    expect(pnlOf([point(1, 1_000), point(2, 1_500), point(3, 1_250)])).toEqual({
      startLamports: 1_000,
      currentLamports: 1_250,
      deltaLamports: 250,
      percent: 25,
    });
  });

  it("reports a loss with a negative delta and percent", () => {
    const pnl = pnlOf([point(1, 2_000), point(2, 1_500)]);
    expect(pnl.deltaLamports).toBe(-500);
    expect(pnl.percent).toBe(-25);
  });

  it("has no percentage when the window starts at zero", () => {
    const pnl = pnlOf([point(1, 0), point(2, 900)]);
    expect(pnl.deltaLamports).toBe(900);
    expect(pnl.percent).toBeNull();
  });

  it("returns an empty window for an empty series", () => {
    expect(pnlOf([])).toEqual({ startLamports: 0, currentLamports: 0, deltaLamports: 0, percent: null });
  });
});

describe("valueAt", () => {
  const series = [point(10, 100), point(20, 200)];

  it("uses the last known balance at or before the asked time", () => {
    expect(valueAt(series, 15)).toBe(100);
    expect(valueAt(series, 20)).toBe(200);
    expect(valueAt(series, 99)).toBe(200);
  });

  it("values the time before the first point with the earliest reading", () => {
    expect(valueAt(series, 5)).toBe(100);
  });

  it("returns 0 for a wallet with no reading", () => {
    expect(valueAt([], 10)).toBe(0);
  });
});

describe("mergePortfolioSeries", () => {
  it("sums the wallets on a single time axis", () => {
    const merged = mergePortfolioSeries([
      [point(10, 100), point(30, 300)],
      [point(20, 50)],
    ]);
    // Before its first reading, the second wallet is valued at that reading (50).
    expect(merged).toEqual([
      { at: 10, lamports: 150 },
      { at: 20, lamports: 150 },
      { at: 30, lamports: 350 },
    ]);
  });

  it("keeps the last known balance of a wallet that has no reading at that time", () => {
    const merged = mergePortfolioSeries([
      [point(10, 100), point(40, 100)],
      [point(20, 50), point(30, 0)],
    ]);
    expect(merged.map((p) => p.lamports)).toEqual([150, 150, 100, 100]);
  });

  it("ignores empty series and returns nothing when all are empty", () => {
    expect(mergePortfolioSeries([[], []])).toEqual([]);
    expect(mergePortfolioSeries([[], [point(10, 42)]])).toEqual([{ at: 10, lamports: 42 }]);
  });

  it("collapses the shared current-balance timestamp into one point", () => {
    const merged = mergePortfolioSeries([
      [point(10, 100), point(100, 120)],
      [point(20, 50), point(100, 70)],
    ]);
    expect(merged).toHaveLength(3);
    expect(merged[merged.length - 1]).toEqual({ at: 100, lamports: 190 });
  });
});

describe("buildAgentPnl", () => {
  const own = wallet({ address: "own-0", slot: 0, series: [point(10, 1_000), point(20, 1_200)] });
  const shared = wallet({
    address: "shared",
    slot: 255,
    isShared: true,
    assignedAgentsMask: 0b11,
    series: [point(10, 500), point(20, 400)],
  });

  it("groups own wallets by slot and shared wallets by their assigned mask", () => {
    const rows = buildAgentPnl([own, shared]);
    expect(rows.map((row) => row.slot)).toEqual([0, 1]);
    expect(rows[0]).toMatchObject({ ownWallets: 1, sharedWallets: 1 });
    expect(rows[1]).toMatchObject({ ownWallets: 0, sharedWallets: 1 });
  });

  it("counts a shared wallet in full for every agent it is assigned to", () => {
    const [first, second] = buildAgentPnl([own, shared]);
    expect(first.shared.currentLamports).toBe(400);
    expect(second.shared.currentLamports).toBe(400);
    expect(second.shared.deltaLamports).toBe(-100);
  });

  it("keeps the two pockets apart inside one agent", () => {
    const [first] = buildAgentPnl([own, shared]);
    expect(first.own.currentLamports).toBe(1_200);
    expect(first.own.deltaLamports).toBe(200);
    expect(first.series[first.series.length - 1].lamports).toBe(1_600);
  });

  it("only reports slots that actually hold a wallet", () => {
    expect(buildAgentPnl([])).toEqual([]);
    expect(buildAgentPnl([own]).map((row) => row.slot)).toEqual([0]);
  });

  it("ignores slots set on a shared wallet's own field", () => {
    const misplaced = wallet({ address: "s", slot: 4, isShared: true, assignedAgentsMask: 0b1 });
    expect(buildAgentPnl([misplaced]).map((row) => row.slot)).toEqual([0]);
  });
});
