import { useState } from "react";
import Button from "@/components/shared/Button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { GuardNotice } from "@/components/shared/Notices";
import { useNexus } from "@/hooks/useNexus";
import { useOnChainAction } from "@/hooks/useOnChainAction";
import { canSignOnChain } from "@/lib/guards";
import { ALLOWED_PER_AGENT_LIMITS } from "@/lib/solana";
import { cn, formatSol, lamportsToSol } from "@/lib/utils";

type Pending = { kind: "perAgent"; value: number } | { kind: "cap" } | { kind: "resetGlobal" } | null;

/**
 * On-chain limits: global spend cap (default 2 SOL) and max wallets per agent.
 * Editable by the authority only; read-only for everyone else.
 */
export default function LimitsForm() {
  const { client, config, role, connected, network } = useNexus();
  const { run, pending } = useOnChainAction();
  const [cap, setCap] = useState(() => String(lamportsToSol(config?.globalSpendCapLamports ?? 2_000_000_000)));
  const [confirm, setConfirm] = useState<Pending>(null);

  const editable = role.isAuthority && canSignOnChain({ connected, network }).allowed;
  const capSol = Number(cap);
  const capInvalid = !Number.isFinite(capSol) || capSol < 0;

  const onConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === "perAgent")
      return run("per-agent", `Limite par agent : ${confirm.value}`, () => client.setMaxWalletsPerAgent(confirm.value));
    if (confirm.kind === "cap") return run("global-cap", `Plafond global : ${capSol} SOL`, () => client.setGlobalSpendCap(capSol));
    return run("reset-global", "Compteur global remis à zéro", () => client.resetGlobalSpent());
  };

  if (!config) return <p className="text-sm text-muted-foreground">Config non chargée.</p>;

  return (
    <div className="stack">
      {!editable && <GuardNotice>Modifiable uniquement par l'authority du programme, wallet connecté sur Devnet.</GuardNotice>}

      <fieldset disabled={!editable}>
        <legend className="label mb-2">Wallets max par agent</legend>
        <div className="grid grid-cols-4 gap-2">
          {ALLOWED_PER_AGENT_LIMITS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={config.maxWalletsPerAgent === n}
              onClick={() => n !== config.maxWalletsPerAgent && setConfirm({ kind: "perAgent", value: n })}
              className={cn(
                "min-h-[52px] rounded-2xl border-2 font-display text-lg font-semibold disabled:cursor-not-allowed",
                config.maxWalletsPerAgent === n ? "border-foreground bg-primary text-primary-foreground shadow-pop" : "border-border",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Baisser la limite ne supprime aucun wallet existant : elle bloque seulement les nouveaux.</p>
      </fieldset>

      <div className="field">
        <label htmlFor="global-cap" className="label">
          Plafond global des wallets agent (SOL)
        </label>
        <div className="flex gap-2">
          <input
            id="global-cap"
            inputMode="decimal"
            disabled={!editable}
            value={cap}
            onChange={(e) => setCap(e.target.value.replace(",", "."))}
            className="min-h-tap w-full min-w-0 rounded-2xl border-[1.5px] border-border-strong bg-surface px-4 outline-none focus:border-foreground disabled:opacity-60"
          />
          <Button
            variant="outline"
            disabled={!editable || capInvalid || capSol === lamportsToSol(config.globalSpendCapLamports)}
            loading={pending === "global-cap"}
            onClick={() => setConfirm({ kind: "cap" })}
          >
            Enregistrer
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Dépensé : <strong>{formatSol(config.globalSpentLamports)}</strong> sur {formatSol(config.globalSpendCapLamports)} · par défaut 2 SOL
        </p>
      </div>

      {editable && (
        <Button variant="outline" className="self-start" disabled={config.globalSpentLamports === 0} loading={pending === "reset-global"} onClick={() => setConfirm({ kind: "resetGlobal" })}>
          Remettre le compteur global à zéro
        </Button>
      )}

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.kind === "perAgent"
            ? `Limite par agent : ${confirm.value} wallet(s)`
            : confirm?.kind === "cap"
              ? `Plafond global : ${capSol} SOL`
              : "Remettre le compteur global à zéro"
        }
        description="Transaction signée dans ton wallet (authority), sur devnet."
        loading={!!pending}
        onConfirm={onConfirm}
      />
    </div>
  );
}
