import { useCallback } from "react";
import { useLocalStore } from "./useLocalStore";
import { getAll, put, remove, removeByIndex } from "@/lib/localDb";
import type { Agent } from "@/lib/models";
import { dmConversationId } from "@/lib/models";
import { MAX_AGENTS } from "@/lib/appConfig";
import { uid } from "@/lib/utils";

const loadAgents = async () => (await getAll<Agent>("agents")).sort((a, b) => a.slot - b.slot);

export function firstFreeSlot(agents: Agent[], max = MAX_AGENTS): number | null {
  const used = new Set(agents.map((a) => a.slot));
  for (let slot = 0; slot < max; slot++) if (!used.has(slot)) return slot;
  return null;
}

/** Local agents (name, role, personality). Each one owns an on-chain slot 0..6. */
export function useAgents() {
  const { data: agents, loading, error } = useLocalStore<Agent[]>("agents", loadAgents, []);

  const canCreate = agents.length < MAX_AGENTS;

  const createAgent = useCallback(
    async (input: Pick<Agent, "name" | "role" | "personality">) => {
      const current = await loadAgents();
      const slot = firstFreeSlot(current);
      if (slot === null) throw new Error(`Maximum ${MAX_AGENTS} agents atteint.`);
      const agent: Agent = { id: uid(), slot, createdAt: Date.now(), ...input };
      await put("agents", agent);
      return agent;
    },
    [],
  );

  const updateAgent = useCallback(async (agent: Agent) => {
    await put("agents", agent);
  }, []);

  /** Deletes the agent and everything stored locally for it (chat, memory, sandbox). */
  const deleteAgent = useCallback(async (agent: Agent) => {
    await removeByIndex("messages", "conversationId", dmConversationId(agent.id));
    await removeByIndex("memory", "agentId", agent.id);
    await removeByIndex("sandbox", "agentId", agent.id);
    await remove("agents", agent.id);
  }, []);

  const agentBySlot = useCallback((slot: number) => agents.find((a) => a.slot === slot), [agents]);

  return { agents, loading, error, canCreate, createAgent, updateAgent, deleteAgent, agentBySlot };
}
