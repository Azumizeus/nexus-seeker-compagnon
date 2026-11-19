import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useNexus } from "./useNexus";
import { useToast } from "./useToast";
import { isAgentOverridden, type WalletMode } from "@/lib/guards";
import { tradingKeyServer } from "@/lib/tradingKeyServer";
import {
  effectiveTradingMode,
  platformDisplayName,
  TRADING_KEYS_PER_AGENT_MAX,
  type TradingKeyRecord,
  type TradingKeySubmission,
} from "@/lib/tradingKeys";
import type { Agent } from "@/lib/models";

export interface TradingKeyView extends TradingKeyRecord {
  effectiveMode: WalletMode;
  overridden: boolean;
}

/**
 * Trading API keys of one agent. Skeleton: backed by the in-memory mock server.
 * "Reprendre la main" (global or per agent) forces every key back to human validation.
 */
export function useAgentTradingKeys(agent: Pick<Agent, "id" | "slot" | "name">) {
  const { config } = useNexus();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);

  const all = useSyncExternalStore(tradingKeyServer.subscribe, tradingKeyServer.getSnapshot);

  useEffect(() => {
    tradingKeyServer.seedDemo(agent.id, agent.slot);
  }, [agent.id, agent.slot]);

  const overridden = config
    ? isAgentOverridden({ globalOverride: config.globalOverride, agentOverrideMask: config.agentOverrideMask }, agent.slot)
    : false;

  const keys = useMemo<TradingKeyView[]>(
    () =>
      all
        .filter((k) => k.agentId === agent.id)
        .map((k) => ({ ...k, overridden, effectiveMode: effectiveTradingMode(k.mode, overridden) })),
    [all, agent.id, overridden],
  );

  const run = useCallback(
    async (key: string, title: string, fn: () => Promise<unknown>) => {
      setPending(key);
      try {
        await fn();
        toast({ tone: "success", title });
        return true;
      } catch (e) {
        toast({ tone: "alert", title: "Action refusée", description: e instanceof Error ? e.message : String(e) });
        return false;
      } finally {
        setPending(null);
      }
    },
    [toast],
  );

  return {
    keys,
    overridden,
    pending,
    canAdd: keys.length < TRADING_KEYS_PER_AGENT_MAX,
    addKey: (input: Omit<TradingKeySubmission, "agentId" | "agentSlot">) =>
      run("add", `Clé ${platformDisplayName(input.platform, input.customName)} ajoutée à ${agent.name}`, () =>
        tradingKeyServer.submit({ ...input, agentId: agent.id, agentSlot: agent.slot }),
      ),
    setMode: (key: TradingKeyView, mode: WalletMode, acknowledgedMarginRisk = false) =>
      run(`mode:${key.id}`, "Mode de trading mis à jour", () => tradingKeyServer.setMode(key.id, mode, { acknowledgedMarginRisk })),
    setRiskCap: (key: TradingKeyView, usd: number) =>
      run(`cap:${key.id}`, "Plafond de risque mis à jour", () => tradingKeyServer.setRiskCap(key.id, usd)),
    revoke: (key: TradingKeyView) => run(`revoke:${key.id}`, `Clé ${key.platformName} révoquée`, () => tradingKeyServer.revoke(key.id)),
  };
}

export type AgentTradingKeysApi = ReturnType<typeof useAgentTradingKeys>;
