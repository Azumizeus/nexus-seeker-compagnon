/**
 * Per-agent trading API keys (Bitunix, Evedex, or any platform by name).
 *
 * Security model (enforced by the real server function, mirrored here):
 * - Key + secret leave the client exactly once, in the submit payload, and are
 *   encrypted server-side. The client never stores or re-displays them.
 * - The client only ever sees a `TradingKeyRecord`: platform, a 4-char hint, mode, risk cap.
 * - Every trade goes through the server function, which applies the same modes as
 *   agent wallets and refuses autonomous trades while control is taken back.
 */
import type { WalletMode } from "./guards";

export type TradingPlatform = "bitunix" | "evedex" | "custom";

export const TRADING_PLATFORM_OPTIONS: { value: TradingPlatform; label: string }[] = [
  { value: "bitunix", label: "Bitunix" },
  { value: "evedex", label: "Evedex" },
  { value: "custom", label: "Autre plateforme" },
];

/** Risk cap upper bound per key, in USD. Placeholder until the spec fixes it. */
export const TRADING_RISK_CAP_MAX_USD = 10_000;
export const TRADING_KEYS_PER_AGENT_MAX = 5;

export const TRADING_MODE_HINTS: Record<WalletMode, string> = {
  humanValidation: "L'agent prépare l'ordre, tu le valides avant envoi.",
  agentAsks: "L'agent propose l'ordre et attend ton Oui / Non.",
  agentAuthorized: "L'agent passe ses ordres seul, dans la limite du plafond de risque.",
};

/** Everything the client may know about a stored key. Never the key, never the secret. */
export interface TradingKeyRecord {
  id: string;
  agentId: string;
  agentSlot: number;
  platform: TradingPlatform;
  platformName: string;
  /** Last 4 characters of the API key, for recognition only. */
  keyHint: string;
  mode: WalletMode;
  riskCapUsd: number;
  createdAt: number;
  /** Fake data shipped with the skeleton. */
  demo?: boolean;
}

/** One-shot payload for the server function. Must not be kept after submit. */
export interface TradingKeySubmission {
  agentId: string;
  agentSlot: number;
  platform: TradingPlatform;
  customName?: string;
  apiKey: string;
  apiSecret: string;
  riskCapUsd: number;
}

export type TradingKeyField = "customName" | "apiKey" | "apiSecret" | "riskCapUsd";

export function platformDisplayName(platform: TradingPlatform, customName?: string) {
  if (platform === "custom") return customName?.trim() || "Plateforme";
  return TRADING_PLATFORM_OPTIONS.find((p) => p.value === platform)?.label ?? platform;
}

export function keyHintOf(apiKey: string) {
  return `••••${apiKey.trim().slice(-4)}`;
}

export function validateRiskCap(usd: number): string | null {
  if (!Number.isFinite(usd) || usd <= 0) return "Le plafond doit être supérieur à 0.";
  if (usd > TRADING_RISK_CAP_MAX_USD) return `Maximum ${TRADING_RISK_CAP_MAX_USD.toLocaleString("fr-FR")} $.`;
  return null;
}

export function validateTradingKeyInput(input: Omit<TradingKeySubmission, "agentId" | "agentSlot">) {
  const errors: Partial<Record<TradingKeyField, string>> = {};
  if (input.platform === "custom" && !input.customName?.trim()) errors.customName = "Indique le nom de la plateforme.";
  if (input.apiKey.trim().length < 8) errors.apiKey = "Clé API trop courte.";
  if (input.apiSecret.trim().length < 8) errors.apiSecret = "Secret trop court.";
  const cap = validateRiskCap(input.riskCapUsd);
  if (cap) errors.riskCapUsd = cap;
  return errors;
}

/** Same rule as wallets: a taken-back agent falls back to human validation. */
export function effectiveTradingMode(mode: WalletMode, overridden: boolean): WalletMode {
  return overridden ? "humanValidation" : mode;
}
