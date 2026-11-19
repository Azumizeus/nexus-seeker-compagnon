import { useState } from "react";
import Modal from "@/components/shared/Modal";
import Button from "@/components/shared/Button";

interface TradingAuthorizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  platformName: string;
  riskCapUsd: number;
  loading?: boolean;
  onConfirm: () => Promise<boolean>;
}

/** Explicit margin-trading warning, required before switching a key to "Agent autorisé". Remount via `key` to reset. */
export default function TradingAuthorizeDialog({ open, onOpenChange, agentName, platformName, riskCapUsd, loading, onConfirm }: TradingAuthorizeDialogProps) {
  const [ack, setAck] = useState(false);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      tone="danger"
      title={`Autoriser ${agentName} à trader seul`}
      description={`${agentName} pourra passer des ordres sur ${platformName} sans te demander, jusqu'à ${riskCapUsd.toLocaleString("fr-FR")} $ de risque.`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button
            variant="danger"
            disabled={!ack}
            loading={loading}
            onClick={async () => {
              if (await onConfirm()) onOpenChange(false);
            }}
          >
            Autoriser le trading autonome
          </Button>
        </>
      }
    >
      <div className="stack !gap-2 rounded-2xl bg-danger-soft p-4 text-sm text-danger-ink">
        <p className="font-semibold">Risque du trading sur marge</p>
        <ul className="list-disc stack !gap-1 pl-5">
          <li>Avec l'effet de levier, une petite variation de prix peut liquider la position et faire perdre toute la marge engagée.</li>
          <li>Les pertes peuvent dépasser le plafond de risque en cas de forte volatilité ou de glissement de prix.</li>
          <li>L'agent agit sans validation. Seul « Reprendre la main » coupe immédiatement son autonomie.</li>
        </ul>
      </div>
      <label className="flex min-h-tap cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] border-border-strong p-3 text-sm">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-danger" />
        <span>J'ai compris que je peux perdre l'intégralité des fonds exposés sur cette plateforme.</span>
      </label>
    </Modal>
  );
}
