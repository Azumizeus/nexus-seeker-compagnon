import { RefreshCw } from "lucide-react";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import AddressChip from "@/components/shared/AddressChip";
import AgentAvatar from "@/components/shared/AgentAvatar";
import { GuardNotice } from "@/components/shared/Notices";
import { useNexus } from "@/hooks/useNexus";
import { useAgents } from "@/hooks/useAgents";
import { MAX_SHARED_WALLETS, MAX_TOTAL_WALLETS } from "@/lib/solana";
import { MAX_AGENTS } from "@/lib/appConfig";
import { cn, formatSol } from "@/lib/utils";

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="stack !gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="font-display text-lg font-semibold tabular-nums">
          {value}
          <span className="text-sm text-muted-foreground"> / {max}</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
        <div className={cn("h-full rounded-full", pct >= 100 ? "bg-danger" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Read-only view of the on-chain Config. */
export default function ConfigCard() {
  const { config, configLoading, configError, refreshConfig } = useNexus();
  const { agentBySlot } = useAgents();

  return (
    <section className="card stack" aria-labelledby="config-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Lecture seule · devnet</p>
          <h2 id="config-title" className="text-xl font-semibold">
            Config on-chain
          </h2>
        </div>
        <Button variant="outline" size="md" onClick={() => void refreshConfig()} loading={configLoading}>
          {!configLoading && <RefreshCw className="h-4 w-4" aria-hidden />}
          Actualiser
        </Button>
      </div>

      {configError && <GuardNotice tone="danger">{configError}</GuardNotice>}

      {config && (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge tone={config.paused ? "danger" : "success"} dot>
              {config.paused ? "En pause" : "Actif"}
            </Badge>
            <Badge tone={config.globalOverride ? "danger" : "neutral"} dot>
              {config.globalOverride ? "Contrôle repris (global)" : "Modes des wallets appliqués"}
            </Badge>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="stack !gap-1">
              <dt className="label">Authority</dt>
              <dd><AddressChip address={config.authority} /></dd>
            </div>
            <div className="stack !gap-1">
              <dt className="label">Guardian</dt>
              <dd><AddressChip address={config.guardian} /></dd>
            </div>
            {config.pendingAuthority && (
              <div className="stack !gap-1 sm:col-span-2">
                <dt className="label">Authority proposée (en attente)</dt>
                <dd><AddressChip address={config.pendingAuthority} /></dd>
              </div>
            )}
          </dl>

          <div className="grid gap-4 rounded-2xl bg-surface-sunken p-4 sm:grid-cols-3">
            <Meter label="Wallets agent" value={config.totalWallets} max={MAX_TOTAL_WALLETS} />
            <Meter label="Wallets communs" value={config.sharedWallets} max={MAX_SHARED_WALLETS} />
            <div className="stack !gap-1.5">
              <span className="text-sm font-medium text-muted-foreground">Plafond global dépensé</span>
              <span className="font-display text-lg font-semibold tabular-nums">
                {formatSol(config.globalSpentLamports)}
                <span className="text-sm text-muted-foreground"> / {formatSol(config.globalSpendCapLamports)}</span>
              </span>
            </div>
          </div>

          <div className="stack !gap-2">
            <p className="label">Wallets par agent · max {config.maxWalletsPerAgent} chacun</p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Array.from({ length: MAX_AGENTS }, (_, slot) => {
                const agent = agentBySlot(slot);
                const count = config.walletsPerAgent[slot] ?? 0;
                if (!agent && count === 0) return null;
                return (
                  <li key={slot} className="flex min-h-tap items-center gap-3 rounded-xl border-[1.5px] border-border px-3 py-2">
                    <AgentAvatar name={agent?.name ?? `#${slot}`} slot={slot} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-medium">{agent?.name ?? `Emplacement #${slot}`}</span>
                    <span className="font-mono text-sm tabular-nums">
                      {count}/{config.maxWalletsPerAgent}
                    </span>
                  </li>
                );
              })}
            </ul>
            {config.walletsPerAgent.every((n) => n === 0) && !Array.from({ length: MAX_AGENTS }).some((_, s) => agentBySlot(s)) && (
              <p className="text-sm text-muted-foreground">Aucun agent ni wallet agent pour l'instant.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
