import { useCallback, useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useLocalStore } from "./useLocalStore";
import { useNexus } from "./useNexus";
import { getAll } from "@/lib/localDb";
import type { ActivityEntry } from "@/lib/models";
import { CONFIG_ADDRESS } from "@/lib/solana";

const loadActivity = async () => (await getAll<ActivityEntry>("activity")).sort((a, b) => b.at - a.at);

export interface FeedItem extends ActivityEntry {
  origin: "journal" | "chain";
}

/**
 * Unified activity feed: local journal (agent actions, approvals, our own
 * transactions, program events received live) + recent on-chain signatures
 * touching the Config (every agent-wallet instruction does) and the user's wallet.
 */
export function useActivity(limit = 8) {
  const { connection } = useNexus().client;
  const { publicKey, chainTick } = useNexus();
  const { data: journal, loading } = useLocalStore<ActivityEntry[]>("activity", loadActivity, []);
  const [chain, setChain] = useState<FeedItem[]>([]);
  const [chainError, setChainError] = useState<string | null>(null);

  /** Pure read: recent signatures for the Config and the user's wallet. No state is touched here. */
  const fetchChain = useCallback(async (): Promise<{ items: FeedItem[] | null; error: string | null }> => {
    try {
      const [programSigs, walletSigs] = await Promise.all([
        connection.getSignaturesForAddress(CONFIG_ADDRESS, { limit: 6 }),
        publicKey ? connection.getSignaturesForAddress(new PublicKey(publicKey), { limit: 6 }) : Promise.resolve([]),
      ]);
      const items: FeedItem[] = [
        ...programSigs.map((s) => ({
          id: `p:${s.signature}`,
          at: (s.blockTime ?? 0) * 1000,
          source: "program" as const,
          severity: s.err ? ("danger" as const) : ("info" as const),
          title: s.err ? "Transaction programme échouée" : "Transaction nexus_access",
          signature: s.signature,
          origin: "chain" as const,
        })),
        ...walletSigs.map((s) => ({
          id: `w:${s.signature}`,
          at: (s.blockTime ?? 0) * 1000,
          source: "wallet" as const,
          severity: s.err ? ("danger" as const) : ("info" as const),
          title: s.err ? "Transaction échouée (wallet principal)" : "Transaction du wallet principal",
          signature: s.signature,
          origin: "chain" as const,
        })),
      ];
      return { items, error: null };
    } catch (error) {
      console.error("[activity] chain fetch failed", error);
      return { items: null, error: "Historique on-chain indisponible pour le moment." };
    }
  }, [connection, publicKey]);

  const applyChain = useCallback((r: Awaited<ReturnType<typeof fetchChain>>) => {
    if (r.items) setChain(r.items);
    setChainError(r.error);
  }, []);

  useEffect(() => {
    let alive = true;
    fetchChain().then((r) => {
      if (alive) applyChain(r);
    });
    return () => {
      alive = false;
    };
  }, [fetchChain, applyChain, chainTick]);

  const feed = useMemo(() => {
    const known = new Set(journal.filter((j) => j.signature).map((j) => j.signature));
    const merged: FeedItem[] = [
      ...journal.map((j) => ({ ...j, origin: "journal" as const })),
      ...chain.filter((c) => !known.has(c.signature)),
    ];
    const seen = new Set<string>();
    return merged
      .filter((item) => {
        const key = item.signature ?? item.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, limit);
  }, [journal, chain, limit]);

  const reload = useCallback(async () => applyChain(await fetchChain()), [fetchChain, applyChain]);

  return { feed, journal, loading, chainError, reload };
}
