import { useCallback, useMemo } from "react";
import { useLocalStore } from "./useLocalStore";
import { getByIndex, getOne, put, remove, removeByIndex } from "@/lib/localDb";

/**
 * SKELETON — isolated workspace per agent (working files, drafts, temp state).
 * Same isolation rule as memory: keys are `${agentId}::${path}` and every read
 * is filtered by agentId, so no agent can read another agent's sandbox.
 */
export interface SandboxFile {
  key: string;
  agentId: string;
  path: string;
  content: string;
  kind: "file" | "draft" | "state";
  updatedAt: number;
}

export interface AgentSandboxApi {
  files: SandboxFile[];
  ready: boolean;
  read: (path: string) => Promise<string | undefined>;
  write: (path: string, content: string, kind?: SandboxFile["kind"]) => Promise<void>;
  delete: (path: string) => Promise<void>;
  reset: () => Promise<void>;
}

const sandboxKey = (agentId: string, path: string) => `${agentId}::${path.replace(/^\/+/, "")}`;

export function useAgentSandbox(agentId: string): AgentSandboxApi {
  const loader = useCallback(() => getByIndex<SandboxFile>("sandbox", "agentId", agentId), [agentId]);
  const { data: files, loading } = useLocalStore<SandboxFile[]>("sandbox", loader, []);

  return useMemo(
    () => ({
      files,
      ready: !loading,
      read: async (path) => (await getOne<SandboxFile>("sandbox", sandboxKey(agentId, path)))?.content,
      write: (path, content, kind = "file") =>
        put<SandboxFile>("sandbox", { key: sandboxKey(agentId, path), agentId, path, content, kind, updatedAt: Date.now() }),
      delete: (path) => remove("sandbox", sandboxKey(agentId, path)),
      reset: () => removeByIndex("sandbox", "agentId", agentId),
    }),
    [files, loading, agentId],
  );
}
