import { RefreshCw, TrendingUp } from "lucide-react";
import BalanceSparkline from "@/components/agents/BalanceSparkline";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import { EmptyState, GuardNotice, SectionTitle } from "@/components/shared/Notices";
import { useAgents } from "@/hooks/useAgents";
import { PORTFOLIO_TX_LIMIT, usePortfolio } from "@/hooks/usePortfolio";
import type { AgentPnl } from "@/lib/portfolio";
import { cn, formatSol } from "@/lib/utils";

const percentLabel = (percent: number | null) =>
  percent === null ? "—" : `${percent.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

const deltaLabel = (lamports: number) => `${lamports < 0 ? "−" : "+"}${formatSol(Math.abs(lamports), 3)}`;

const changeTone = (delta: number) =>
  delta < 0 ? "text-danger-ink" : delta > 0 ? "text-primary-ink" : "text-muted-foreground";

/**
 * Value of the agent wallets over time, plus P&L per agent and overall.
 * Everything is read from the chain: no wallet, no figure — never a simulated
 * curve.
 */
export default function PerformanceScreen() {
  const { agents } = useAgents();
  const perf = usePortfolio();

  const nameOf = (slot: number) => agents.find((agent) => agent.slot === slot)?.name ?? `Agent #${slot}`;
  const hasWallets = perf.wallets.length > 0;
  const showSkeleton = perf.loading && perf.globalSeries.length === 0;

  return (
    <div className="stack !gap-5 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            {perf.wallets.length} wallet(s) · {PORTFOLIO_TX_LIMIT} dernières transactions chacun
          </p>
          <h1 className="text-3xl font-bold">Performance</h1>
        </div>
        <Button variant="ghost" onClick={perf.refresh} loading={perf.loading && hasWallets}>
          {!(perf.loading && hasWallets) && <RefreshCw className="h-4 w-4" aria-hidden />}
          Actualiser
        </Button>
      </div>

      {perf.error && <GuardNotice tone="danger">{perf.error}</GuardNotice>}
      {perf.incomplete > 0 && (
        <GuardNotice>
          {perf.incomplete} wallet(s) sans solde ou sans historique lisible : le total ci-dessous est partiel.
        </GuardNotice>
      )}
      {perf.tokenAccounts > 0 && (
        <GuardNotice>
          {perf.tokenAccounts} compte(s) de tokens SPL ne sont pas valorisés : ce panneau ne mesure que le SOL.
        </GuardNotice>
      )}

      {!hasWallets ? (
        <EmptyState title="Aucun wallet agent enregistré">
          Le P&L apparaîtra dès le premier wallet enregistré pour un agent. Rien n'est simulé : pas de wallet, pas de chiffre.
        </EmptyState>
      ) : (
        <>
          <section className="card stack" aria-busy={showSkeleton}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label">Valeur totale des wallets agent</p>
                <p className="font-display text-3xl font-semibold tabular-nums">{formatSol(perf.globalPnl.currentLamports)}</p>
                <p className={cn("text-sm font-semibold tabular-nums", changeTone(perf.globalPnl.deltaLamports))}>
                  {deltaLabel(perf.globalPnl.deltaLamports)} · {percentLabel(perf.globalPnl.percent)} sur la fenêtre
                </p>
              </div>
              <Badge tone="neutral">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden /> SOL uniquement
              </Badge>
            </div>

            {showSkeleton ? (
              <div className="h-40 animate-pulse rounded-2xl bg-surface-sunken" aria-hidden />
            ) : perf.globalSeries.length > 1 ? (
              <BalanceSparkline
                points={perf.globalSeries}
                label={`Valeur totale des wallets agent sur ${perf.globalSeries.length} relevés, de ${formatSol(perf.globalPnl.startLamports)} à ${formatSol(perf.globalPnl.currentLamports)}`}
                className="h-40"
              />
            ) : (
              <p className="text-sm text-muted-foreground">Pas assez de transactions pour tracer une évolution.</p>
            )}

            <p className="text-xs text-muted-foreground">
              P&amp;L = variation du solde SOL reconstituée depuis les {PORTFOLIO_TX_LIMIT} dernières transactions de chaque
              wallet. Ce n'est pas un P&amp;L de trading : les wallets ne détiennent pas de positions.
            </p>
          </section>

          <section className="stack">
            <SectionTitle eyebrow="Par agent" title="P&L par agent" />
            <div className="grid gap-3 lg:grid-cols-2">
              {perf.agents.map((agent) => (
                <AgentPnlCard key={agent.slot} data={agent} name={nameOf(agent.slot)} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Un wallet commun compte en entier pour chaque agent assigné ; le total global ne le compte qu'une fois. Les deux
              chiffres ne s'additionnent donc pas.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function AgentPnlCard({ data, name }: { data: AgentPnl; name: string }) {
  const totalLamports = data.own.currentLamports + data.shared.currentLamports;
  const totalDelta = data.own.deltaLamports + data.shared.deltaLamports;

  return (
    <article className="rounded-2xl border-[1.5px] border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">
            Slot {data.slot} · {data.ownWallets} wallet(s) propre(s)
            {data.sharedWallets > 0 && ` · ${data.sharedWallets} commun(s)`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-xl font-semibold tabular-nums">{formatSol(totalLamports)}</p>
          <p className={cn("text-sm font-semibold tabular-nums", changeTone(totalDelta))}>{deltaLabel(totalDelta)}</p>
        </div>
      </div>

      {data.series.length > 1 ? (
        <BalanceSparkline
          points={data.series}
          label={`Évolution de ${name} : ${formatSol(data.series[0].lamports)} vers ${formatSol(data.series[data.series.length - 1].lamports)}`}
          className="my-2 h-16"
        />
      ) : (
        <p className="my-2 text-xs text-muted-foreground">Pas assez de transactions pour tracer une évolution.</p>
      )}

      <dl className="grid gap-1 text-xs">
        {data.ownWallets > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Wallets propres</dt>
            <dd className={cn("font-semibold tabular-nums", changeTone(data.own.deltaLamports))}>
              {formatSol(data.own.currentLamports)} · {deltaLabel(data.own.deltaLamports)}
            </dd>
          </div>
        )}
        {data.sharedWallets > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Dont wallet commun</dt>
            <dd className={cn("font-semibold tabular-nums", changeTone(data.shared.deltaLamports))}>
              {formatSol(data.shared.currentLamports)} · {deltaLabel(data.shared.deltaLamports)}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}
