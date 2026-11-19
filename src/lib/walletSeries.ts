/**
 * Balance series for one agent wallet.
 *
 * The RPC gives no balance history, so the series is rebuilt from the last
 * transactions: the current balance is known, and each transaction carries the
 * wallet's pre/post balance. Walking back in time gives the past balances.
 * Pure functions only — the component owns the fetching.
 */

export interface WalletTxPoint {
  signature: string;
  /** Unix seconds, as returned by `getSignaturesForAddress`. */
  blockTime: number | null;
  /** Change applied to the wallet's own balance by this transaction. */
  deltaLamports: number;
}

export interface BalancePoint {
  /** Unix milliseconds. */
  at: number;
  lamports: number;
}

export interface SeriesOptions {
  /** Most recent points kept, the current balance included. */
  limit?: number;
  /** Timestamp given to the current balance. */
  now?: number;
}

/** Versioned transactions append loaded addresses after the static keys. */
export function orderedAccountKeys(
  staticKeys: readonly string[],
  loaded?: { writable?: readonly string[]; readonly?: readonly string[] } | null,
): string[] {
  return [...staticKeys, ...(loaded?.writable ?? []), ...(loaded?.readonly ?? [])];
}

export function resolveAccountIndex(keys: readonly string[], address: string): number {
  return keys.indexOf(address);
}

/** Balance change for one account between two snapshots. */
export function balanceDelta(pre: number | undefined, post: number | undefined): number {
  if (typeof pre !== "number" || typeof post !== "number") return 0;
  const delta = post - pre;
  return Number.isFinite(delta) ? delta : 0;
}

/**
 * Oldest first. `txs` must be newest first (the RPC order). Points sharing a
 * timestamp are collapsed, keeping the balance closest to the present.
 */
export function buildBalanceSeries(
  currentLamports: number,
  txs: readonly WalletTxPoint[],
  options: SeriesOptions = {},
): BalancePoint[] {
  const { limit = 12, now = Date.now() } = options;
  const current = Math.max(0, currentLamports);

  const newestFirst: BalancePoint[] = [{ at: now, lamports: current }];
  let balance = current;
  for (const tx of txs) {
    if (typeof tx.blockTime !== "number" || !Number.isFinite(tx.blockTime)) continue;
    balance -= tx.deltaLamports;
    newestFirst.push({ at: tx.blockTime * 1_000, lamports: Math.max(0, balance) });
  }

  const ascending = newestFirst.reverse();
  const collapsed: BalancePoint[] = [];
  for (const point of ascending) {
    if (collapsed.length > 0 && collapsed[collapsed.length - 1].at === point.at) {
      collapsed[collapsed.length - 1] = point;
    } else {
      collapsed.push(point);
    }
  }

  const kept = Math.max(1, Math.floor(limit));
  return collapsed.slice(-kept);
}

/** Points for an SVG polyline, `pad` pixels away from every edge. */
export function buildPolyline(points: readonly BalancePoint[], width: number, height: number, pad = 2): string {
  if (points.length === 0) return "";
  const values = points.map((p) => p.lamports);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const usableWidth = Math.max(0, width - pad * 2);
  const usableHeight = Math.max(0, height - pad * 2);
  const round = (n: number) => String(Number(n.toFixed(2)));

  return points
    .map((point, index) => {
      const ratio = points.length === 1 ? 0.5 : index / (points.length - 1);
      const x = pad + ratio * usableWidth;
      const y = span === 0 ? height / 2 : pad + (1 - (point.lamports - min) / span) * usableHeight;
      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}
