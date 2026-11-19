import { useState } from "react";
import { UserCheck } from "lucide-react";
import AuthoritySection from "@/components/admin/AuthoritySection";
import GuardianSection from "@/components/admin/GuardianSection";
import Button from "@/components/shared/Button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { ConnectPrompt, GuardNotice } from "@/components/shared/Notices";
import { useNexus } from "@/hooks/useNexus";
import { useOnChainAction } from "@/hooks/useOnChainAction";
import { canSeeAdministration, canSeeGuardianPause, networkReason } from "@/lib/guards";

export default function AdministrationScreen() {
  const { connected, network, role, client, config } = useNexus();
  const { run, pending } = useOnChainAction();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const netReason = networkReason(network);

  return (
    <div className="stack !gap-5 animate-rise">
      <div>
        <p className="eyebrow">Réservé</p>
        <h1 className="text-3xl font-bold">Administration</h1>
      </div>

      {!connected ? (
        <ConnectPrompt description="Seuls l'authority et le guardian du programme ont accès à cet écran." />
      ) : !canSeeAdministration(role) ? (
        <GuardNotice tone="danger">Ce wallet n'est ni l'authority ni le guardian de nexus_access : accès refusé.</GuardNotice>
      ) : (
        <>
          {netReason && network !== "checking" && <GuardNotice tone="danger">{netReason} Les actions sont bloquées.</GuardNotice>}

          {role.isPendingAuthority && (
            <section className="card stack border-secondary">
              <p className="eyebrow">Étape 2/2</p>
              <h2 className="text-xl font-semibold">Un transfert d'authority t'attend</h2>
              <p className="text-sm text-muted-foreground">En acceptant, ce wallet devient l'authority du programme ({config?.authority.slice(0, 4)}… perd ses droits).</p>
              <Button variant="secondary" size="lg" loading={pending === "accept"} onClick={() => setAcceptOpen(true)}>
                <UserCheck className="h-5 w-5" aria-hidden /> Accepter l'authority
              </Button>
              <ConfirmDialog
                open={acceptOpen}
                onOpenChange={setAcceptOpen}
                title="Accepter l'authority"
                loading={pending === "accept"}
                onConfirm={() => run("accept", "Authority acceptée", () => client.acceptAuthority(), { severity: "success" })}
              />
            </section>
          )}

          {role.isAuthority && <AuthoritySection />}
          {canSeeGuardianPause(role) && <GuardianSection />}
        </>
      )}
    </div>
  );
}
