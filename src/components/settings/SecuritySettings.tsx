import { useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import Badge from "@/components/shared/Badge";
import Button from "@/components/shared/Button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { EmptyState, GuardNotice } from "@/components/shared/Notices";
import { useNexus } from "@/hooks/useNexus";
import { useSessionHistory } from "@/hooks/useSessionLog";
import type { Role } from "@/lib/guards";
import { shortAddress } from "@/lib/utils";

const dateTime = (ts: number) =>
  new Date(ts).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const time = (ts: number) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

function roleLabel(role: Role) {
  if (role.isAuthority && role.isGuardian) return "Authority et guardian";
  if (role.isAuthority) return "Authority";
  if (role.isGuardian) return "Guardian";
  if (role.isPendingAuthority) return "Authority en attente d'acceptation";
  return "Aucun rôle sur nexus_access";
}

const NETWORK_LABEL = { ok: "Devnet", checking: "Vérification…", wrong: "Mauvais réseau", offline: "Hors ligne" } as const;

/** Current wallet session + connection log kept on this device. */
export default function SecuritySettings() {
  const { connected, publicKey, role, network, config } = useNexus();
  const { sessions, loading, error, clear } = useSessionHistory();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const current = connected ? sessions.find((s) => s.address === publicKey && !s.endedAt) : undefined;

  return (
    <div className="stack !gap-4" data-testid="security-settings">
      <div className="stack !gap-2">
        <p className="label">Session actuelle</p>
        {!connected ? (
          <GuardNotice>Aucun wallet connecté sur cet appareil.</GuardNotice>
        ) : (
          <dl className="grid gap-2 rounded-xl border-[1.5px] border-border p-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Wallet</dt>
              <dd className="font-mono font-semibold">{shortAddress(publicKey, 6)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Application</dt>
              <dd className="font-semibold">{current?.walletName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Réseau</dt>
              <dd className="font-semibold">{NETWORK_LABEL[network]}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Rôle on-chain</dt>
              <dd className="text-right font-semibold">{config ? roleLabel(role) : "Config non chargée"}</dd>
            </div>
            {current && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Connecté depuis</dt>
                <dd className="font-semibold">{dateTime(current.startedAt)}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <div className="stack !gap-2">
        <div className="flex items-end justify-between gap-3">
          <p className="label">Connexions sur cet appareil</p>
          {sessions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>
              Effacer l'historique
            </Button>
          )}
        </div>

        {error ? (
          <GuardNotice tone="danger">Lecture du journal local impossible : {error}</GuardNotice>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : sessions.length === 0 ? (
          <EmptyState title="Aucune connexion enregistrée">
            Les prochaines connexions de wallet sur cet appareil apparaîtront ici.
          </EmptyState>
        ) : (
          <ul className="stack !gap-2">
            {sessions.map((s) => {
              const isCurrent = s.id === current?.id;
              return (
                <li key={s.id} className="flex items-start gap-3 rounded-xl border-[1.5px] border-border px-3 py-2">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-sunken">
                    <MonitorSmartphone className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{s.device}</span>
                      {isCurrent && <Badge tone="success" dot>En cours</Badge>}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {s.walletName} · <span className="font-mono">{shortAddress(s.address)}</span> · {s.network}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {dateTime(s.startedAt)}
                      {isCurrent
                        ? ""
                        : s.endedAt
                          ? ` → déconnecté à ${time(s.endedAt)}`
                          : ` → dernière activité à ${time(s.lastSeenAt)}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Journal conservé sur cet appareil uniquement (20 dernières connexions). Ce n'est pas une piste d'audit : il peut être effacé par
          quiconque a accès à l'appareil et disparaît avec le profil du navigateur.
        </p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Effacer l'historique des connexions ?"
        description="Le journal de cet appareil sera vidé. Aucune transaction n'est signée, rien n'est modifié on-chain."
        confirmLabel="Effacer"
        tone="danger"
        onConfirm={() => clear().catch((e: unknown) => console.error("[sessions]", e))}
      />
    </div>
  );
}
