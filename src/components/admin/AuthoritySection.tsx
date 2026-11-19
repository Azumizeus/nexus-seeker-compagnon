import { useState } from "react";
import { OctagonPause, Play, Unlock } from "lucide-react";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import AddressChip from "@/components/shared/AddressChip";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { GuardNotice } from "@/components/shared/Notices";
import LimitsForm from "./LimitsForm";
import { useNexus } from "@/hooks/useNexus";
import { useOnChainAction } from "@/hooks/useOnChainAction";
import { cn, isValidPubkeyString } from "@/lib/utils";

type Pending =
  | { kind: "pause" }
  | { kind: "unpause" }
  | { kind: "guardian" }
  | { kind: "propose" }
  | { kind: "release" }
  | null;

const inputClass =
  "min-h-tap w-full min-w-0 rounded-2xl border-[1.5px] border-border-strong bg-surface px-4 font-mono text-sm outline-none focus:border-foreground";

/** Authority tools: pause/relaunch, guardian, 2-step authority transfer, limits, release control. */
export default function AuthoritySection() {
  const { client, config } = useNexus();
  const { run, pending } = useOnChainAction();
  const [guardian, setGuardian] = useState("");
  const [newAuthority, setNewAuthority] = useState("");
  const [confirm, setConfirm] = useState<Pending>(null);

  if (!config) return null;

  const onConfirm = () => {
    switch (confirm?.kind) {
      case "pause":
        return run("pause", "Programme mis en pause", () => client.pause(), { severity: "danger" });
      case "unpause":
        return run("unpause", "Programme relancé", () => client.unpause(), { severity: "success" });
      case "guardian":
        return run("guardian", "Guardian modifié", () => client.setGuardian(guardian.trim()), { detail: guardian.trim() });
      case "propose":
        return run("propose", "Transfert d'authority proposé", () => client.proposeAuthority(newAuthority.trim()), {
          detail: newAuthority.trim(),
          severity: "alert",
        });
      case "release":
        return run("release", "Autonomie rendue aux agents", () => client.releaseControl());
      default:
        return undefined;
    }
  };

  const titles: Record<NonNullable<Pending>["kind"], string> = {
    pause: "Mettre le programme en pause",
    unpause: "Relancer le programme",
    guardian: "Changer le guardian",
    propose: "Proposer une nouvelle authority (étape 1/2)",
    release: "Rendre l'autonomie à tous les agents",
  };

  return (
    <section className="card stack !gap-6" aria-labelledby="authority-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Tu es l'authority</p>
          <h2 id="authority-title" className="text-2xl font-semibold">
            Section Authority
          </h2>
        </div>
        <Badge tone={config.paused ? "danger" : "success"} dot>
          {config.paused ? "En pause" : "Actif"}
        </Badge>
      </div>

      {/* Pause / relaunch */}
      <div className="stack !gap-2">
        <p className="label">État du programme (paused)</p>
        {config.paused ? (
          <Button variant="primary" size="lg" loading={pending === "unpause"} onClick={() => setConfirm({ kind: "unpause" })}>
            <Play className="h-5 w-5" aria-hidden /> Relancer le programme
          </Button>
        ) : (
          <Button variant="danger" size="lg" loading={pending === "pause"} onClick={() => setConfirm({ kind: "pause" })}>
            <OctagonPause className="h-5 w-5" aria-hidden /> Mettre en pause
          </Button>
        )}
      </div>

      {/* Release control */}
      {(config.globalOverride || config.agentOverrideMask !== 0) && (
        <div className="stack !gap-2 rounded-2xl border-2 border-danger bg-danger-soft p-4">
          <p className="font-semibold text-danger-ink">
            Contrôle repris {config.globalOverride ? "sur tous les agents" : "sur certains agents"}.
          </p>
          {config.globalOverride && (
            <Button variant="outline" loading={pending === "release"} onClick={() => setConfirm({ kind: "release" })}>
              <Unlock className="h-4 w-4" aria-hidden /> Rendre l'autonomie (global)
            </Button>
          )}
          {!config.globalOverride && <p className="text-sm">Rends l'autonomie agent par agent depuis l'écran Agents & Wallets.</p>}
        </div>
      )}

      {/* Guardian */}
      <div className="field">
        <label htmlFor="guardian-input" className="label">
          Guardian
        </label>
        <AddressChip address={config.guardian} label="Actuel" />
        <div className="flex gap-2">
          <input id="guardian-input" value={guardian} onChange={(e) => setGuardian(e.target.value)} placeholder="Nouvelle adresse guardian" className={inputClass} spellCheck={false} />
          <Button
            variant="outline"
            disabled={!isValidPubkeyString(guardian.trim()) || guardian.trim() === config.guardian}
            loading={pending === "guardian"}
            onClick={() => setConfirm({ kind: "guardian" })}
          >
            Changer
          </Button>
        </div>
      </div>

      {/* Authority transfer */}
      <div className="field">
        <p className="label">Transfert d'authority en 2 étapes</p>
        <ol className="grid gap-2 sm:grid-cols-2">
          <li className={cn("rounded-2xl border-2 p-3", config.pendingAuthority ? "border-border" : "border-foreground")}>
            <p className="font-semibold">1. Tu proposes</p>
            <p className="text-sm text-muted-foreground">L'adresse est enregistrée comme « en attente ».</p>
          </li>
          <li className={cn("rounded-2xl border-2 p-3", config.pendingAuthority ? "border-foreground" : "border-border")}>
            <p className="font-semibold">2. Le nouveau wallet accepte</p>
            <p className="text-sm text-muted-foreground">Il se connecte ici et signe l'acceptation.</p>
          </li>
        </ol>
        {config.pendingAuthority && <AddressChip address={config.pendingAuthority} label="En attente" />}
        <div className="flex gap-2">
          <input
            id="authority-input"
            aria-label="Nouvelle authority"
            value={newAuthority}
            onChange={(e) => setNewAuthority(e.target.value)}
            placeholder="Adresse de la nouvelle authority"
            className={inputClass}
            spellCheck={false}
          />
          <Button
            variant="outline"
            disabled={!isValidPubkeyString(newAuthority.trim()) || newAuthority.trim() === config.authority}
            loading={pending === "propose"}
            onClick={() => setConfirm({ kind: "propose" })}
          >
            Proposer
          </Button>
        </div>
      </div>

      {/* Limits */}
      <div className="stack !gap-2">
        <p className="label">Limites globales</p>
        <LimitsForm />
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm ? titles[confirm.kind] : ""}
        tone={confirm?.kind === "pause" || confirm?.kind === "propose" ? "danger" : "default"}
        loading={!!pending}
        onConfirm={onConfirm}
      >
        {confirm?.kind === "propose" && (
          <GuardNotice tone="danger">
            Vérifie l'adresse caractère par caractère. Une fois acceptée, ce wallet contrôlera tout le registre des wallets agent.
          </GuardNotice>
        )}
        {confirm?.kind === "pause" && <p className="text-sm">Bloque les nouvelles dépenses et les nouveaux wallets agent.</p>}
        <p className="text-sm text-muted-foreground">Transaction signée dans ton wallet, sur devnet.</p>
      </ConfirmDialog>
    </section>
  );
}
