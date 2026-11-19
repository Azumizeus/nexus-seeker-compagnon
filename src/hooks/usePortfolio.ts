import { useCallback, useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAgentWallets } from "./useAgentWallets";
import { useNexus } from "./useNexus";
import { buildAgentPnl, emptyPnl, mergePortfolioSeries, pnlOf, type AgentPnl, type PnlWindow } from "@/lib/portfolio";
import { countFundedTokenAccounts, fetchWalletTxs, type WalletTx } from "@/lib/walletChain";
import { buildBalanceSeries, type BalancePoint } from "@/lib/walletSeries";

/** Transactions read per wallet — the window the P&L is measured on. */
export const PORTFOLIO_TX_LIMIT = 10;

export interface WalletPerformance {
  address: string;
  slot: number;
  isShared: boolean;
  assignedAgentsMask: number;
  /** Oldest first; empty when the balance or the history is unavailable. */
  series: BalancePoint[];
  pnl: PnlWindow;
  /** Funded SPL token accounts, never converted — the panel is SOL only. */
  tokenAccounts: number;
  /** History could not be read for this wallet. */
  error: boolean;
  /** Balance missing: the global total is partial. */
  incomplete: boolean;
}

interface Row {
  pubkey: string;
  txs: WalletTx[];
  tokenAccounts: number;
  error: boolean;
}

interface Snapshot {
  key: string;
  fetchedAt: number;
  rows: Row[];
}

interface PortfolioData {
  wallets: WalletPerformance[];
  globalSeries: BalancePoint[];
  globalPnl: PnlWindow;
  agents: AgentPnl[];
  tokenAccounts: number;
  incomplete: number;
}

const EMPTY: PortfolioData = {
  wallets: [],
  globalSeries: [],
  globalPnl: emptyPnl(),
  agents: [],
  tokenAccounts: 0,
  incomplete: 0,
};

/**
 * Total value of the agent wallets over time, plus P&L per agent and overall.
 *
 * Nothing is simulated: every point comes from the chain. The RPC exposes no
 * balance history, so each wallet's series is rebuilt from its last
 * transactions (same rule as the wallet sheet), and the aggregations stack
 * those series on a shared time axis.
 */
export function usePortfolio() {
  const { client, chainTick } = useNexus();
  const api = useAgentWallets();
  const [reloadKey, setReloadKey] = useState(0);

  const wallets = api.wallets;
  const addresses = useMemo(() => wallets.map((wallet) => wallet.walletPubkey).join(","), [wallets]);
  const pubkeys = useMemo(() => (addresses ? addresses.split(",") : []), [addresses]);
  const requestKey = `${addresses}:${chainTick}:${reloadKey}`;

  // The snapshot carries the key it was fetched for, so a reload reads as
  // "loading" without setting state inside the effect.
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const fresh = snapshot?.key === requestKey ? snapshot : null;

  const load = useCallback(async (): Promise<Row[]> => {
    const rows: Row[] = [];
    // Sequential on purpose: the public devnet RPC throttles bursts (429).
    for (const pubkey of pubkeys) {
      try {
        const key = new PublicKey(pubkey);
        const txs = await fetchWalletTxs(client.connection, key, PORTFOLIO_TX_LIMIT);
        const tokenAccounts = await countFundedTokenAccounts(client.connection, key);
        rows.push({ pubkey, txs, tokenAccounts, error: false });
      } catch (error) {
        console.error("[portfolio] read failed", error);
        rows.push({ pubkey, txs: [], tokenAccounts: 0, error: true });
      }
    }
    return rows;
  }, [client, pubkeys]);

  useEffect(() => {
    if (pubkeys.length === 0) return;
    let alive = true;
    void load().then((rows) => {
      if (alive) setSnapshot({ key: requestKey, fetchedAt: Date.now(), rows });
    });
    return () => {
      alive = false;
    };
  }, [load, pubkeys, requestKey]);

  const data = useMemo<PortfolioData>(() => {
    if (!fresh) return EMPTY;
    const byAddress = new Map(fresh.rows.map((row) => [row.pubkey, row]));

    const list: WalletPerformance[] = wallets.map((wallet) => {
      const row = byAddress.get(wallet.walletPubkey);
      const balance = wallet.balanceLamports;
      const series =
        row && !row.error && balance !== null
          ? buildBalanceSeries(balance, row.txs, { limit: PORTFOLIO_TX_LIMIT + 1, now: fresh.fetchedAt })
          : [];
      return {
        address: wallet.address,
        slot: wallet.isShared ? 255 : wallet.agentId,
        isShared: wallet.isShared,
        assignedAgentsMask: wallet.assignedAgentsMask,
        series,
        pnl: pnlOf(series),
        tokenAccounts: row?.tokenAccounts ?? 0,
        error: row?.error ?? false,
        incomplete: balance === null || !row || row.error,
      } satisfies WalletPerformance;
    });

    const globalSeries = mergePortfolioSeries(list.map((wallet) => wallet.series));
    return {
      wallets: list,
      globalSeries,
      globalPnl: pnlOf(globalSeries),
      agents: buildAgentPnl(list),
      tokenAccounts: list.reduce((sum, wallet) => sum + wallet.tokenAccounts, 0),
      incomplete: list.filter((wallet) => wallet.incomplete).length,
    };
  }, [fresh, wallets]);

  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
    void api.refresh();
  }, [api]);

  return {
    ...data,
    loading: (api.loading || !fresh) && wallets.length > 0,
    error: api.error,
    refresh,
  };
}
