import { useCallback, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import type { Adapter, WalletError } from "@solana/wallet-adapter-base";
import type { ConnectionConfig } from "@solana/web3.js";
import { RPC_ENDPOINT } from "@/lib/solana";

/**
 * Module-level constants on purpose: ConnectionProvider rebuilds its Connection
 * whenever `config` changes identity, and WalletProvider re-wraps every adapter
 * whenever `wallets` changes identity. Inline `{...}` / `[]` literals create a
 * new identity on every render, which cascades into a new Connection, a new
 * program client and a re-render storm in every consumer.
 */
const CONNECTION_CONFIG: ConnectionConfig = { commitment: "confirmed" };

/**
 * Empty list = Wallet Standard discovery only (Phantom, Backpack, Rabby when it
 * exposes Solana, Seed Vault Wallet…). On Android, WalletProvider also injects
 * the Mobile Wallet Adapter, which is the path Seed Vault uses on the Seeker.
 */
const WALLETS: Adapter[] = [];

export default function SolanaProvider({ children }: { children: ReactNode }) {
  const onError = useCallback((error: WalletError) => {
    console.error("[wallet]", error);
  }, []);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT} config={CONNECTION_CONFIG}>
      <WalletProvider wallets={WALLETS} autoConnect onError={onError}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
