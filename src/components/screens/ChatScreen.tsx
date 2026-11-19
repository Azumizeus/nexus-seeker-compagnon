import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import AgentChatPanel from "@/components/chat/AgentChatPanel";
import GroupChatPanel from "@/components/chat/GroupChatPanel";
import Button from "@/components/shared/Button";
import Badge from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/Notices";
import { useAgents } from "@/hooks/useAgents";
import { useNexus } from "@/hooks/useNexus";
import { cn } from "@/lib/utils";

export default function ChatScreen() {
  const { agents, loading } = useAgents();
  const { connected } = useNexus();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "groupe" ? "group" : "agent";
  const selectedId = params.get("agent") ?? agents[0]?.id ?? "";

  const setMode = (m: "agent" | "group") => setParams(m === "group" ? { mode: "groupe" } : selectedId ? { agent: selectedId } : {});

  return (
    <div className="stack !gap-4 animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Conversations</p>
          <h1 className="text-3xl font-bold">Chat</h1>
        </div>
        <Badge tone="warning">Réponses simulées · cœur de décision non branché</Badge>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-sunken p-1" role="tablist" aria-label="Type de conversation">
        {(["agent", "group"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn("min-h-tap rounded-xl font-semibold", mode === m ? "bg-surface shadow-card" : "text-muted-foreground")}
          >
            {m === "agent" ? "Agent (1:1)" : "Groupe"}
          </button>
        ))}
      </div>

      {!connected && (
        <p className="text-sm text-muted-foreground">
          Le chat fonctionne sans wallet. Les actions financières proposées par les agents restent en lecture seule jusqu'à la connexion.
        </p>
      )}

      {!loading && agents.length === 0 ? (
        <EmptyState
          title="Aucun agent"
          action={
            <Button variant="primary" onClick={() => navigate("/agents")}>
              <Plus className="h-4 w-4" aria-hidden /> Créer un agent
            </Button>
          }
        >
          Crée ton premier agent pour discuter avec lui.
        </EmptyState>
      ) : mode === "agent" ? (
        agents.length > 0 && <AgentChatPanel agents={agents} selectedId={selectedId} onSelect={(id) => setParams({ agent: id })} />
      ) : (
        <GroupChatPanel agents={agents} />
      )}
    </div>
  );
}
