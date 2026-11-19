import { useCallback } from "react";
import bs58Encode from "@/lib/bs58";
import { useWallet } from "@solana/wallet-adapter-react";
import { useLocalStore } from "./useLocalStore";
import { useNexus } from "./useNexus";
import { getAll, getOne, put } from "@/lib/localDb";
import { logActivity } from "@/lib/activity";
import { canRequestFinancialAction } from "@/lib/guards";
import { ACTION_CATEGORY_LABELS, type ActionCategory, type ActionRequest } from "@/lib/models";
import { uid } from "@/lib/utils";

const loadRequests = async () => (await getAll<ActionRequest>("requests")).sort((a, b) => b.createdAt - a.createdAt);

/** Message the user signs to approve a request. Signing a message moves no funds. */
export function approvalMessage(request: ActionRequest) {
  return [
    "Nexus Seeker Compagnon — approbation humaine",
    `Demande : ${request.id}`,
    `Catégorie : ${ACTION_CATEGORY_LABELS[request.category]}`,
    `Action : ${request.text}`,
    `Date : ${new Date().toISOString()}`,
    "Réseau : devnet",
  ].join("\n");
}

/**
 * Action requests sent for approval. The decision engine (outside this app)
 * will read approved requests and execute them; nothing is executed here.
 */
export function useActionRequests() {
  const { data: requests, loading } = useLocalStore<ActionRequest[]>("requests", loadRequests, []);
  const { signMessage } = useWallet();
  const { connected, network, config, publicKey } = useNexus();

  const submit = useCallback(async (input: { text: string; category: ActionCategory; agentId?: string }) => {
    const request: ActionRequest = { id: uid(), createdAt: Date.now(), status: "pending", ...input };
    await put("requests", request);
    await logActivity({
      source: input.agentId ? "agent" : "system",
      severity: input.category === "financial" ? "alert" : "info",
      title: "Demande envoyée pour approbation",
      detail: `${ACTION_CATEGORY_LABELS[input.category]} · ${input.text.slice(0, 80)}`,
      agentId: input.agentId,
    });
    return request;
  }, []);

  const approve = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const request = await getOne<ActionRequest>("requests", id);
      if (!request || request.status !== "pending") return { ok: false, error: "Demande introuvable ou déjà traitée." };
      if (request.category === "financial") {
        const guard = canRequestFinancialAction({ connected, network, paused: config?.paused ?? false });
        if (!guard.allowed) return { ok: false, error: guard.reason };
      } else if (!connected) {
        return { ok: false, error: "Connecte ton wallet pour approuver." };
      }
      if (!signMessage) return { ok: false, error: "Ce wallet ne permet pas de signer un message." };
      try {
        const signature = await signMessage(new TextEncoder().encode(approvalMessage(request)));
        const approved: ActionRequest = {
          ...request,
          status: "approved",
          approvedBy: publicKey ?? undefined,
          approvalSignature: bs58Encode(signature),
        };
        await put("requests", approved);
        await logActivity({
          source: "wallet",
          severity: "success",
          title: "Demande approuvée dans le wallet",
          detail: request.text.slice(0, 80),
          agentId: request.agentId,
        });
        return { ok: true };
      } catch (error) {
        console.error("[requests] approve failed", error);
        const message = error instanceof Error ? error.message : "";
        return { ok: false, error: /reject|declin/i.test(message) ? "Signature refusée dans le wallet." : message || "Signature impossible." };
      }
    },
    [connected, network, config, signMessage, publicKey],
  );

  const cancel = useCallback(async (id: string) => {
    const request = await getOne<ActionRequest>("requests", id);
    if (!request) return;
    await put("requests", { ...request, status: "cancelled" });
    await logActivity({ source: "system", severity: "info", title: "Demande annulée", detail: request.text.slice(0, 80), agentId: request.agentId });
  }, []);

  const pendingForAgent = useCallback(
    (agentId: string) => requests.filter((r) => r.agentId === agentId && r.status === "pending").length,
    [requests],
  );

  return { requests, loading, submit, approve, cancel, pendingForAgent };
}
