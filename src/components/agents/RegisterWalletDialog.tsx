import { useState } from "react";
import Modal from "@/components/shared/Modal";
import Button from "@/components/shared/Button";
import { GuardNotice } from "@/components/shared/Notices";
import type { useAgentWallets } from "@/hooks/useAgentWallets";
import { useNexus } from "@/hooks/useNexus";
import type { Agent } from "@/lib/models";
import { MAX_SHARED_WALLETS, MAX_TOTAL_WALLETS } from "@/lib/solana";
import { cn, isValidPubkeyString, lamportsToSol } from "@/lib/utils";

type WalletsApi = ReturnType<typeof useAgentWallets>;

interface RegisterWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shared: boolean;
  agents: Agent[];
  api: WalletsApi;
  defaultAgentId?: string;
}

const inputClass = "min-h-tap w-full rounded-2xl border-[1.5px] border-border-strong bg-surface px-4 text-base outline-none focus:border-foreground";

/** Register an agent wallet (individual or shared) in nexus_access. Remount via `key` to reset. */
export default function RegisterWalletDialog({ open, onOpenChange, shared, agents, api, defaultAgentId }: RegisterWalletDialogProps) {
  const { config } = useNexus();
  const [agentId, setAgentId] = useState(defaultAgentId ?? agents[0]?.id ?? "");
  const [pubkey, setPubkey] = useState("");
  const [cap, setCap] = useState("0.5");
  const [mask, setMask] = useState(0);

  const agent = agents.find((a) => a.id === agentId);
  const capSol = Number(cap);
  const globalCapSol = lamportsToSol(config?.globalSpendCapLamports ?? 0);
  const duplicate = api.wallets.some((w) => w.walletPubkey === pubkey.trim());

  const limitError = (() => {
    if (!config) return "Config on-chain non chargée.";
    if (config.paused) return "Programme en pause : enregistrement impossible.";
    if (config.totalWallets >= MAX_TOTAL_WALLETS) return `Limite totale atteinte (${MAX_TOTAL_WALLETS} wallets agent).`;
    if (shared) {
      if (config.sharedWallets >= MAX_SHARED_WALLETS || api.nextSharedIndex() === null) return `Limite atteinte (${MAX_SHARED_WALLETS} wallets communs).`;
      return null;
    }
    if (!agent) return "Crée d'abord un agent.";
    if ((config.walletsPerAgent[agent.slot] ?? 0) >= config.maxWalletsPerAgent) return `${agent.name} a déjà ${config.maxWalletsPerAgent} wallet(s), la limite par agent.`;
    if (api.nextIndividualIndex(agent.slot) === null) return "Plus d'index de wallet disponible pour cet agent.";
    return null;
  })();

  const fieldError = !pubkey.trim()
    ? null
    : !isValidPubkeyString(pubkey.trim())
      ? "Adresse Solana invalide."
      : duplicate
        ? "Ce wallet est déjà enregistré."
        : null;
  const capError = !Number.isFinite(capSol) || capSol < 0 || capSol > globalCapSol ? `Entre 0 et ${globalCapSol} SOL (plafond global).` : null;
  const ready = !limitError && !fieldError && !capError && isValidPubkeyString(pubkey.trim());

  const submit = async () => {
    const ok = shared
      ? await api.registerSharedWallet({ walletPubkey: pubkey.trim(), agentsMask: mask, spendCapSol: capSol })
      : agent && (await api.registerAgentWallet({ slot: agent.slot, walletPubkey: pubkey.trim(), spendCapSol: capSol, agentId: agent.id }));
    if (ok) onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={shared ? "Nouveau wallet commun" : "Nouveau wallet agent"}
      description={
        shared
          ? `Budget partagé entre plusieurs agents (${config?.sharedWallets ?? 0}/${MAX_SHARED_WALLETS} utilisés).`
          : `Wallet propre à un agent (${config?.totalWallets ?? 0}/${MAX_TOTAL_WALLETS} au total).`
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!ready} loading={api.pending === "register" || api.pending === "register-shared"} onClick={() => void submit()}>
            Signer l'enregistrement
          </Button>
        </>
      }
    >
      {!shared && (
        <div className="field">
          <label htmlFor="reg-agent" className="label">Agent</label>
          <select id="reg-agent" value={agentId} onChange={(e) => setAgentId(e.target.value)} className={inputClass}>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {config?.walletsPerAgent[a.slot] ?? 0}/{config?.maxWalletsPerAgent ?? 5}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="reg-pubkey" className="label">Adresse publique du wallet agent</label>
        <input id="reg-pubkey" value={pubkey} onChange={(e) => setPubkey(e.target.value)} className={cn(inputClass, "font-mono text-sm")} placeholder="Adresse générée côté serveur" autoComplete="off" spellCheck={false} />
        {fieldError && <p className="text-xs font-medium text-danger-ink">{fieldError}</p>}
        <p className="text-xs text-muted-foreground">
          La clé privée est générée et conservée côté serveur, jamais dans l'app. Tu n'enregistres ici que l'adresse publique.
        </p>
      </div>

      <div className="field">
        <label htmlFor="reg-cap" className="label">Plafond de dépense (SOL)</label>
        <input id="reg-cap" inputMode="decimal" value={cap} onChange={(e) => setCap(e.target.value.replace(",", "."))} className={inputClass} />
        {capError && <p className="text-xs font-medium text-danger-ink">{capError}</p>}
      </div>

      {shared && (
        <fieldset>
          <legend className="label mb-2">Agents assignés</legend>
          {agents.length === 0 && <p className="text-sm text-muted-foreground">Aucun agent : tu pourras l'assigner plus tard.</p>}
          <div className="flex flex-wrap gap-2">
            {agents.map((a) => {
              const on = (mask & (1 << a.slot)) !== 0;
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setMask((m) => m ^ (1 << a.slot))}
                  className={cn("min-h-tap rounded-xl border-2 px-3 text-sm font-semibold", on ? "border-foreground bg-secondary-soft" : "border-border text-muted-foreground")}
                >
                  {a.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <p className="text-sm text-muted-foreground">Le wallet démarre en mode « Validation humaine requise ».</p>
      {limitError && <GuardNotice tone="danger">{limitError}</GuardNotice>}
    </Modal>
  );
}
