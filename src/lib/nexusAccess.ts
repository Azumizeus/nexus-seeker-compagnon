import { AnchorProvider, BN, Program, type Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import IDL from "../idl/nexusAccessIDL.json";
import type { Workspace } from "../idl/nexusAccessTypes";
import { CONFIG_ADDRESS, agentWalletPda, sharedWalletPda, walletLookupPda } from "./solana";
import type { WalletMode } from "./guards";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface SDKResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ConfigState {
  address: string;
  authority: string;
  pendingAuthority: string | null;
  guardian: string;
  seedAuthority: string;
  paused: boolean;
  version: number;
  maxWalletsPerAgent: number;
  totalWallets: number;
  sharedWallets: number;
  walletsPerAgent: number[];
  globalOverride: boolean;
  agentOverrideMask: number;
  globalSpendCapLamports: number;
  globalSpentLamports: number;
}

export interface AgentWalletState {
  address: string;
  agentId: number;
  walletIndex: number;
  walletPubkey: string;
  isShared: boolean;
  assignedAgentsMask: number;
  mode: WalletMode;
  spendCapLamports: number;
  spentLamports: number;
}

export interface TxResult {
  signature: string;
}

/** Minimal signer interface — matches AnchorWallet from wallet-adapter-react. */
export interface SignerWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

/* ------------------------------------------------------------------ */
/* Error mapping (order = #[error_code] enum, codes start at 6000)     */
/* ------------------------------------------------------------------ */

const PROGRAM_ERRORS = [
  "Action non autorisée pour ce wallet.",
  "Le programme est en pause.",
  "Identifiant d'agent invalide (0 à 6).",
  "Index de wallet invalide.",
  "Liste d'agents invalide.",
  "Limite totale de 20 wallets agent atteinte.",
  "Limite de wallets pour cet agent atteinte.",
  "Limite de 3 wallets communs atteinte.",
  "Limite par agent invalide : 1, 2, 5 ou 10 uniquement.",
  "Ce wallet n'est pas un wallet commun.",
  "Aucun transfert d'authority en attente.",
  "Le plafond dépasse le plafond global.",
  "Plafond de dépense du wallet dépassé.",
  "Plafond global de dépense dépassé.",
  "Dépassement arithmétique.",
];

export function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[nexus_access]", error);
  if (/user rejected|rejected the request|declined/i.test(message)) {
    return "Signature refusée dans le wallet.";
  }
  const custom = message.match(/"Custom":\s*(\d+)/) ?? message.match(/custom program error: 0x([0-9a-f]+)/i);
  if (custom) {
    const code = custom[0].includes("0x") ? parseInt(custom[1], 16) : parseInt(custom[1], 10);
    const text = PROGRAM_ERRORS[code - 6000];
    if (text) return text;
  }
  if (/insufficient (funds|lamports)|debit an account/i.test(message)) {
    return "Solde SOL insuffisant pour payer les frais (devnet).";
  }
  if (/failed to fetch|network/i.test(message)) return "Connexion au réseau impossible.";
  return message || "Erreur inconnue.";
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type AnchorMode = { humanValidation: Record<string, never> } | { agentAsks: Record<string, never> } | { agentAuthorized: Record<string, never> };

function modeFromAnchor(mode: object): WalletMode {
  const key = Object.keys(mode)[0];
  if (key === "agentAsks" || key === "agentAuthorized") return key;
  return "humanValidation";
}

function modeToAnchor(mode: WalletMode): AnchorMode {
  if (mode === "agentAsks") return { agentAsks: {} };
  if (mode === "agentAuthorized") return { agentAuthorized: {} };
  return { humanValidation: {} };
}

function safeBN(value: number) {
  if (!Number.isFinite(value) || value < 0) return new BN(0);
  return new BN(Math.floor(value).toString());
}

function bnToNumber(value: BN | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  try {
    return value.toNumber();
  } catch {
    return Number(value.toString());
  }
}

function solToLamportsBN(sol: number) {
  return safeBN(Math.round(sol * LAMPORTS_PER_SOL));
}

const readOnlyWallet: Wallet = {
  publicKey: PublicKey.default,
  signTransaction: async () => {
    throw new Error("Wallet non connecté");
  },
  signAllTransactions: async () => {
    throw new Error("Wallet non connecté");
  },
} as unknown as Wallet;

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

export class NexusAccessClient {
  readonly connection: Connection;
  readonly program: Program<Workspace>;
  private readonly wallet: SignerWallet | null;

  constructor(connection: Connection, wallet: SignerWallet | null) {
    this.connection = connection;
    this.wallet = wallet;
    const provider = new AnchorProvider(connection, (wallet ?? readOnlyWallet) as Wallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
      skipPreflight: true,
    });
    this.program = new Program<Workspace>(IDL as Workspace, provider);
  }

  get canSign() {
    return this.wallet !== null;
  }

  private requireSigner(): PublicKey {
    if (!this.wallet) throw new Error("Wallet non connecté");
    return this.wallet.publicKey;
  }

  private async run(label: string, build: (signer: PublicKey) => Promise<string>): Promise<SDKResult<TxResult>> {
    try {
      const signer = this.requireSigner();
      const signature = await build(signer);
      return { success: true, data: { signature } };
    } catch (error) {
      console.error(`[nexus_access] ${label} failed`, error);
      return { success: false, error: describeError(error) };
    }
  }

  /* ----------------------------- reads ----------------------------- */

  async fetchConfig(): Promise<SDKResult<ConfigState>> {
    try {
      const c = await this.program.account.config.fetch(CONFIG_ADDRESS);
      return {
        success: true,
        data: {
          address: CONFIG_ADDRESS.toBase58(),
          authority: c.authority.toBase58(),
          pendingAuthority: c.pendingAuthority ? c.pendingAuthority.toBase58() : null,
          guardian: c.guardian.toBase58(),
          seedAuthority: c.seedAuthority.toBase58(),
          paused: c.paused,
          version: c.version,
          maxWalletsPerAgent: c.maxWalletsPerAgent,
          totalWallets: c.totalWallets,
          sharedWallets: c.sharedWallets,
          walletsPerAgent: Array.from(c.walletsPerAgent),
          globalOverride: c.globalOverride,
          agentOverrideMask: c.agentOverrideMask,
          globalSpendCapLamports: bnToNumber(c.globalSpendCapLamports),
          globalSpentLamports: bnToNumber(c.globalSpentLamports),
        },
      };
    } catch (error) {
      return { success: false, error: describeError(error) };
    }
  }

  async fetchAgentWallets(): Promise<SDKResult<AgentWalletState[]>> {
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Délai dépassé")), 15000));
      const all = await Promise.race([this.program.account.agentWallet.all(), timeout]);
      if (!all?.length) return { success: true, data: [] };
      const data = all
        .map(({ publicKey, account }) => ({
          address: publicKey.toBase58(),
          agentId: account.agentId,
          walletIndex: account.walletIndex,
          walletPubkey: account.walletPubkey.toBase58(),
          isShared: account.isShared,
          assignedAgentsMask: account.assignedAgentsMask,
          mode: modeFromAnchor(account.mode),
          spendCapLamports: bnToNumber(account.spendCapLamports),
          spentLamports: bnToNumber(account.spentLamports),
        }))
        .sort((a, b) => Number(a.isShared) - Number(b.isShared) || a.agentId - b.agentId || a.walletIndex - b.walletIndex);
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Account does not exist")) return { success: true, data: [] };
      return { success: false, error: describeError(error) };
    }
  }

  async fetchBalances(addresses: string[]): Promise<SDKResult<Record<string, number>>> {
    try {
      if (!addresses.length) return { success: true, data: {} };
      const infos = await this.connection.getMultipleAccountsInfo(addresses.map((a) => new PublicKey(a)));
      const data: Record<string, number> = {};
      addresses.forEach((a, i) => {
        data[a] = infos[i]?.lamports ?? 0;
      });
      return { success: true, data };
    } catch (error) {
      return { success: false, error: describeError(error) };
    }
  }

  async fetchSolBalance(account?: PublicKey): Promise<SDKResult<number>> {
    const target = account ?? this.wallet?.publicKey;
    if (!target) return { success: false, error: "Wallet non connecté" };
    try {
      return { success: true, data: await this.connection.getBalance(target) };
    } catch (error) {
      return { success: false, error: describeError(error) };
    }
  }

  /* ---------------------- authority & guardian ---------------------- */

  proposeAuthority(newAuthority: string) {
    return this.run("propose_authority", (authority) =>
      this.program.methods
        .proposeAuthority(new PublicKey(newAuthority))
        .accountsPartial({ config: CONFIG_ADDRESS, authority })
        .rpc({ skipPreflight: true }),
    );
  }

  acceptAuthority() {
    return this.run("accept_authority", (newAuthority) =>
      this.program.methods
        .acceptAuthority()
        .accountsPartial({ config: CONFIG_ADDRESS, newAuthority })
        .rpc({ skipPreflight: true }),
    );
  }

  setGuardian(newGuardian: string) {
    return this.run("set_guardian", (authority) =>
      this.program.methods
        .setGuardian(new PublicKey(newGuardian))
        .accountsPartial({ config: CONFIG_ADDRESS, authority })
        .rpc({ skipPreflight: true }),
    );
  }

  /** Authority or guardian. */
  pause() {
    return this.run("pause", (signer) =>
      this.program.methods.pause().accountsPartial({ config: CONFIG_ADDRESS, signer }).rpc({ skipPreflight: true }),
    );
  }

  /** Authority only. */
  unpause() {
    return this.run("unpause", (authority) =>
      this.program.methods.unpause().accountsPartial({ config: CONFIG_ADDRESS, authority }).rpc({ skipPreflight: true }),
    );
  }

  setMaxWalletsPerAgent(n: number) {
    return this.run("set_max_wallets_per_agent", (authority) =>
      this.program.methods
        .setMaxWalletsPerAgent(n)
        .accountsPartial({ config: CONFIG_ADDRESS, authority })
        .rpc({ skipPreflight: true }),
    );
  }

  setGlobalSpendCap(capSol: number) {
    return this.run("set_global_spend_cap", (authority) =>
      this.program.methods
        .setGlobalSpendCap(solToLamportsBN(capSol))
        .accountsPartial({ config: CONFIG_ADDRESS, authority })
        .rpc({ skipPreflight: true }),
    );
  }

  resetGlobalSpent() {
    return this.run("reset_global_spent", (authority) =>
      this.program.methods.resetGlobalSpent().accountsPartial({ config: CONFIG_ADDRESS, authority }).rpc({ skipPreflight: true }),
    );
  }

  /* -------------------------- agent wallets -------------------------- */

  registerAgentWallet(params: { agentId: number; walletIndex: number; walletPubkey: string; spendCapSol: number }) {
    return this.run("register_agent_wallet", (authority) => {
      const walletPubkey = new PublicKey(params.walletPubkey);
      return this.program.methods
        .registerAgentWallet(params.agentId, params.walletIndex, walletPubkey, solToLamportsBN(params.spendCapSol))
        .accountsPartial({
          config: CONFIG_ADDRESS,
          agentWallet: agentWalletPda(params.agentId, params.walletIndex),
          walletLookup: walletLookupPda(walletPubkey),
          authority,
        })
        .rpc({ skipPreflight: true });
    });
  }

  registerSharedWallet(params: { walletIndex: number; walletPubkey: string; agentsMask: number; spendCapSol: number }) {
    return this.run("register_shared_wallet", (authority) => {
      const walletPubkey = new PublicKey(params.walletPubkey);
      return this.program.methods
        .registerSharedWallet(params.walletIndex, walletPubkey, params.agentsMask, solToLamportsBN(params.spendCapSol))
        .accountsPartial({
          config: CONFIG_ADDRESS,
          agentWallet: sharedWalletPda(params.walletIndex),
          walletLookup: walletLookupPda(walletPubkey),
          authority,
        })
        .rpc({ skipPreflight: true });
    });
  }

  assignSharedWallet(walletAddress: string, agentsMask: number) {
    return this.run("assign_shared_wallet", (authority) =>
      this.program.methods
        .assignSharedWallet(agentsMask)
        .accountsPartial({ config: CONFIG_ADDRESS, agentWallet: new PublicKey(walletAddress), authority })
        .rpc({ skipPreflight: true }),
    );
  }

  revokeAgentWallet(walletAddress: string, walletPubkey: string) {
    return this.run("revoke_agent_wallet", (authority) =>
      this.program.methods
        .revokeAgentWallet()
        .accountsPartial({
          config: CONFIG_ADDRESS,
          agentWallet: new PublicKey(walletAddress),
          walletLookup: walletLookupPda(new PublicKey(walletPubkey)),
          authority,
        })
        .rpc({ skipPreflight: true }),
    );
  }

  setWalletMode(walletAddress: string, mode: WalletMode) {
    return this.run("set_wallet_mode", (authority) =>
      this.program.methods
        .setWalletMode(modeToAnchor(mode))
        .accountsPartial({ config: CONFIG_ADDRESS, agentWallet: new PublicKey(walletAddress), authority })
        .rpc({ skipPreflight: true }),
    );
  }

  setWalletSpendCap(walletAddress: string, capSol: number) {
    return this.run("set_wallet_spend_cap", (authority) =>
      this.program.methods
        .setWalletSpendCap(solToLamportsBN(capSol))
        .accountsPartial({ config: CONFIG_ADDRESS, agentWallet: new PublicKey(walletAddress), authority })
        .rpc({ skipPreflight: true }),
    );
  }

  resetWalletSpent(walletAddress: string) {
    return this.run("reset_wallet_spent", (authority) =>
      this.program.methods
        .resetWalletSpent()
        .accountsPartial({ config: CONFIG_ADDRESS, agentWallet: new PublicKey(walletAddress), authority })
        .rpc({ skipPreflight: true }),
    );
  }

  /**
   * Server-only in practice: the `sign-agent-tx` edge function calls this after a
   * spend. Exposed here for completeness; the UI never calls it.
   */
  recordSpend(walletAddress: string, amountSol: number) {
    return this.run("record_spend", (authority) =>
      this.program.methods
        .recordSpend(solToLamportsBN(amountSol))
        .accountsPartial({ config: CONFIG_ADDRESS, agentWallet: new PublicKey(walletAddress), authority })
        .rpc({ skipPreflight: true }),
    );
  }

  /* ------------------------ take back control ------------------------ */

  /** Authority or guardian — one write, all wallets fall back to human validation. */
  takeBackControl() {
    return this.run("take_back_control", (signer) =>
      this.program.methods.takeBackControl().accountsPartial({ config: CONFIG_ADDRESS, signer }).rpc({ skipPreflight: true }),
    );
  }

  takeBackControlForAgent(agentId: number) {
    return this.run("take_back_control_for_agent", (signer) =>
      this.program.methods
        .takeBackControlForAgent(agentId)
        .accountsPartial({ config: CONFIG_ADDRESS, signer })
        .rpc({ skipPreflight: true }),
    );
  }

  /** Authority only. */
  releaseControl() {
    return this.run("release_control", (authority) =>
      this.program.methods.releaseControl().accountsPartial({ config: CONFIG_ADDRESS, authority }).rpc({ skipPreflight: true }),
    );
  }

  releaseControlForAgent(agentId: number) {
    return this.run("release_control_for_agent", (authority) =>
      this.program.methods
        .releaseControlForAgent(agentId)
        .accountsPartial({ config: CONFIG_ADDRESS, authority })
        .rpc({ skipPreflight: true }),
    );
  }

  /* ----------------------------- events ----------------------------- */

  /** Subscribes to a program event over websocket (camelCase name, e.g. "spendRecorded"). */
  onEvent(name: string, callback: (event: Record<string, unknown>, slot: number, signature: string) => void) {
    const id = this.program.addEventListener(name as never, callback as never);
    return () => {
      void this.program.removeEventListener(id);
    };
  }
}
