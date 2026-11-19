import { useCallback, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import type { WalletError } from "@solana/wallet-adapter-base";
import { RPC_ENDPOINT } from "@/lib/solana";

/**
 * Wallets are discovered through the Wallet Standard (Phantom, Backpack, Rabby
 * when it exposes Solana, Seed Vault Wallet…). On Android, WalletProvider also
 * injects the Mobile Wallet Adapter automatically — that is the path used by
 * Seed Vault on the Solana Seeker. The endpoint contains "devnet", which MWA
 * uses to pick the cluster.
 */
export default function SolanaProvider({ children }: { children: ReactNode }) {
  const onError = useCallback((error: WalletError) => {
    console.error("[wallet]", error);
  }, []);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={[]} autoConnect onError={onError}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
