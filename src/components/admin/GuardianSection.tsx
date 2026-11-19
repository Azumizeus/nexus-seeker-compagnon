import { useState } from "react";
import { OctagonPause } from "lucide-react";
import Button from "@/components/shared/Button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useNexus } from "@/hooks/useNexus";
import { useOnChainAction } from "@/hooks/useOnChainAction";

/** Guardian: can pause, cannot relaunch. Only rendered for the guardian wallet. */
export default function GuardianSection() {
  const { client, config } = useNexus();
  const { run, pending } = useOnChainAction();
  const [open, setOpen] = useState(false);

  return (
    <section className="card stack border-danger" aria-labelledby="guardian-title" data-testid="guardian-section">
      <div>
        <p className="eyebrow">Tu es le guardian</p>
        <h2 id="guardian-title" className="text-2xl font-semibold">
          Section Guardian
        </h2>
      </div>
      <p className="text-muted-foreground">
        Le guardian est un frein d'urgence : il peut <strong className="text-foreground">mettre le programme en pause</strong> et reprendre la main sur les agents,
        mais <strong className="text-foreground">ne peut pas relancer</strong> ni rendre l'autonomie. Seule l'authority le peut.
      </p>
      <Button
        variant="danger"
        size="lg"
        disabled={config?.paused}
        loading={pending === "guardian-pause"}
        onClick={() => setOpen(true)}
        data-testid="guardian-pause"
      >
        <OctagonPause className="h-5 w-5" aria-hidden />
        {config?.paused ? "Programme déjà en pause" : "Mettre en pause"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        title="Mettre le programme en pause"
        description="Tu ne pourras pas relancer toi-même : seule l'authority peut le faire."
        confirmLabel="Pauser maintenant"
        loading={pending === "guardian-pause"}
        onConfirm={() => run("guardian-pause", "Programme mis en pause par le guardian", () => client.pause(), { severity: "danger" })}
      />
    </section>
  );
}
