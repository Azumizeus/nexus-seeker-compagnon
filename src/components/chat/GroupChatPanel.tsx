import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import ChatThread from "./ChatThread";
import AgentAvatar from "@/components/shared/AgentAvatar";
import { GuardNotice } from "@/components/shared/Notices";
import { useAgentChat } from "@/hooks/useAgentChat";
import { GROUP_CONVERSATION_ID, type Agent } from "@/lib/models";
import { cn } from "@/lib/utils";

/**
 * Agents discuss together and with the user: one proposes, another
 * challenges, a third executes (or waits for human validation).
 */
export default function GroupChatPanel({ agents }: { agents: Agent[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => agents.slice(0, 3).map((a) => a.id));
  const participants = useMemo(() => agents.filter((a) => selectedIds.includes(a.id)), [agents, selectedIds]);
  const { messages, send, statusOf, anyThinking } = useAgentChat(GROUP_CONVERSATION_ID, participants);

  const toggle = (id: string) => setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  const thinkingAgents = agents.filter((a) => statusOf(a.id) === "thinking");

  return (
    <div className="stack">
      <fieldset>
        <legend className="label mb-2">Participants ({participants.length})</legend>
        <div className="flex flex-wrap gap-2">
          {agents.map((a) => {
            const on = selectedIds.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(a.id)}
                className={cn(
                  "flex min-h-tap items-center gap-2 rounded-2xl border-2 px-3 font-semibold transition-colors",
                  on ? "border-foreground bg-surface shadow-pop" : "border-dashed border-border-strong text-muted-foreground",
                )}
              >
                <AgentAvatar name={a.name} slot={a.slot} size="sm" status={statusOf(a.id) === "thinking" ? "thinking" : undefined} />
                {a.name}
                {on && <Check className="h-4 w-4" aria-hidden />}
              </button>
            );
          })}
        </div>
      </fieldset>
      {participants.length < 2 && <GuardNotice>Sélectionne au moins 2 agents pour une discussion de groupe.</GuardNotice>}

      <ChatThread
        messages={messages}
        agents={agents}
        thinkingAgents={thinkingAgents}
        onSend={send}
        disabled={participants.length < 2 || anyThinking}
        placeholder="Donne une tâche commune ou interviens…"
        emptyHint="Propose une tâche : un agent propose, un autre challenge, un troisième exécute ou demande ta validation."
      />
    </div>
  );
}
