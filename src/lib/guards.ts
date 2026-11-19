/**
 * Pure guard-rail logic, shared by the UI and the tests.
 * Mirrors the on-chain rules of nexus_access so the UI never offers an action
 * the program would reject — the program remains the final source of truth.
 */

export type NetworkStatus = "checking" | "ok" | "wrong" | "offline";

export type WalletMode = "humanValidation" | "agentAsks" | "agentAuthorized";

export interface OverrideState {
  globalOverride: boolean;
  agentOverrideMask: number;
}

export interface ModeTarget {
  agentId: number;
  isShared: boolean;
  assignedAgentsMask: number;
  mode: WalletMode;
}

export interface Role {
  isAuthority: boolean;
  isGuardian: boolean;
  isPendingAuthority: boolean;
}

export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

export const WALLET_MODE_LABELS: Record<WalletMode, string> = {
  humanValidation: "Validation humaine requise",
  agentAsks: "Agent demande",
  agentAuthorized: "Agent autorisé",
};

export const WALLET_MODE_HINTS: Record<WalletMode, string> = {
  humanValidation: "L'agent prépare, tu signes chaque action.",
  agentAsks: "L'agent te notifie et attend un Oui / Non rapide.",
  agentAuthorized: "L'agent signe seul, dans la limite du plafond, avec alerte à chaque signature.",
};

/** Same rule as `effective_mode` in the program. */
export function effectiveMode(config: OverrideState, wallet: ModeTarget): WalletMode {
  if (config.globalOverride) return "humanValidation";
  const overridden = wallet.isShared
    ? (config.agentOverrideMask & wallet.assignedAgentsMask) !== 0
    : wallet.agentId < 7 && (config.agentOverrideMask & (1 << wallet.agentId)) !== 0;
  return overridden ? "humanValidation" : wallet.mode;
}

export function isAgentOverridden(config: OverrideState, agentId: number) {
  return config.globalOverride || (config.agentOverrideMask & (1 << agentId)) !== 0;
}

/** Simulates `take_back_control` — used by tests and optimistic UI. */
export function applyTakeBackControl<T extends OverrideState>(config: T): T {
  return { ...config, globalOverride: true };
}

export function applyTakeBackControlForAgent<T extends OverrideState>(config: T, agentId: number): T {
  return { ...config, agentOverrideMask: config.agentOverrideMask | (1 << agentId) };
}

export function networkReason(network: NetworkStatus): string | undefined {
  switch (network) {
    case "checking":
      return "Vérification du réseau en cours…";
    case "wrong":
      return "Mauvais réseau : l'app fonctionne uniquement sur Devnet.";
    case "offline":
      return "Réseau injoignable. Vérifie ta connexion.";
    default:
      return undefined;
  }
}

/** Any on-chain write from the user's wallet. */
export function canSignOnChain(params: { connected: boolean; network: NetworkStatus }): GuardResult {
  if (!params.connected) return { allowed: false, reason: "Connecte ton wallet pour signer." };
  const reason = networkReason(params.network);
  if (reason) return { allowed: false, reason };
  return { allowed: true };
}

/** A financial action always needs a connected wallet, the right network and the program running. */
export function canRequestFinancialAction(params: {
  connected: boolean;
  network: NetworkStatus;
  paused: boolean;
}): GuardResult {
  const base = canSignOnChain(params);
  if (!base.allowed) return base;
  if (params.paused) return { allowed: false, reason: "Le programme est en pause : actions financières bloquées." };
  return { allowed: true };
}

export function canSeeAdministration(role: Role) {
  return role.isAuthority || role.isGuardian || role.isPendingAuthority;
}

/** The dedicated Guardian pause section is only shown to the guardian. */
export function canSeeGuardianPause(role: Role) {
  return role.isGuardian;
}

/** take_back_control is accepted on-chain from the authority or the guardian. */
export function canTakeBackControl(role: Role) {
  return role.isAuthority || role.isGuardian;
}
