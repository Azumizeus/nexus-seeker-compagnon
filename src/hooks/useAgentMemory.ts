import { useCallback, useMemo } from "react";
import { useLocalStore } from "./useLocalStore";
import { getByIndex, getOne, put, remove } from "@/lib/localDb";

/**
 * SKELETON — persistent memory stored on the device, scoped to one agent.
 * The decision engine will plug its memory logic on top of this API later.
 * Isolation: every key is prefixed with the agent id and every query filters
 * on it, so an agent can only see its own entries.
 */
export interface MemoryEntry {
  key: string; // `${agentId}::${name}`
  agentId: string;
  name: string;
  value: unknown;
  updatedAt: number;
}

export interface AgentMemoryApi {
  entries: MemoryEntry[];
  ready: boolean;
  get: (name: string) => Promise<unknown>;
  set: (name: string, value: unknown) => Promise<void>;
  delete: (name: string) => Promise<void>;
  list: () => Promise<MemoryEntry[]>;
}

const memoryKey = (agentId: string, name: string) => `${agentId}::${name}`;

export function useAgentMemory(agentId: string): AgentMemoryApi {
  const loader = useCallback(() => getByIndex<MemoryEntry>("memory", "agentId", agentId), [agentId]);
  const { data: entries, loading } = useLocalStore<MemoryEntry[]>("memory", loader, []);

  return useMemo(
    () => ({
      entries,
      ready: !loading,
      get: async (name) => (await getOne<MemoryEntry>("memory", memoryKey(agentId, name)))?.value,
      set: (name, value) => put<MemoryEntry>("memory", { key: memoryKey(agentId, name), agentId, name, value, updatedAt: Date.now() }),
      delete: (name) => remove("memory", memoryKey(agentId, name)),
      list: loader,
    }),
    [entries, loading, agentId, loader],
  );
}
