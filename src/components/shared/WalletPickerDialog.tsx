import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import Modal from "./Modal";
import Badge from "./Badge";
import { useNexus } from "@/hooks/useNexus";
import { useSupportedWallets } from "@/hooks/useSupportedWallets";

/** Custom wallet picker (replaces the default wallet-adapter modal). */
export default function WalletPickerDialog() {
  const { walletPickerOpen, setWalletPickerOpen } = useNexus();
  const { wallets, select } = useWallet();
  const supported = useSupportedWallets();

  const others = useMemo(
    () =>
      wallets.filter(
        (w) =>
          !supported.some((s) => s.match?.adapter.name === w.adapter.name) &&
          (w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable),
      ),
    [wallets, supported],
  );

  const choose = (name: WalletName) => {
    select(name);
    setWalletPickerOpen(false);
  };

  return (
    <Modal
      open={walletPickerOpen}
      onOpenChange={setWalletPickerOpen}
      title="Connecter mon wallet"
      description="Ton wallet reste non-custodial : chaque action est signée par toi, jamais par l'app ni par une IA."
    >
      <ul className="stack !gap-2">
        {supported.map((s) => {
          const detected = !!s.match;
          return (
            <li key={s.key}>
              <button
                type="button"
                disabled={!detected}
                onClick={() => s.match && choose(s.match.adapter.name)}
                className="flex min-h-[60px] w-full items-center gap-3 rounded-2xl border-[1.5px] border-border-strong bg-surface px-4 text-left transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {s.match?.adapter.icon ? (
                  <img src={s.match.adapter.icon} alt="" className="h-8 w-8 rounded-lg" />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-sunken font-display text-sm font-bold">
                    {s.label[0]}
                  </span>
                )}
                <span className="flex-1">
                  <span className="block font-semibold">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.hint}</span>
                </span>
                <Badge tone={detected ? "success" : "neutral"}>{detected ? "Détecté" : "Non détecté"}</Badge>
              </button>
            </li>
          );
        })}
        {others.map((w) => (
          <li key={w.adapter.name}>
            <button
              type="button"
              onClick={() => choose(w.adapter.name)}
              className="flex min-h-[60px] w-full items-center gap-3 rounded-2xl border-[1.5px] border-border bg-surface px-4 text-left hover:border-foreground"
            >
              <img src={w.adapter.icon} alt="" className="h-8 w-8 rounded-lg" />
              <span className="flex-1 font-semibold">{w.adapter.name}</span>
              <Badge tone="success">Détecté</Badge>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Réseau : Devnet uniquement. Sur le Solana Seeker, Seed Vault passe par le Mobile Wallet Adapter.
      </p>
    </Modal>
  );
}
