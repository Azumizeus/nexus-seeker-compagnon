import { useState } from "react";
import Modal from "@/components/shared/Modal";
import Button from "@/components/shared/Button";
import { GuardNotice } from "@/components/shared/Notices";
import type { Agent } from "@/lib/models";

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Agent;
  onSave: (input: Pick<Agent, "name" | "role" | "personality">) => Promise<void>;
}

const inputClass = "min-h-tap w-full rounded-2xl border-[1.5px] border-border-strong bg-surface px-4 text-base outline-none focus:border-foreground";

/** Create or edit an agent (stored on the device). Remount via `key` to reset. */
export default function AgentFormDialog({ open, onOpenChange, initial, onSave }: AgentFormDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [personality, setPersonality] = useState(initial?.personality ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim() || !role.trim()) {
      setError("Le nom et le rôle sont obligatoires.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim().slice(0, 40), role: role.trim().slice(0, 120), personality: personality.trim().slice(0, 600) });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? `Modifier ${initial.name}` : "Nouvel agent"}
      description="Enregistré sur cet appareil. Chaque agent occupe un emplacement on-chain (0 à 6) pour ses wallets."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="primary" onClick={() => void save()} loading={saving}>
            {initial ? "Enregistrer" : "Créer l'agent"}
          </Button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="agent-name" className="label">Nom</label>
        <input id="agent-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ex. Orion" maxLength={40} />
      </div>
      <div className="field">
        <label htmlFor="agent-role" className="label">Rôle</label>
        <input id="agent-role" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} placeholder="Ex. Analyste on-chain" maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="agent-personality" className="label">Personnalité (texte libre)</label>
        <textarea
          id="agent-personality"
          rows={4}
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          className="w-full rounded-2xl border-[1.5px] border-border-strong bg-surface p-4 text-base outline-none focus:border-foreground"
          placeholder="Ex. Prudent, précis, challenge toujours les hypothèses."
          maxLength={600}
        />
      </div>
      {error && <GuardNotice tone="danger">{error}</GuardNotice>}
    </Modal>
  );
}
