import { useState } from "react";
import { Hand } from "lucide-react";
import Button from "./Button";
import ConfirmDialog from "./ConfirmDialog";
import { GuardNotice } from "./Notices";
import { useNexus } from "@/hooks/useNexus";
import { useTakeBackControl } from "@/hooks/useTakeBackControl";
import { canSignOnChain } from "@/lib/guards";
import { cn } from "@/lib/utils";

interface TakeControlButtonProps {
  /** On-chain agent slot — omit for the global button. */
  slot?: number;
  agentId?: string;
  agentName?: string;
  compact?: boolean;
  className?: string;
}

/**
 * "Reprendre la main" — always visible, red, one tap.
 * Global: take_back_control (every agent wallet → human validation).
 * Per agent: take_back_control_for_agent(slot).
 */
export default function TakeControlButton({ slot, agentId, agentName, compact, className }: TakeControlButtonProps) {
  const { connected, network, openWalletPicker } = useNexus();
  const control = useTakeBackControl();
  const [open, setOpen] = useState(false);

  const isAgent = slot !== undefined;
  const active = isAgent ? control.isAgentOverridden(slot) : control.globalActive;
  const pendingKey = isAgent ? `take-back:${slot}` : "take-back";
  const guard = canSignOnChain({ connected, network });

  const label = active ? "Contrôle repris" : "Reprendre la main";

  return (
    <>
      <Button
        variant={active ? "danger-soft" : "danger"}
        size={compact ? "icon" : "md"}
        className={cn(compact && "sm:w-auto sm:px-4", className)}
        onClick={() => (connected ? setOpen(true) : openWalletPicker())}
        aria-label={isAgent ? `${label} : ${agentName ?? "agent"}` : label}
        data-testid={isAgent ? `take-control-${slot}` : "take-control-global"}
      >
        <Hand className="h-5 w-5 shrink-0" aria-hidden />
        <span className={cn(compact && "sr-only sm:not-sr-only")}>{label}</span>
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        title={isAgent ? `Reprendre la main sur ${agentName ?? "cet agent"}` : "Reprendre la main sur tous les agents"}
        description={
          isAgent
            ? "Tous les wallets de cet agent (et les wallets communs qui lui sont assignés) repassent immédiatement en validation humaine."
            : "Tous les wallets agent repassent immédiatement en « Validation humaine requise », quel que soit leur mode."
        }
        confirmLabel="Reprendre la main maintenant"
        loading={control.pending === pendingKey}
        onConfirm={() => (isAgent ? control.takeBackAgent(slot, agentId) : control.takeBackAll())}
      >
        {active && <GuardNotice>Le contrôle est déjà repris. Seule l'authority peut rendre l'autonomie.</GuardNotice>}
        {!control.allowed && (
          <GuardNotice tone="danger">
            Ce wallet n'est ni l'authority ni le guardian du programme : le programme refusera la signature.
          </GuardNotice>
        )}
        {!guard.allowed && guard.reason && <GuardNotice tone="danger">{guard.reason}</GuardNotice>}
        <p className="text-sm text-muted-foreground">
          Un seul enregistrement on-chain : l'interrupteur de la Config prend effet pour tous les wallets concernés en même temps.
          Les modes enregistrés ne sont pas effacés.
        </p>
      </ConfirmDialog>
    </>
  );
}
