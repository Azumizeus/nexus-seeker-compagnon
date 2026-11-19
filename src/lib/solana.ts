import { PublicKey } from "@solana/web3.js";

/**
 * nexus_access — on-chain registry for agent wallets (devnet only).
 * The program holds no funds; the server-side `sign-agent-tx` function
 * reads this state (mode, caps, overrides, pause) before signing.
 */
export const NETWORK = "devnet" as const;

export const NEXUS_ACCESS_PROGRAM_ID = new PublicKey(
  "4KYPRuiqqTwSmiG3628UexKce2U93y6cgkAKzDqRAfx7",
);

/**
 * Config PDA. Seeds are ["config", seed_authority] where seed_authority is the
 * original initializer, so the address stays stable after authority transfers.
 */
export const CONFIG_ADDRESS = new PublicKey(
  "4wExvrq7ERVL3qx4bVeC1PsCLvpAQRkdbpMuKJHUtWQ7",
);
export const configAddress = CONFIG_ADDRESS;

export const GUARDIAN_ADDRESS = new PublicKey(
  "8sWbmZg4PqL1Sf2G7fmjGsnjjnrPgW2nB2nCGS6GEXFQ",
);

/** On-chain limits — must mirror the program constants. */
export const MAX_AGENTS = 7;
export const MAX_TOTAL_WALLETS = 20;
export const MAX_SHARED_WALLETS = 3;
export const MAX_INDIVIDUAL_WALLET_INDEX = 10;
export const ALLOWED_PER_AGENT_LIMITS = [1, 2, 5, 10] as const;
export const DEFAULT_PER_AGENT_LIMIT = 5;
export const SHARED_AGENT_ID = 255;
export const DEFAULT_GLOBAL_SPEND_CAP_LAMPORTS = 2_000_000_000;

const enc = new TextEncoder();

export const agentWalletPda = (agentId: number, walletIndex: number) =>
  PublicKey.findProgramAddressSync(
    [enc.encode("agent_wallet"), Uint8Array.of(agentId), Uint8Array.of(walletIndex)],
    NEXUS_ACCESS_PROGRAM_ID,
  )[0];

export const sharedWalletPda = (walletIndex: number) =>
  PublicKey.findProgramAddressSync(
    [enc.encode("shared_wallet"), Uint8Array.of(walletIndex)],
    NEXUS_ACCESS_PROGRAM_ID,
  )[0];

export const walletLookupPda = (walletPubkey: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [enc.encode("wallet_lookup"), walletPubkey.toBytes()],
    NEXUS_ACCESS_PROGRAM_ID,
  )[0];

export const explorerAddressUrl = (address: string) =>
  `https://explorer.solana.com/address/${address}?cluster=${NETWORK}`;
