import { ONCHAIN_MAX_AGENTS } from "./solana";

/**
 * App-level limits. MAX_AGENTS is easy to change here, but it can never exceed
 * the on-chain limit (ONCHAIN_MAX_AGENTS = 7): raising it beyond 7 also requires
 * a program upgrade, because agent ids are on-chain slots 0..6.
 */
export const MAX_AGENTS = Math.min(7, ONCHAIN_MAX_AGENTS);

export const APP_NAME = "Nexus Seeker Compagnon";
export const APP_VERSION = "0.1.0-devnet";
export const GITHUB_URL = "https://github.com/Azumizeus/noah-6afe87730f0fdce9c2aada85-1hv1";
