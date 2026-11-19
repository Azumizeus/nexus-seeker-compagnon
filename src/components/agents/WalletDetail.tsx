import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { ExternalLink, RefreshCw } from "lucide-react";
import Modal from "@/components/shared/Modal";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import AddressChip from "@/components/shared/AddressChip";
import AgentAvatar from "@/components/shared/AgentAvatar";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { GuardNotice } from "@/components/shared/Notices";
import BalanceSparkline from "./BalanceSparkline";
import { useNexus } from "@/hooks/useNexus";
import type { useAgentWallets, AgentWalletView } from "@/hooks/useAgentWallets";
import { WALLET_MODE_HINTS, WALLET_MODE_LABELS, type WalletMode } from "@/lib/guards";
import type { Agent } from "@/lib/models";
import { explorerTxUrl } from "@/lib/solana";
import { cn, formatRelative, formatSol } from "@/lib/utils";
import {
  balanceDelta,
  buildBalanceSeries,
  orderedAccountKeys,
  resolveAccountIndex,
  type WalletTxPoint,
} from "@/lib/walletSeries";

const MODES: WalletMode[] = ["humanValidation", "agentAsks", "agentAuthorized"];
const TX_LIMIT = 10;

interface WalletTxRow extends WalletTxPoint {
  failed: boolean;
}

interface WalletDetailProps {
  wallet: AgentWalletView;
  agents: Agent[];
  api: ReturnType<typeof useAgentWallets>;
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * One agent wallet in full: balance, spending room, mode and the transactions
 * the balance series is rebuilt from. Everything comes from the chain; nothing
 * is simulated.
 */
export default function WalletDetail({ wallet, agents, api, canEdit, open, onOpenChange }: WalletDetailProps) {
  const { client, chainTick } = useNexus();
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmMode, setConfirmMode] = useState<WalletMode | null>(null);

  // The snapshot carries the key it was fetched for, so a wallet switch or a
  // refresh reads as "loading" without setting state inside the effect.
  const requestKey = `${wallet.walletPubkey}:${chainTick}:${reloadKey}`;
  const [snapshot, setSnapshot] = useState<{ key: string; status: "ready" | "error"; rows: WalletTxRow[] } | null>(null);
  const fresh = snapshot?.key === requestKey ? snapshot : null;
  const rows = useMemo(() => fresh?.rows ?? [], [fresh]);
  const loading = open && !fresh;
  const error = fresh?.status === "error";

  useEffect(() => {
    if (!open) return;
    let alive = true;

    const load = async () => {
      const signatures = await client.connection.getSignaturesForAddress(new PublicKey(wallet.walletPubkey), {
        limit: TX_LIMIT,
      });
      if (signatures.length === 0) return [];
      const parsed = await client.connection.getParsedTransactions(
        signatures.map((s) => s.signature),
        { commitment: "confirmed", maxSupportedTransactionVersion: 0 },
      );
      return signatures.map((info, index) => {
        const tx = parsed[index];
        const meta = tx?.meta;
        const message = tx?.transaction.message;
        const loaded = meta?.loadedAddresses;
        const keys = message
          ? orderedAccountKeys(
              message.accountKeys.map((key) => key.pubkey.toBase58()),
              loaded
                ? {
                    writable: loaded.writable.map((key) => key.toBase58()),
                    readonly: loaded.readonly.map((key) => key.toBase58()),
                  }
                : null,
            )
          : [];
        const position = resolveAccountIndex(keys, wallet.walletPubkey);
        const delta = position < 0 ? 0 : balanceDelta(meta?.preBalances[position], meta?.postBalances[position]);
        return {
          signature: info.signature,
          blockTime: info.blockTime ?? null,
          deltaLamports: delta,
          failed: Boolean(info.err),
        } satisfies WalletTxRow;
      });
    };

    load()
      .then((next) => {
        if (alive) setSnapshot({ key: requestKey, status: "ready", rows: next });
      })
      .catch((e: unknown) => {
        console.error("[wallet detail]", e);
        if (alive) setSnapshot({ key: requestKey, status: "error", rows: [] });
      });

    return () => {
      alive = false;
    };
  }, [open, client, wallet.walletPubkey, chainTick, reloadKey, requestKey]);

  const series = useMemo(
    () => buildBalanceSeries(wallet.balanceLamports ?? 0, rows, { limit: TX_LIMIT + 1 }),
    [wallet.balanceLamports, rows],
  );
  const variation = series.length > 1 ? series[series.length - 1].lamports - series[0].lamports : 0;
  const remaining = Math.max(0, wallet.spendCapLamports - wallet.spentLamports);
  const usedPct = wallet.spendCapLamports > 0 ? Math.min(100, (wallet.spentLamports / wallet.spendCapLamports) * 100) : 0;
  const assigned = wallet.isShared
    ? agents.filter((a) => (wallet.assignedAgentsMask & (1 << a.slot)) !== 0)
    : agents.filter((a) => a.slot === wallet.agentId);
  const pending = api.pending === `mode:${wallet.address}`;

  return (
    <>
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={wallet.isShared ? `Wallet commun #${wallet.walletIndex}` : `Wallet #${wallet.walletIndex}`}
        description="Registre on-chain · devnet"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={wallet.effectiveMode === "agentAuthorized" ? "accent" : wallet.effectiveMode === "agentAsks" ? "violet" : "success"}
            dot
          >
            {WALLET_MODE_LABELS[wallet.effectiveMode]}
          </Badge>
          {wallet.overridden && <Badge tone="danger">Contrôle repris</Badge>}
          <Badge tone="neutral">{assigned.length === 0 ? "Aucun agent" : `${assigned.length} agent(s)`}</Badge>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label">Solde</p>
            <p className="font-display text-3xl font-semibold tabular-nums">{formatSol(wallet.balanceLamports)}</p>
          </div>
          <AddressChip address={wallet.walletPubkey} />
        </div>

        {assigned.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {assigned.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1 rounded-full bg-surface-sunken py-0.5 pl-0.5 pr-2 text-sm font-medium"
              >
                <AgentAvatar name={a.name} slot={a.slot} size="sm" className="!h-6 !w-6 !rounded-full text-[0.6rem]" />
                {a.name}
              </span>
            ))}
          </div>
        )}

        <div className="stack !gap-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Dépensé</span>
            <span className="font-semibold tabular-nums">
              {formatSol(wallet.spentLamports)} / {formatSol(wallet.spendCapLamports)}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
            <div
              className={cn("h-full rounded-full", usedPct >= 100 ? "bg-danger" : "bg-accent")}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Reste disponible</span>
            <span className="font-semibold tabular-nums">{formatSol(remaining)}</span>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-surface-sunken p-3" aria-busy={loading}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="label">Évolution du solde</p>
            {series.length > 1 && (
              <p className={cn("text-sm font-semibold tabular-nums", variation < 0 ? "text-danger-ink" : "text-primary-ink")}>
                {variation < 0 ? "−" : "+"}
                {formatSol(Math.abs(variation), 3)}
              </p>
            )}
            <Button variant="ghost" size="sm" onClick={() => setReloadKey((k) => k + 1)} loading={loading} aria-label="Actualiser l'historique">
              {!loading && <RefreshCw className="h-4 w-4" aria-hidden />}
            </Button>
          </div>

          {error ? (
            <p className="text-sm text-muted-foreground">Historique indisponible.</p>
          ) : loading && rows.length === 0 ? (
            <div className="h-24 animate-pulse rounded-xl bg-surface" aria-hidden />
          ) : series.length > 1 ? (
            <>
              <BalanceSparkline
                points={series}
                label={`Évolution du solde sur ${rows.length} transactions, de ${formatSol(series[0].lamports)} à ${formatSol(series[series.length - 1].lamports)}`}
                className="my-1"
              />
              <p className="text-xs text-muted-foreground">
                Reconstitué à partir des {rows.length} dernières transactions du wallet.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Pas assez de transactions pour tracer une évolution.</p>
          )}
        </section>

        <fieldset disabled={!canEdit}>
          <legend className="label mb-2">Mode</legend>
          <div className="grid gap-2">
            {MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => mode !== wallet.mode && setConfirmMode(mode)}
                aria-pressed={wallet.mode === mode}
                className={cn(
                  "min-h-tap rounded-2xl border-2 px-3 py-2 text-left transition-colors disabled:cursor-not-allowed",
                  wallet.mode === mode ? "border-foreground bg-primary-soft" : "border-border hover:border-border-strong",
                  mode === "agentAuthorized" && wallet.mode === mode && "bg-accent-soft",
                )}
              >
                <span className="block font-semibold">{WALLET_MODE_LABELS[mode]}</span>
                <span className="block text-xs text-muted-foreground">{WALLET_MODE_HINTS[mode]}</span>
              </button>
            ))}
          </div>
          {wallet.overridden && (
            <p className="mt-2 text-xs font-medium text-danger-ink">
              Mode enregistré : {WALLET_MODE_LABELS[wallet.mode]}. Il s'appliquera de nouveau quand l'authority rendra l'autonomie.
            </p>
          )}
        </fieldset>

        <section className="stack !gap-1">
          <p className="label">Transactions</p>
          {error ? (
            <p className="text-sm text-muted-foreground">Historique indisponible.</p>
          ) : loading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune transaction pour ce wallet.</p>
          ) : (
            rows.map((row) => (
              <a
                key={row.signature}
                href={explorerTxUrl(row.signature)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-tap items-center gap-2 rounded-xl px-2 text-sm hover:bg-surface-sunken"
              >
                <span className={row.failed ? "font-semibold text-danger-ink" : "font-semibold text-primary-ink"}>
                  {row.failed ? "Échec" : "OK"}
                </span>
                <span className="font-mono text-xs">{row.signature.slice(0, 10)}…</span>
                <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {row.deltaLamports === 0 ? "—" : `${row.deltaLamports > 0 ? "+" : "−"}${formatSol(Math.abs(row.deltaLamports), 3)}`}
                </span>
                <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                  {row.blockTime ? formatRelative(row.blockTime * 1_000) : "—"}
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </a>
            ))
          )}
        </section>
      </Modal>

      <ConfirmDialog
        open={confirmMode !== null}
        onOpenChange={(next) => !next && setConfirmMode(null)}
        title={confirmMode ? `Passer en « ${WALLET_MODE_LABELS[confirmMode]} »` : ""}
        tone={confirmMode === "agentAuthorized" ? "danger" : "default"}
        loading={pending}
        onConfirm={async () => {
          if (!confirmMode) return false;
          return api.setMode(wallet, confirmMode);
        }}
      >
        {confirmMode === "agentAuthorized" && (
          <GuardNotice tone="danger">
            L'agent pourra signer seul avec ce wallet, sans te demander, jusqu'au plafond de{" "}
            {formatSol(wallet.spendCapLamports)}. Une alerte s'affichera à chaque signature.
          </GuardNotice>
        )}
        <p className="text-sm text-muted-foreground">Transaction signée dans ton wallet (authority), sur devnet.</p>
      </ConfirmDialog>
    </>
  );
}
