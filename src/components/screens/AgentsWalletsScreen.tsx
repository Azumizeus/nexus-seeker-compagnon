import { useState } from "react";
import { Plus, RefreshCw, Users, Wallet } from "lucide-react";
import Button from "@/components/shared/Button";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { EmptyState, GuardNotice, SectionTitle } from "@/components/shared/Notices";
import AgentCard from "@/components/agents/AgentCard";
import AgentFormDialog from "@/components/agents/AgentFormDialog";
import RegisterWalletDialog from "@/components/agents/RegisterWalletDialog";
import WalletCard from "@/components/agents/WalletCard";
import { useAgents } from "@/hooks/useAgents";
import { useAgentWallets } from "@/hooks/useAgentWallets";
import { useNexus } from "@/hooks/useNexus";
import { useToast } from "@/hooks/useToast";
import { canSignOnChain } from "@/lib/guards";
import type { Agent } from "@/lib/models";
import { MAX_AGENTS } from "@/lib/appConfig";
import { MAX_SHARED_WALLETS, MAX_TOTAL_WALLETS } from "@/lib/solana";

type WalletDialog = { shared: boolean; agentId?: string; key: number } | null;

export default function AgentsWalletsScreen() {
  const { connected, network, role, config } = useNexus();
  const { agents, canCreate, createAgent, updateAgent, deleteAgent } = useAgents();
  const api = useAgentWallets();
  const { toast } = useToast();

  const [agentDialog, setAgentDialog] = useState<{ agent?: Agent; key: number } | null>(null);
  const [walletDialog, setWalletDialog] = useState<WalletDialog>(null);
  const [toDelete, setToDelete] = useState<Agent | null>(null);

  const guard = canSignOnChain({ connected, network });
  const canEdit = guard.allowed && role.isAuthority;
  const sharedWallets = api.wallets.filter((w) => w.isShared);
  const orphanWallets = api.wallets.filter((w) => !w.isShared && !agents.some((a) => a.slot === w.agentId));
  const totalWallets = config?.totalWallets ?? api.wallets.length;

  const openWallet = (shared: boolean, agentId?: string) => setWalletDialog({ shared, agentId, key: Date.now() });

  const confirmDelete = async () => {
    if (!toDelete) return;
    const onChain = config?.walletsPerAgent[toDelete.slot] ?? 0;
    if (onChain > 0) {
      toast({ tone: "alert", title: "Suppression bloquée", description: `Révoque d'abord les ${onChain} wallet(s) de ${toDelete.name}.` });
      return false;
    }
    await deleteAgent(toDelete);
    toast({ tone: "success", title: `${toDelete.name} supprimé` });
  };

  return (
    <div className="stack !gap-5 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">
            {agents.length}/{MAX_AGENTS} agents · {totalWallets}/{MAX_TOTAL_WALLETS} wallets
          </p>
          <h1 className="text-3xl font-bold">Agents & Wallets</h1>
        </div>
        <Button variant="ghost" onClick={() => void api.refresh()} loading={api.loading}>
          {!api.loading && <RefreshCw className="h-4 w-4" aria-hidden />}
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button variant="primary" size="lg" disabled={!canCreate} onClick={() => setAgentDialog({ key: Date.now() })} data-testid="new-agent">
          <Plus className="h-5 w-5" aria-hidden /> Nouvel agent
        </Button>
        <Button variant="secondary" size="lg" disabled={!canEdit || agents.length === 0} onClick={() => openWallet(false)}>
          <Wallet className="h-5 w-5" aria-hidden /> Nouveau wallet agent
        </Button>
        <Button variant="accent" size="lg" disabled={!canEdit || (config?.sharedWallets ?? 0) >= MAX_SHARED_WALLETS} onClick={() => openWallet(true)}>
          <Users className="h-5 w-5" aria-hidden /> Wallet commun
        </Button>
      </div>

      {!canCreate && <GuardNotice>Maximum {MAX_AGENTS} agents atteint.</GuardNotice>}
      {!guard.allowed && guard.reason && <GuardNotice>{guard.reason} La gestion des wallets agent demande une signature.</GuardNotice>}
      {guard.allowed && !role.isAuthority && (
        <GuardNotice>Lecture seule : seule l'authority du programme peut enregistrer, régler ou révoquer des wallets agent.</GuardNotice>
      )}
      {api.error && <GuardNotice tone="danger">{api.error}</GuardNotice>}

      <section className="stack">
        <SectionTitle eyebrow="Jusqu'à 7" title="Agents" />
        {agents.length === 0 ? (
          <EmptyState title="Aucun agent">Crée un agent : nom, rôle et personnalité. Tu pourras ensuite lui attribuer des wallets.</EmptyState>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                agents={agents}
                api={api}
                canEdit={canEdit}
                onEdit={() => setAgentDialog({ agent, key: Date.now() })}
                onDelete={() => setToDelete(agent)}
                onAddWallet={() => openWallet(false, agent.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="stack">
        <SectionTitle eyebrow={`${sharedWallets.length}/${MAX_SHARED_WALLETS}`} title="Wallets communs" />
        {sharedWallets.length === 0 ? (
          <EmptyState title="Aucun wallet commun">Un wallet commun est un budget partagé, assignable à plusieurs agents.</EmptyState>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {sharedWallets.map((w) => (
              <WalletCard key={w.address} wallet={w} agents={agents} api={api} canEdit={canEdit} />
            ))}
          </div>
        )}
      </section>

      {orphanWallets.length > 0 && (
        <section className="stack">
          <SectionTitle eyebrow="Registre on-chain" title="Wallets sans agent sur cet appareil" />
          <p className="text-sm text-muted-foreground">Ces wallets sont enregistrés on-chain pour un emplacement qui n'a pas d'agent local.</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {orphanWallets.map((w) => (
              <WalletCard key={w.address} wallet={w} agents={agents} api={api} canEdit={canEdit} />
            ))}
          </div>
        </section>
      )}

      {agentDialog && (
        <AgentFormDialog
          key={agentDialog.key}
          open
          onOpenChange={(o) => !o && setAgentDialog(null)}
          initial={agentDialog.agent}
          onSave={async (input) => {
            if (agentDialog.agent) await updateAgent({ ...agentDialog.agent, ...input });
            else await createAgent(input);
          }}
        />
      )}

      {walletDialog && (
        <RegisterWalletDialog
          key={walletDialog.key}
          open
          onOpenChange={(o) => !o && setWalletDialog(null)}
          shared={walletDialog.shared}
          agents={agents}
          api={api}
          defaultAgentId={walletDialog.agentId}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Supprimer ${toDelete?.name ?? "l'agent"} ?`}
        description="Son chat, sa mémoire locale et sa sandbox seront effacés de cet appareil."
        confirmLabel="Supprimer"
        tone="danger"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
