import { useMemo } from "react";
import AgentAvatar from "@/components/shared/AgentAvatar";
import Badge from "@/components/shared/Badge";
import { EmptyState, GuardNotice } from "@/components/shared/Notices";
import { useAgents } from "@/hooks/useAgents";
import { useAgentWallets } from "@/hooks/useAgentWallets";
import { useNexus } from "@/hooks/useNexus";
import { isAgentOverridden } from "@/lib/guards";
import { MAX_AGENTS } from "@/lib/appConfig";
import { formatSol } from "@/lib/utils";

/**
 * Per-agent limits, read from the on-chain Config (wallet count, take-back
 * mask) and the wallet registry (caps and spend). Read-only: caps are edited
 * from each wallet's detail view, the per-agent wallet limit just below.
 */
export default function AgentLimitsTable() {
  const { config, configError } = useNexus();
  const { agents } = useAgents();
  const { wallets, loading, error } = useAgentWallets();

  const rows = useMemo(() => {
    if (!config) return [];
    const slots = new Set<number>(agents.map((a) => a.slot));
    config.walletsPerAgent.forEach((n, slot) => n > 0 && slot < MAX_AGENTS && slots.add(slot));
    wallets.forEach((w) => !w.isShared && slots.add(w.agentId));
    return [...slots]
      .sort((a, b) => a - b)
      .map((slot) => {
        const own = wallets.filter((w) => !w.isShared && w.agentId === slot);
        const shared = wallets.filter((w) => w.isShared && (w.assignedAgentsMask & (1 << slot)) !== 0);
        return {
          slot,
          name: agents.find((a) => a.slot === slot)?.name ?? `Agent #${slot}`,
          count: config.walletsPerAgent[slot] ?? own.length,
          capSum: own.reduce((s, w) => s + w.spendCapLamports, 0),
          spentSum: own.reduce((s, w) => s + w.spentLamports, 0),
          ownCount: own.length,
          sharedCount: shared.length,
          overridden: isAgentOverridden(config, slot),
        };
      });
  }, [config, agents, wallets]);

  if (!config) return <GuardNotice tone={configError ? "danger" : "warning"}>{configError ?? "Config on-chain en cours de lecture…"}</GuardNotice>;
  if (error) return <GuardNotice tone="danger">Lecture du registre impossible : {error}</GuardNotice>;
  if (loading && rows.length === 0) return <p className="text-sm text-muted-foreground">Lecture du registre on-chain…</p>;
  if (rows.length === 0)
    return (
      <EmptyState title="Aucun agent ni wallet enregistré">Les limites de chaque agent apparaîtront dès le premier agent créé.</EmptyState>
    );

  return (
    <div className="stack !gap-2">
      {config.globalOverride && (
        <GuardNotice tone="danger">Contrôle repris sur tous les agents : chaque wallet repasse en validation humaine.</GuardNotice>
      )}
      <ul className="stack !gap-2" data-testid="agent-limits">
        {rows.map((r) => {
          const full = r.count >= config.maxWalletsPerAgent;
          return (
            <li key={r.slot} className="flex items-center gap-3 rounded-xl border-[1.5px] border-border px-3 py-2">
              <AgentAvatar name={r.name} slot={r.slot} size="sm" status={r.overridden ? "overridden" : undefined} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.name}</span>
                  {r.overridden ? <Badge tone="danger" dot>Contrôle repris</Badge> : <Badge tone="success" dot>Autonomie selon le mode</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.ownCount === 0
                    ? "Aucun wallet individuel"
                    : `Dépensé ${formatSol(r.spentSum)} sur ${formatSol(r.capSum)} de plafonds cumulés`}
                  {r.sharedCount > 0 && ` · accès à ${r.sharedCount} wallet(s) commun(s)`}
                </p>
              </div>
              <span className="shrink-0 text-right">
                <span className={full ? "font-display text-lg font-bold text-danger-ink" : "font-display text-lg font-bold"}>
                  {r.count}/{config.maxWalletsPerAgent}
                </span>
                <span className="block text-[0.7rem] text-muted-foreground">wallets</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Lu depuis la Config et le registre on-chain. Le plafond d'un wallet se modifie depuis sa fiche détaillée.
      </p>
    </div>
  );
}
