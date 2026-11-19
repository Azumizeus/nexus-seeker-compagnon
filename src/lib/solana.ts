import { PublicKey } from "@solana/web3.js";

/**
 * nexus_access — on-chain registry for agent wallets (devnet only).
 * The program holds no funds; the server-side `sign-agent-tx` function
 * reads this state (mode, caps, overrides, pause) before signing.
 */
export const NETWORK = "devnet" as const;

/**
 * Endpoint RPC. Aucune clé n'est écrite dans le code : on lit la variable
 * d'environnement et on retombe sur le RPC public devnet sinon.
 * Attention : tout ce qui est préfixé VITE_ finit dans le bundle client.
 */
export const RPC_ENDPOINT: string =
  import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";

/** Genesis hash of Solana devnet — used to detect a wrong network on the RPC. */
export const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

export const NEXUS_ACCESS_PROGRAM_ID = new PublicKey(
  "AnqYwe2voTSYNmaPsmHXpJgY9LboBXCg3orbk7cemfL1",
);

/**
 * Config PDA. Seeds are ["config", seed_authority] where seed_authority is the
 * original initializer, so the address stays stable after authority transfers.
 */
export const CONFIG_ADDRESS = new PublicKey(
  "5g4u3GdVQ3uypa7ERmo9BUy5mYg8BH5RyBCRx7qgwXZ6",
);
export const configAddress = CONFIG_ADDRESS;

export const GUARDIAN_ADDRESS = new PublicKey(
  "8sWbmZg4PqL1Sf2G7fmjGsnjjnrPgW2nB2nCGS6GEXFQ",
);

/** On-chain limits — must mirror the program constants. */
export const ONCHAIN_MAX_AGENTS = 7;
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

export const explorerTxUrl = (signature: string) =>
  `https://explorer.solana.com/tx/${signature}?cluster=${NETWORK}`;
