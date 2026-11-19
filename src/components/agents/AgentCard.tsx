import { useNavigate } from "react-router-dom";
import { Database, FolderLock, MessageCircle, Pencil, Trash2, Unlock } from "lucide-react";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import AgentAvatar from "@/components/shared/AgentAvatar";
import TakeControlButton from "@/components/shared/TakeControlButton";
import WalletCard from "./WalletCard";
import type { useAgentWallets } from "@/hooks/useAgentWallets";
import { useAgentMemory } from "@/hooks/useAgentMemory";
import { useAgentSandbox } from "@/hooks/useAgentSandbox";
import { useTakeBackControl } from "@/hooks/useTakeBackControl";
import { WALLET_MODE_LABELS } from "@/lib/guards";
import type { Agent } from "@/lib/models";

type WalletsApi = ReturnType<typeof useAgentWallets>;

interface AgentCardProps {
  agent: Agent;
  agents: Agent[];
  api: WalletsApi;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddWallet: () => void;
}

export default function AgentCard({ agent, agents, api, canEdit, onEdit, onDelete, onAddWallet }: AgentCardProps) {
  const navigate = useNavigate();
  const wallets = api.walletsForSlot(agent.slot);
  const ownWallets = wallets.filter((w) => !w.isShared);
  const sharedWallets = wallets.filter((w) => w.isShared);
  const memory = useAgentMemory(agent.id);
  const sandbox = useAgentSandbox(agent.id);
  const control = useTakeBackControl();
  const overridden = control.isAgentOverridden(agent.slot);
  const modes = Array.from(new Set(wallets.map((w) => w.effectiveMode)));

  return (
    <article className="card stack" data-testid={`agent-card-${agent.slot}`}>
      <div className="flex items-start gap-3">
        <AgentAvatar name={agent.name} slot={agent.slot} size="lg" status={overridden ? "overridden" : "active"} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-semibold">{agent.name}</h3>
          <p className="text-sm font-medium text-secondary-ink">{agent.role}</p>
          {agent.personality && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{agent.personality}</p>}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Modifier ${agent.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Supprimer ${agent.name}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone="neutral">Emplacement #{agent.slot}</Badge>
        {wallets.length === 0 ? (
          <Badge tone="neutral">Aucun wallet</Badge>
        ) : (
          modes.map((m) => (
            <Badge key={m} tone={m === "agentAuthorized" ? "accent" : m === "agentAsks" ? "violet" : "success"} dot>
              {WALLET_MODE_LABELS[m]}
            </Badge>
          ))
        )}
        {overridden && <Badge tone="danger">Contrôle repris</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex min-h-tap items-center gap-2 rounded-xl bg-surface-sunken px-3 py-2 text-sm">
          <FolderLock className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Sandbox : <strong>{sandbox.files.length ? `actif (${sandbox.files.length})` : "non configuré"}</strong>
          </span>
        </div>
        <div className="flex min-h-tap items-center gap-2 rounded-xl bg-surface-sunken px-3 py-2 text-sm">
          <Database className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Mémoire locale : <strong>{memory.entries.length ? `active (${memory.entries.length})` : "non configurée"}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" block onClick={() => navigate(`/chat?agent=${agent.id}`)}>
          <MessageCircle className="h-4 w-4" aria-hidden /> Chat
        </Button>
        {overridden && control.canRelease && !control.globalActive ? (
          <Button variant="outline" block loading={control.pending === `release:${agent.slot}`} onClick={() => void control.releaseAgent(agent.slot, agent.id)}>
            <Unlock className="h-4 w-4" aria-hidden /> Rendre l'autonomie
          </Button>
        ) : (
          <TakeControlButton slot={agent.slot} agentId={agent.id} agentName={agent.name} className="w-full" />
        )}
      </div>

      <div className="stack !gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="label">Wallets dédiés ({ownWallets.length})</p>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onAddWallet}>
              + Wallet
            </Button>
          )}
        </div>
        {ownWallets.map((w) => (
          <WalletCard key={w.address} wallet={w} agents={agents} api={api} canEdit={canEdit} />
        ))}
        {sharedWallets.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Wallets communs assignés : {sharedWallets.map((w) => `Commun #${w.walletIndex}`).join(", ")} (détails plus bas).
          </p>
        )}
      </div>
    </article>
  );
}
