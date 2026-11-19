import { useCallback, useState } from "react";
import { useNexus } from "./useNexus";
import { useToast } from "./useToast";
import { canSignOnChain } from "@/lib/guards";
import { logActivity } from "@/lib/activity";
import type { SDKResult, TxResult } from "@/lib/nexusAccess";
import type { ActivitySeverity } from "@/lib/models";

interface RunOptions {
  detail?: string;
  severity?: ActivitySeverity;
  agentId?: string;
  agentSlot?: number;
}

/**
 * Runs a user-signed nexus_access instruction with the standard guard rails:
 * wallet connected, devnet, toast feedback, journal entry, Config refresh.
 */
export function useOnChainAction() {
  const { connected, network, refreshConfig, bumpChainTick, openWalletPicker } = useNexus();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);

  const run = useCallback(
    async (key: string, label: string, action: () => Promise<SDKResult<TxResult>>, options: RunOptions = {}) => {
      const guard = canSignOnChain({ connected, network });
      if (!guard.allowed) {
        if (!connected) openWalletPicker();
        toast({ tone: "alert", title: "Action bloquée", description: guard.reason });
        return false;
      }
      setPending(key);
      const result = await action();
      setPending(null);
      if (result.success && result.data) {
        toast({ tone: "success", title: label, description: "Transaction confirmée sur devnet." });
        await logActivity({
          source: "wallet",
          severity: options.severity ?? "success",
          title: label,
          detail: options.detail,
          signature: result.data.signature,
          agentId: options.agentId,
          agentSlot: options.agentSlot,
        });
        await refreshConfig();
        bumpChainTick();
        return true;
      }
      toast({ tone: "danger", title: `Échec : ${label}`, description: result.error });
      return false;
    },
    [connected, network, refreshConfig, bumpChainTick, openWalletPicker, toast],
  );

  return { run, pending };
}
