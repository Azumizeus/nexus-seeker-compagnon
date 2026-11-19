import { useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import TradingAuthorizeDialog from "./TradingAuthorizeDialog";
import type { AgentTradingKeysApi, TradingKeyView } from "@/hooks/useAgentTradingKeys";
import { WALLET_MODE_LABELS, type WalletMode } from "@/lib/guards";
import { TRADING_MODE_HINTS, TRADING_RISK_CAP_MAX_USD, validateRiskCap } from "@/lib/tradingKeys";
import { cn } from "@/lib/utils";

const MODES: WalletMode[] = ["humanValidation", "agentAsks", "agentAuthorized"];

interface TradingKeyCardProps {
  tradingKey: TradingKeyView;
  agentName: string;
  trading: AgentTradingKeysApi;
  canEdit: boolean;
}

type Pending = { kind: "mode"; mode: WalletMode } | { kind: "authorize" } | { kind: "cap" } | { kind: "revoke" } | null;

export default function TradingKeyCard({ tradingKey: k, agentName, trading, canEdit }: TradingKeyCardProps) {
  const [cap, setCap] = useState(String(k.riskCapUsd));
  const [confirm, setConfirm] = useState<Pending>(null);

  const capUsd = Number(cap);
  const capError = validateRiskCap(capUsd);
  const busy = (kind: string) => trading.pending === `${kind}:${k.id}`;

  const pickMode = (m: WalletMode) => {
    if (m === k.mode) return;
    setConfirm(m === "agentAuthorized" ? { kind: "authorize" } : { kind: "mode", mode: m });
  };

  return (
    <article className={cn("rounded-2xl border-[1.5px] bg-surface p-4", k.overridden ? "border-danger" : "border-border")} data-testid="trading-key-card">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="violet">{k.platformName}</Badge>
        <Badge tone={k.effectiveMode === "agentAuthorized" ? "accent" : k.effectiveMode === "agentAsks" ? "violet" : "success"} dot>
          {WALLET_MODE_LABELS[k.effectiveMode]}
        </Badge>
        {k.overridden && <Badge tone="danger">Contrôle repris</Badge>}
        {k.demo && <Badge tone="warning">Donnée factice</Badge>}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-xl bg-surface-sunken px-3 py-2 font-mono text-sm">
          <KeyRound className="h-4 w-4" aria-hidden /> {k.keyHint}
        </span>
        <div className="text-right">
          <p className="label">Plafond de risque</p>
          <p className="font-display text-xl font-semibold tabular-nums">{k.riskCapUsd.toLocaleString("fr-FR")} $</p>
        </div>
      </div>

      <fieldset className="mt-4" disabled={!canEdit}>
        <legend className="label mb-2">Mode de trading</legend>
        <div className="grid gap-2">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => pickMode(m)}
              aria-pressed={k.mode === m}
              className={cn(
                "min-h-tap rounded-2xl border-2 px-3 py-2 text-left transition-colors disabled:cursor-not-allowed",
                k.mode === m ? "border-foreground bg-primary-soft" : "border-border hover:border-border-strong",
                m === "agentAuthorized" && k.mode === m && "bg-accent-soft",
              )}
            >
              <span className="block font-semibold">{WALLET_MODE_LABELS[m]}</span>
              <span className="block text-xs text-muted-foreground">{TRADING_MODE_HINTS[m]}</span>
            </button>
          ))}
        </div>
        {k.overridden && (
          <p className="mt-2 text-xs font-medium text-danger-ink">
            Trading autonome coupé. Mode enregistré : {WALLET_MODE_LABELS[k.mode]}, réappliqué quand l'autonomie sera rendue.
          </p>
        )}
      </fieldset>

      {canEdit && (
        <div className="mt-4 stack !gap-3">
          <div className="field">
            <label htmlFor={`tcap-${k.id}`} className="label">Plafond de risque ($) · max {TRADING_RISK_CAP_MAX_USD.toLocaleString("fr-FR")}</label>
            <div className="flex gap-2">
              <input
                id={`tcap-${k.id}`}
                inputMode="decimal"
                value={cap}
                onChange={(e) => setCap(e.target.value.replace(",", "."))}
                className="min-h-tap w-full min-w-0 rounded-2xl border-[1.5px] border-border-strong bg-surface px-4 outline-none focus:border-foreground"
              />
              <Button variant="outline" disabled={!!capError || capUsd === k.riskCapUsd} loading={busy("cap")} onClick={() => setConfirm({ kind: "cap" })}>
                Enregistrer
              </Button>
            </div>
            {capError && <p className="text-xs font-medium text-danger-ink">{capError}</p>}
          </div>
          <Button variant="danger-soft" loading={busy("revoke")} onClick={() => setConfirm({ kind: "revoke" })}>
            <Trash2 className="h-4 w-4" aria-hidden /> Révoquer la clé
          </Button>
        </div>
      )}

      {confirm?.kind === "authorize" && (
        <TradingAuthorizeDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          agentName={agentName}
          platformName={k.platformName}
          riskCapUsd={k.riskCapUsd}
          loading={busy("mode")}
          onConfirm={() => trading.setMode(k, "agentAuthorized", true)}
        />
      )}

      <ConfirmDialog
        open={confirm?.kind === "mode" || confirm?.kind === "cap" || confirm?.kind === "revoke"}
        onOpenChange={(o) => !o && setConfirm(null)}
        tone={confirm?.kind === "revoke" ? "danger" : "default"}
        title={
          confirm?.kind === "mode"
            ? `Passer en « ${WALLET_MODE_LABELS[confirm.mode]} »`
            : confirm?.kind === "cap"
              ? `Plafond de risque : ${capUsd.toLocaleString("fr-FR")} $`
              : `Révoquer la clé ${k.platformName}`
        }
        description={confirm?.kind === "revoke" ? "Le serveur efface la clé chiffrée. Pense aussi à la supprimer sur la plateforme." : undefined}
        confirmLabel={confirm?.kind === "revoke" ? "Révoquer" : "Confirmer"}
        loading={busy("mode") || busy("cap") || busy("revoke")}
        onConfirm={() => {
          if (confirm?.kind === "mode") return trading.setMode(k, confirm.mode);
          if (confirm?.kind === "cap") return trading.setRiskCap(k, capUsd);
          return trading.revoke(k);
        }}
      />
    </article>
  );
}
