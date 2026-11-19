import { useCallback, useMemo, type ReactNode } from "react";
import { ConnectionContext, WalletProvider } from "@solana/wallet-adapter-react";
import type { Adapter, WalletError } from "@solana/wallet-adapter-base";
import type { ConnectionConfig } from "@solana/web3.js";
import { createResilientConnection } from "@/lib/rpc";

/**
 * Module-level constants on purpose: a new `config` identity would rebuild the
 * Connection and cascade into a new program client and a re-render storm in
 * every consumer. Same for `wallets`.
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

  // One Connection for the whole app: reads retry and rotate endpoints on 429.
  const connection = useMemo(() => createResilientConnection(undefined, CONNECTION_CONFIG), []);
  const contextValue = useMemo(() => ({ connection }), [connection]);

  return (
    <ConnectionContext.Provider value={contextValue}>
      <WalletProvider wallets={WALLETS} autoConnect onError={onError}>
        {children}
      </WalletProvider>
    </ConnectionContext.Provider>
  );
}
