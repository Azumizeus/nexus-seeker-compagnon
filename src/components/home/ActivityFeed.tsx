import { ExternalLink } from "lucide-react";
import Badge from "@/components/shared/Badge";
import AgentAvatar from "@/components/shared/AgentAvatar";
import { EmptyState } from "@/components/shared/Notices";
import { useActivity } from "@/hooks/useActivity";
import { useAgents } from "@/hooks/useAgents";
import type { ActivitySeverity, ActivitySource } from "@/lib/models";
import { explorerTxUrl } from "@/lib/solana";
import { cn, formatRelative } from "@/lib/utils";

const SOURCE_LABELS: Record<ActivitySource, string> = {
  wallet: "Wallet principal",
  "agent-wallet": "Wallet agent",
  agent: "Agent",
  program: "Programme",
  system: "App",
};
const SEVERITY_BAR: Record<ActivitySeverity, string> = {
  info: "bg-border-strong",
  success: "bg-primary",
  alert: "bg-accent",
  danger: "bg-danger",
};

/** "Dernière activité" — every source, newest first. */
export default function ActivityFeed({ limit = 8, title = "Dernière activité" }: { limit?: number; title?: string }) {
  const { feed, loading, chainError } = useActivity(limit);
  const { agents, agentBySlot } = useAgents();

  return (
    <section className="card stack" aria-labelledby="activity-title">
      <div>
        <p className="eyebrow">Toutes sources</p>
        <h2 id="activity-title" className="text-xl font-semibold">
          {title}
        </h2>
      </div>
      {chainError && <p className="text-sm text-muted-foreground">{chainError}</p>}
      {!loading && feed.length === 0 && <EmptyState title="Rien pour l'instant">Les actions des agents, des wallets et du programme apparaîtront ici.</EmptyState>}
      <ol className="stack !gap-2">
        {feed.map((item) => {
          const agent = item.agentId ? agents.find((a) => a.id === item.agentId) : item.agentSlot !== undefined ? agentBySlot(item.agentSlot) : undefined;
          return (
            <li key={item.id} className="flex gap-3 rounded-xl bg-surface-sunken/60 p-3">
              <span className={cn("w-1.5 shrink-0 rounded-full", SEVERITY_BAR[item.severity])} aria-hidden />
              <div className="min-w-0 flex-1 stack !gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{SOURCE_LABELS[item.source]}</Badge>
                  {agent && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                      <AgentAvatar name={agent.name} slot={agent.slot} size="sm" className="!h-6 !w-6 !rounded-lg text-[0.6rem]" />
                      {agent.name}
                    </span>
                  )}
                  {!agent && item.agentSlot !== undefined && <span className="text-sm font-semibold">Agent #{item.agentSlot}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{formatRelative(item.at)}</span>
                </div>
                <p className="font-semibold leading-snug">{item.title}</p>
                {item.detail && <p className="break-words text-sm text-muted-foreground">{item.detail}</p>}
                {item.signature && (
                  <a
                    href={explorerTxUrl(item.signature)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[32px] items-center gap-1 self-start font-mono text-xs font-semibold text-secondary-ink underline-offset-2 hover:underline"
                  >
                    {item.signature.slice(0, 10)}… <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
