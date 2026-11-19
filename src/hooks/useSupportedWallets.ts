import { useMemo } from "react";
import { useWallet, type Wallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";

export interface SupportedWallet {
  key: "phantom" | "backpack" | "rabby" | "seedvault";
  label: string;
  hint: string;
  /** Detected wallet (Wallet Standard or Mobile Wallet Adapter), if any. */
  match?: Wallet;
}

const SPECS: Array<Omit<SupportedWallet, "match"> & { pattern: RegExp }> = [
  { key: "phantom", label: "Phantom", hint: "Extension ou app mobile", pattern: /phantom/i },
  { key: "backpack", label: "Backpack", hint: "Extension ou app mobile", pattern: /backpack/i },
  { key: "rabby", label: "Rabby Wallet", hint: "Détecté s'il expose un compte Solana", pattern: /rabby/i },
  {
    key: "seedvault",
    label: "Seed Vault (Solana Seeker)",
    hint: "Signature matérielle via Mobile Wallet Adapter",
    pattern: /seed ?vault|mobile wallet adapter/i,
  },
];

/** Detection status for the four wallets the companion supports explicitly. */
export function useSupportedWallets(): SupportedWallet[] {
  const { wallets } = useWallet();
  return useMemo(
    () =>
      SPECS.map(({ pattern, ...spec }) => ({
        ...spec,
        match: wallets.find(
          (w) =>
            pattern.test(w.adapter.name) &&
            (w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable),
        ),
      })),
    [wallets],
  );
}
