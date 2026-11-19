import { useNexus } from "./useNexus";
import { useOnChainAction } from "./useOnChainAction";
import { canTakeBackControl, isAgentOverridden } from "@/lib/guards";

/**
 * "Reprendre la main": one on-chain write flips the override flag in Config,
 * so every agent wallet falls back to human validation at once.
 * Accepted from the authority or the guardian; only the authority can release.
 */
export function useTakeBackControl() {
  const { client, config, role } = useNexus();
  const { run, pending } = useOnChainAction();

  const globalActive = config?.globalOverride ?? false;
  const allowed = canTakeBackControl(role);

  return {
    allowed,
    canRelease: role.isAuthority,
    globalActive,
    pending,
    isAgentOverridden: (slot: number) =>
      config ? isAgentOverridden({ globalOverride: config.globalOverride, agentOverrideMask: config.agentOverrideMask }, slot) : false,
    takeBackAll: () =>
      run("take-back", "Contrôle repris", () => client.takeBackControl(), {
        detail: "Tous les wallets agent repassent en validation humaine",
        severity: "danger",
      }),
    takeBackAgent: (slot: number, agentId?: string) =>
      run(`take-back:${slot}`, "Contrôle repris pour un agent", () => client.takeBackControlForAgent(slot), {
        severity: "danger",
        agentSlot: slot,
        agentId,
      }),
    releaseAll: () => run("release", "Autonomie rendue", () => client.releaseControl(), { detail: "Les modes enregistrés s'appliquent de nouveau" }),
    releaseAgent: (slot: number, agentId?: string) =>
      run(`release:${slot}`, "Autonomie rendue à un agent", () => client.releaseControlForAgent(slot), { agentSlot: slot, agentId }),
  };
}
