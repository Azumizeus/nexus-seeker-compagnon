import { useState } from "react";
import { ChevronDown, History, Info, RotateCcw, Trash2 } from "lucide-react";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import AddressChip from "@/components/shared/AddressChip";
import AgentAvatar from "@/components/shared/AgentAvatar";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { GuardNotice } from "@/components/shared/Notices";
import WalletHistory from "./WalletHistory";
import WalletDetail from "./WalletDetail";
import type { useAgentWallets, AgentWalletView } from "@/hooks/useAgentWallets";
import { useNexus } from "@/hooks/useNexus";
import { WALLET_MODE_HINTS, WALLET_MODE_LABELS, type WalletMode } from "@/lib/guards";
import type { Agent } from "@/lib/models";
import { MAX_AGENTS } from "@/lib/appConfig";
import { cn, formatSol, lamportsToSol } from "@/lib/utils";

type WalletsApi = ReturnType<typeof useAgentWallets>;
const MODES: WalletMode[] = ["humanValidation", "agentAsks", "agentAuthorized"];

interface WalletCardProps {
  wallet: AgentWalletView;
  agents: Agent[];
  api: WalletsApi;
  canEdit: boolean;
}

type Pending = { kind: "mode"; mode: WalletMode } | { kind: "cap" } | { kind: "reset" } | { kind: "revoke" } | { kind: "assign" } | null;

export default function WalletCard({ wallet, agents, api, canEdit }: WalletCardProps) {
  const { config } = useNexus();
  const [cap, setCap] = useState(String(lamportsToSol(wallet.spendCapLamports)));
  const [mask, setMask] = useState(wallet.assignedAgentsMask);
  const [confirm, setConfirm] = useState<Pending>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const capSol = Number(cap);
  const globalCapSol = lamportsToSol(config?.globalSpendCapLamports ?? 0);
  const capInvalid = !Number.isFinite(capSol) || capSol < 0 || capSol > globalCapSol;
  const usedPct = wallet.spendCapLamports > 0 ? Math.min(100, (wallet.spentLamports / wallet.spendCapLamports) * 100) : 0;
  const assigned = wallet.isShared ? agents.filter((a) => (wallet.assignedAgentsMask & (1 << a.slot)) !== 0) : agents.filter((a) => a.slot === wallet.agentId);
  const k = (key: string) => api.pending === `${key}:${wallet.address}`;

  const runConfirmed = async () => {
    if (!confirm) return;
    if (confirm.kind === "mode") return api.setMode(wallet, confirm.mode);
    if (confirm.kind === "cap") return api.setSpendCap(wallet, capSol);
    if (confirm.kind === "reset") return api.resetSpent(wallet);
    if (confirm.kind === "assign") return api.assignShared(wallet, mask);
    return api.revoke(wallet);
  };

  const confirmTitle =
    confirm?.kind === "mode"
      ? `Passer en « ${WALLET_MODE_LABELS[confirm.mode]} »`
      : confirm?.kind === "cap"
        ? `Plafond : ${capSol} SOL`
        : confirm?.kind === "reset"
          ? "Remettre le compteur à zéro"
          : confirm?.kind === "assign"
            ? "Réassigner le wallet commun"
            : "Révoquer ce wallet agent";

  return (
    <article className={cn("rounded-2xl border-[1.5px] bg-surface p-4", wallet.overridden ? "border-danger" : "border-border")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={wallet.isShared ? "violet" : "neutral"}>{wallet.isShared ? `Commun #${wallet.walletIndex}` : `Wallet #${wallet.walletIndex}`}</Badge>
        <Badge tone={wallet.effectiveMode === "agentAuthorized" ? "accent" : wallet.effectiveMode === "agentAsks" ? "violet" : "success"} dot>
          {WALLET_MODE_LABELS[wallet.effectiveMode]}
        </Badge>
        {wallet.overridden && <Badge tone="danger">Contrôle repris</Badge>}
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <AddressChip address={wallet.walletPubkey} label="Wallet" />
        <div className="text-right">
          <p className="label">Solde</p>
          <p className="font-display text-xl font-semibold tabular-nums">{formatSol(wallet.balanceLamports)}</p>
        </div>
      </div>

      {wallet.isShared && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-sm text-muted-foreground">Assigné à :</span>
          {assigned.length === 0 && <span className="text-sm font-medium">aucun agent</span>}
          {assigned.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-surface-sunken py-0.5 pl-0.5 pr-2 text-sm font-medium">
              <AgentAvatar name={a.name} slot={a.slot} size="sm" className="!h-6 !w-6 !rounded-full text-[0.6rem]" />
              {a.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 stack !gap-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Dépensé</span>
          <span className="font-semibold tabular-nums">
            {formatSol(wallet.spentLamports)} / {formatSol(wallet.spendCapLamports)}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
          <div className={cn("h-full rounded-full", usedPct >= 100 ? "bg-danger" : "bg-accent")} style={{ width: `${usedPct}%` }} />
        </div>
      </div>

      <fieldset className="mt-4" disabled={!canEdit}>
        <legend className="label mb-2">Mode</legend>
        <div className="grid gap-2">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => m !== wallet.mode && setConfirm({ kind: "mode", mode: m })}
              aria-pressed={wallet.mode === m}
              className={cn(
                "min-h-tap rounded-2xl border-2 px-3 py-2 text-left transition-colors disabled:cursor-not-allowed",
                wallet.mode === m ? "border-foreground bg-primary-soft" : "border-border hover:border-border-strong",
                m === "agentAuthorized" && wallet.mode === m && "bg-accent-soft",
              )}
            >
              <span className="block font-semibold">{WALLET_MODE_LABELS[m]}</span>
              <span className="block text-xs text-muted-foreground">{WALLET_MODE_HINTS[m]}</span>
            </button>
          ))}
        </div>
        {wallet.overridden && (
          <p className="mt-2 text-xs font-medium text-danger-ink">
            Mode enregistré : {WALLET_MODE_LABELS[wallet.mode]}. Il s'appliquera de nouveau quand l'authority rendra l'autonomie.
          </p>
        )}
      </fieldset>

      {canEdit && (
        <div className="mt-4 stack !gap-3">
          <div className="field">
            <label htmlFor={`cap-${wallet.address}`} className="label">
              Plafond de dépense (SOL) · max {globalCapSol}
            </label>
            <div className="flex gap-2">
              <input
                id={`cap-${wallet.address}`}
                inputMode="decimal"
                value={cap}
                onChange={(e) => setCap(e.target.value.replace(",", "."))}
                className="min-h-tap w-full min-w-0 rounded-2xl border-[1.5px] border-border-strong bg-surface px-4 outline-none focus:border-foreground"
              />
              <Button variant="outline" disabled={capInvalid || capSol === lamportsToSol(wallet.spendCapLamports)} loading={k("cap")} onClick={() => setConfirm({ kind: "cap" })}>
                Enregistrer
              </Button>
            </div>
            {capInvalid && <p className="text-xs font-medium text-danger-ink">Doit être entre 0 et le plafond global ({globalCapSol} SOL).</p>}
          </div>

          {wallet.isShared && (
            <fieldset>
              <legend className="label mb-2">Agents assignés</legend>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: MAX_AGENTS }, (_, slot) => {
                  const agent = agents.find((a) => a.slot === slot);
                  const on = (mask & (1 << slot)) !== 0;
                  return (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setMask((m) => m ^ (1 << slot))}
                      className={cn("min-h-tap rounded-xl border-2 px-3 text-sm font-semibold", on ? "border-foreground bg-secondary-soft" : "border-border text-muted-foreground")}
                    >
                      {agent?.name ?? `#${slot}`}
                    </button>
                  );
                })}
              </div>
              <Button className="mt-2" variant="outline" disabled={mask === wallet.assignedAgentsMask} loading={k("assign")} onClick={() => setConfirm({ kind: "assign" })}>
                Enregistrer l'assignation
              </Button>
            </fieldset>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConfirm({ kind: "reset" })} loading={k("reset")} disabled={wallet.spentLamports === 0}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Remettre à zéro
            </Button>
            <Button variant="danger-soft" onClick={() => setConfirm({ kind: "revoke" })} loading={k("revoke")}>
              <Trash2 className="h-4 w-4" aria-hidden /> Révoquer
            </Button>
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="flex min-h-tap items-center gap-2 rounded-xl px-2 text-sm font-semibold hover:bg-surface-sunken"
        >
          <Info className="h-4 w-4" aria-hidden /> Détails
        </button>
        <button
          type="button"
          onClick={() => setShowHistory((s) => !s)}
          aria-expanded={showHistory}
          className="flex min-h-tap items-center gap-2 rounded-xl px-2 text-sm font-semibold hover:bg-surface-sunken"
        >
          <History className="h-4 w-4" aria-hidden /> Historique
          <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", showHistory && "rotate-180")} aria-hidden />
        </button>
      </div>
      {showHistory && <WalletHistory walletPubkey={wallet.walletPubkey} />}

      <WalletDetail
        wallet={wallet}
        agents={agents}
        api={api}
        canEdit={canEdit}
        open={showDetail}
        onOpenChange={setShowDetail}
      />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirmTitle}
        tone={confirm?.kind === "revoke" || (confirm?.kind === "mode" && confirm.mode === "agentAuthorized") ? "danger" : "default"}
        loading={!!api.pending}
        onConfirm={runConfirmed}
      >
        {confirm?.kind === "mode" && confirm.mode === "agentAuthorized" && (
          <GuardNotice tone="danger">
            L'agent pourra signer seul avec ce wallet, sans te demander, jusqu'au plafond de {formatSol(wallet.spendCapLamports)}. Une alerte s'affichera à chaque signature.
          </GuardNotice>
        )}
        {confirm?.kind === "revoke" && (
          <GuardNotice tone="danger">Le wallet est retiré du registre. La clé côté serveur ne sera plus autorisée à signer pour l'agent.</GuardNotice>
        )}
        <p className="text-sm text-muted-foreground">Transaction signée dans ton wallet (authority), sur devnet.</p>
      </ConfirmDialog>
    </article>
  );
}
