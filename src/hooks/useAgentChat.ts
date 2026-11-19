import { useCallback, useState } from "react";
import { useLocalStore } from "./useLocalStore";
import { getByIndex, put, removeByIndex } from "@/lib/localDb";
import { simulatedResponder, type AgentResponder } from "@/lib/agentResponder";
import { logActivity } from "@/lib/activity";
import type { Agent, ChatMessage } from "@/lib/models";
import { uid } from "@/lib/utils";

export type AgentChatStatus = "active" | "thinking";

/**
 * Chat with one agent (dm:<agentId>) or a group of agents (group:main).
 * Messages are stored on the device. Replies come from `responder`, which
 * is the simulated one until the decision engine is connected.
 */
export function useAgentChat(conversationId: string, participants: Agent[], responder: AgentResponder = simulatedResponder) {
  const loader = useCallback(
    async () => (await getByIndex<ChatMessage>("messages", "conversationId", conversationId)).sort((a, b) => a.at - b.at),
    [conversationId],
  );
  const { data: messages, loading } = useLocalStore<ChatMessage[]>("messages", loader, []);
  const [thinking, setThinking] = useState<Record<string, boolean>>({});

  const setAgentThinking = (id: string, value: boolean) => setThinking((s) => ({ ...s, [id]: value }));

  const append = (author: string, text: string, needsValidation?: boolean) =>
    put<ChatMessage>("messages", { id: uid(), conversationId, author, text, at: Date.now(), needsValidation });

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || !participants.length) return;
      await append("user", clean);
      const history = await loader();

      if (participants.length === 1) {
        const agent = participants[0];
        setAgentThinking(agent.id, true);
        try {
          const reply = await responder.reply(agent, clean, history);
          await append(agent.id, reply.text, reply.needsValidation);
          if (reply.needsValidation) {
            await logActivity({ source: "agent", severity: "alert", title: "Action proposée, validation requise", detail: `${agent.name} · ${clean.slice(0, 70)}`, agentId: agent.id, agentSlot: agent.slot });
          }
        } finally {
          setAgentThinking(agent.id, false);
        }
        return;
      }

      const turns = await responder.groupRound(participants, clean, history);
      for (const turn of turns) {
        setAgentThinking(turn.agent.id, true);
        await new Promise((r) => setTimeout(r, 650 + Math.random() * 650));
        await append(turn.agent.id, turn.text, turn.needsValidation);
        setAgentThinking(turn.agent.id, false);
        if (turn.needsValidation) {
          await logActivity({ source: "agent", severity: "alert", title: "Décision de groupe en attente de validation", detail: `${turn.agent.name} · ${clean.slice(0, 70)}`, agentId: turn.agent.id, agentSlot: turn.agent.slot });
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversationId, participants, responder, loader],
  );

  const clear = useCallback(() => removeByIndex("messages", "conversationId", conversationId), [conversationId]);

  const statusOf = (agentId: string): AgentChatStatus => (thinking[agentId] ? "thinking" : "active");

  return { messages, loading, send, clear, statusOf, anyThinking: Object.values(thinking).some(Boolean) };
}
