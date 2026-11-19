import { useMemo } from "react";
import ChatThread from "./ChatThread";
import AgentAvatar from "@/components/shared/AgentAvatar";
import Badge from "@/components/shared/Badge";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useActionRequests } from "@/hooks/useActionRequests";
import { dmConversationId, type Agent } from "@/lib/models";
import { cn } from "@/lib/utils";

interface AgentChatPanelProps {
  agents: Agent[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/** 1:1 conversation with one agent. */
export default function AgentChatPanel({ agents, selectedId, onSelect }: AgentChatPanelProps) {
  const agent = agents.find((a) => a.id === selectedId) ?? agents[0];
  const participants = useMemo(() => (agent ? [agent] : []), [agent]);
  const { messages, send, statusOf } = useAgentChat(agent ? dmConversationId(agent.id) : "dm:none", participants);
  const { pendingForAgent } = useActionRequests();

  if (!agent) return null;
  const thinking = statusOf(agent.id) === "thinking";
  const awaiting = pendingForAgent(agent.id) > 0 || messages.some((m) => m.author === agent.id && m.needsValidation);
  const status = thinking
    ? { tone: "violet" as const, label: "En réflexion" }
    : awaiting
      ? { tone: "accent" as const, label: "Attend une validation" }
      : { tone: "success" as const, label: "Actif" };

  return (
    <div className="stack">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Choisir un agent">
        {agents.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={a.id === agent.id}
            onClick={() => onSelect(a.id)}
            className={cn(
              "flex min-h-tap shrink-0 items-center gap-2 rounded-2xl border-2 px-3 font-semibold",
              a.id === agent.id ? "border-foreground bg-surface shadow-pop" : "border-border bg-surface-sunken",
            )}
          >
            <AgentAvatar name={a.name} slot={a.slot} size="sm" />
            {a.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AgentAvatar name={agent.name} slot={agent.slot} size="lg" status={thinking ? "thinking" : awaiting ? "awaiting" : "active"} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-semibold">{agent.name}</p>
          <p className="truncate text-sm text-muted-foreground">{agent.role}</p>
        </div>
        <Badge tone={status.tone} dot data-testid="agent-status">
          {status.label}
        </Badge>
      </div>

      <ChatThread
        messages={messages}
        agents={agents}
        thinkingAgents={thinking ? [agent] : []}
        onSend={send}
        disabled={thinking}
        placeholder={`Écrire à ${agent.name}…`}
        emptyHint={`Commence la conversation avec ${agent.name}.`}
      />
    </div>
  );
}
