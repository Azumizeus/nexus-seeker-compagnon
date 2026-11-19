import { useCallback, useEffect, useMemo, useState } from "react";
import { useNexus } from "./useNexus";
import { useOnChainAction } from "./useOnChainAction";
import { effectiveMode, type WalletMode, WALLET_MODE_LABELS } from "@/lib/guards";
import type { AgentWalletState } from "@/lib/nexusAccess";
import { MAX_INDIVIDUAL_WALLET_INDEX, MAX_SHARED_WALLETS } from "@/lib/solana";
import { shortAddress } from "@/lib/utils";

export interface AgentWalletView extends AgentWalletState {
  balanceLamports: number | null;
  effectiveMode: WalletMode;
  overridden: boolean;
}

/**
 * On-chain agent wallets (registry) + live balances + effective mode.
 * Private keys never reach the client: they live server-side and the
 * `sign-agent-tx` edge function signs after reading this registry.
 */
export function useAgentWallets() {
  const { client, config, chainTick } = useNexus();
  const { run, pending } = useOnChainAction();
  const [wallets, setWallets] = useState<AgentWalletState[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Pure read: registry + balances. No state is touched here. */
  const fetchSnapshot = useCallback(async () => {
    const result = await client.fetchAgentWallets();
    if (!result.success) return { error: result.error ?? "Lecture des wallets agent impossible", list: null, balances: null };
    const list = result.data ?? [];
    const bal = await client.fetchBalances(list.map((w) => w.walletPubkey));
    return { error: null, list, balances: bal.success && bal.data ? bal.data : null };
  }, [client]);

  const applySnapshot = useCallback((snap: Awaited<ReturnType<typeof fetchSnapshot>>) => {
    if (snap.list) setWallets(snap.list);
    if (snap.balances) setBalances(snap.balances);
    setError(snap.error);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    applySnapshot(await fetchSnapshot());
  }, [fetchSnapshot, applySnapshot]);

  useEffect(() => {
    let alive = true;
    fetchSnapshot()
      .then((snap) => {
        if (alive) applySnapshot(snap);
      })
      .catch((e: unknown) => console.error("[agent wallets]", e));
    return () => {
      alive = false;
    };
  }, [fetchSnapshot, applySnapshot, chainTick]);

  const views = useMemo<AgentWalletView[]>(() => {
    const overrides = { globalOverride: config?.globalOverride ?? false, agentOverrideMask: config?.agentOverrideMask ?? 0 };
    return wallets.map((w) => {
      const eff = effectiveMode(overrides, w);
      return { ...w, balanceLamports: balances[w.walletPubkey] ?? null, effectiveMode: eff, overridden: eff !== w.mode };
    });
  }, [wallets, balances, config]);

  const walletsForSlot = useCallback(
    (slot: number) => views.filter((w) => (w.isShared ? (w.assignedAgentsMask & (1 << slot)) !== 0 : w.agentId === slot)),
    [views],
  );

  const nextIndividualIndex = useCallback(
    (slot: number) => {
      const used = new Set(wallets.filter((w) => !w.isShared && w.agentId === slot).map((w) => w.walletIndex));
      for (let i = 0; i < MAX_INDIVIDUAL_WALLET_INDEX; i++) if (!used.has(i)) return i;
      return null;
    },
    [wallets],
  );

  const nextSharedIndex = useCallback(() => {
    const used = new Set(wallets.filter((w) => w.isShared).map((w) => w.walletIndex));
    for (let i = 0; i < MAX_SHARED_WALLETS; i++) if (!used.has(i)) return i;
    return null;
  }, [wallets]);

  /* ----------------------------- actions ----------------------------- */

  const registerAgentWallet = (p: { slot: number; walletPubkey: string; spendCapSol: number; agentId?: string }) => {
    const walletIndex = nextIndividualIndex(p.slot);
    if (walletIndex === null) return Promise.resolve(false);
    return run(
      "register",
      "Wallet agent enregistré",
      () => client.registerAgentWallet({ agentId: p.slot, walletIndex, walletPubkey: p.walletPubkey, spendCapSol: p.spendCapSol }),
      { detail: `Wallet ${shortAddress(p.walletPubkey)} · plafond ${p.spendCapSol} SOL`, agentSlot: p.slot, agentId: p.agentId },
    );
  };

  const registerSharedWallet = (p: { walletPubkey: string; agentsMask: number; spendCapSol: number }) => {
    const walletIndex = nextSharedIndex();
    if (walletIndex === null) return Promise.resolve(false);
    return run(
      "register-shared",
      "Wallet commun enregistré",
      () => client.registerSharedWallet({ walletIndex, walletPubkey: p.walletPubkey, agentsMask: p.agentsMask, spendCapSol: p.spendCapSol }),
      { detail: `Wallet ${shortAddress(p.walletPubkey)} · plafond ${p.spendCapSol} SOL` },
    );
  };

  const setMode = (w: AgentWalletView, mode: WalletMode) =>
    run(`mode:${w.address}`, "Mode de wallet modifié", () => client.setWalletMode(w.address, mode), {
      detail: `${shortAddress(w.walletPubkey)} → ${WALLET_MODE_LABELS[mode]}`,
      severity: mode === "agentAuthorized" ? "alert" : "success",
      agentSlot: w.isShared ? undefined : w.agentId,
    });

  const setSpendCap = (w: AgentWalletView, capSol: number) =>
    run(`cap:${w.address}`, "Plafond de wallet modifié", () => client.setWalletSpendCap(w.address, capSol), {
      detail: `${shortAddress(w.walletPubkey)} → ${capSol} SOL`,
      agentSlot: w.isShared ? undefined : w.agentId,
    });

  const assignShared = (w: AgentWalletView, mask: number) =>
    run(`assign:${w.address}`, "Wallet commun réassigné", () => client.assignSharedWallet(w.address, mask), {
      detail: shortAddress(w.walletPubkey),
    });

  const resetSpent = (w: AgentWalletView) =>
    run(`reset:${w.address}`, "Compteur de wallet remis à zéro", () => client.resetWalletSpent(w.address), {
      detail: shortAddress(w.walletPubkey),
    });

  const revoke = (w: AgentWalletView) =>
    run(`revoke:${w.address}`, "Wallet agent révoqué", () => client.revokeAgentWallet(w.address, w.walletPubkey), {
      detail: shortAddress(w.walletPubkey),
      severity: "alert",
      agentSlot: w.isShared ? undefined : w.agentId,
    });

  return {
    wallets: views,
    loading,
    error,
    refresh,
    pending,
    walletsForSlot,
    nextIndividualIndex,
    nextSharedIndex,
    registerAgentWallet,
    registerSharedWallet,
    setMode,
    setSpendCap,
    assignShared,
    resetSpent,
    revoke,
  };
}
