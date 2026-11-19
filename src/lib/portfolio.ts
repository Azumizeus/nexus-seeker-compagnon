/**
 * Portfolio-wide performance, built from on-chain balances only.
 *
 * Agent wallets hold SOL on devnet, so "P&L" here means the balance change over
 * the observed window — not a trading result. There is no price source in the
 * app, and inventing one would turn this screen into fiction. Pure functions:
 * the hook owns the fetching, the screen owns the rendering.
 */
import { MAX_AGENTS } from "./appConfig";
import type { BalancePoint } from "./walletSeries";

export interface PnlWindow {
  startLamports: number;
  currentLamports: number;
  deltaLamports: number;
  /** Change relative to the starting value; null when the window starts at zero. */
  percent: number | null;
}

export function emptyPnl(): PnlWindow {
  return { startLamports: 0, currentLamports: 0, deltaLamports: 0, percent: null };
}

/** Change between the oldest and the newest point of one series. */
export function pnlOf(series: readonly BalancePoint[]): PnlWindow {
  if (series.length === 0) return emptyPnl();
  const startLamports = series[0].lamports;
  const currentLamports = series[series.length - 1].lamports;
  const deltaLamports = currentLamports - startLamports;
  return {
    startLamports,
    currentLamports,
    deltaLamports,
    percent: startLamports > 0 ? (deltaLamports / startLamports) * 100 : null,
  };
}

/** Balance of one wallet at `at`: its last known value at or before that time. */
export function valueAt(points: readonly BalancePoint[], at: number): number {
  if (points.length === 0) return 0;
  // Before its first known point, a wallet is valued at its earliest reading.
  let value = points[0].lamports;
  for (const point of points) {
    if (point.at > at) break;
    value = point.lamports;
  }
  return value;
}

/**
 * One series for several wallets. Every timestamp seen anywhere becomes a
 * point; a wallet with no reading at that time keeps its last known balance.
 *
 * Callers must pass the same `now` to `buildBalanceSeries` for every wallet:
 * otherwise the "current balance" points land on distinct milliseconds and the
 * end of the chart becomes a staircase of noise.
 */
export function mergePortfolioSeries(seriesList: readonly (readonly BalancePoint[])[]): BalancePoint[] {
  const filled = seriesList.filter((series) => series.length > 0);
  if (filled.length === 0) return [];
  const timestamps = [...new Set(filled.flatMap((series) => series.map((point) => point.at)))].sort((a, b) => a - b);
  return timestamps.map((at) => ({
    at,
    lamports: filled.reduce((sum, series) => sum + valueAt(series, at), 0),
  }));
}

export interface WalletPnlInput {
  address: string;
  /** On-chain agent slot; ignored for shared wallets. */
  slot: number;
  isShared: boolean;
  assignedAgentsMask: number;
  series: BalancePoint[];
}

export interface AgentPnl {
  slot: number;
  ownWallets: number;
  sharedWallets: number;
  /** The agent's own wallets. */
  own: PnlWindow;
  /** Shared wallets assigned to this agent, counted in full. */
  shared: PnlWindow;
  ownSeries: BalancePoint[];
  sharedSeries: BalancePoint[];
  /** Own and shared wallets on one time axis — what the card draws. */
  series: BalancePoint[];
}

/**
 * Per-agent figures. A shared wallet counts in full for every agent it is
 * assigned to — it is their budget — while the global total counts each wallet
 * once. The two figures therefore do not add up, and the screen says so.
 */
export function buildAgentPnl(wallets: readonly WalletPnlInput[]): AgentPnl[] {
  const slots = new Set<number>();
  for (const wallet of wallets) {
    if (!wallet.isShared) {
      slots.add(wallet.slot);
      continue;
    }
    for (let slot = 0; slot < MAX_AGENTS; slot += 1) {
      if ((wallet.assignedAgentsMask & (1 << slot)) !== 0) slots.add(slot);
    }
  }

  return [...slots]
    .sort((a, b) => a - b)
    .map((slot) => {
      const own = wallets.filter((wallet) => !wallet.isShared && wallet.slot === slot);
      const shared = wallets.filter(
        (wallet) => wallet.isShared && (wallet.assignedAgentsMask & (1 << slot)) !== 0,
      );
      const ownSeries = mergePortfolioSeries(own.map((wallet) => wallet.series));
      const sharedSeries = mergePortfolioSeries(shared.map((wallet) => wallet.series));
      return {
        slot,
        ownWallets: own.length,
        sharedWallets: shared.length,
        own: pnlOf(ownSeries),
        shared: pnlOf(sharedSeries),
        ownSeries,
        sharedSeries,
        series: mergePortfolioSeries([ownSeries, sharedSeries]),
      } satisfies AgentPnl;
    });
}
