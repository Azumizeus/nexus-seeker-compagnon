import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ChevronDown, Copy, LogOut, Wallet } from "lucide-react";
import Button from "./Button";
import { useNexus } from "@/hooks/useNexus";
import { cn, formatSol, shortAddress } from "@/lib/utils";

/** Header wallet control: connect, or address + menu (balance, copy, disconnect). */
export default function WalletButton({ compact = false }: { compact?: boolean }) {
  const { connected, publicKey, client, chainTick, openWalletPicker } = useNexus();
  const { disconnect, connecting, wallet } = useWallet();
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!publicKey) return;
    let alive = true;
    client.fetchSolBalance().then((r) => {
      if (alive) setBalance(r.success ? (r.data ?? 0) : null);
    });
    return () => {
      alive = false;
    };
  }, [client, publicKey, chainTick, open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!connected || !publicKey) {
    return (
      <Button variant="primary" onClick={openWalletPicker} loading={connecting} data-testid="wallet-connect">
        <Wallet className="h-4 w-4" aria-hidden />
        <span className={cn(compact && "sr-only sm:not-sr-only")}>Connecter mon wallet</span>
      </Button>
    );
  }

  const copy = async () => {
    await navigator.clipboard.writeText(publicKey).catch((e) => console.error("[clipboard]", e));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        {wallet?.adapter.icon && <img src={wallet.adapter.icon} alt="" className="h-5 w-5 rounded" />}
        <span className="font-mono text-sm">{shortAddress(publicKey)}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
      </Button>
      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 animate-rise rounded-2xl border-2 border-foreground bg-surface p-2 shadow-float">
          <div className="rounded-xl bg-surface-sunken p-3">
            <p className="eyebrow">Solde · devnet</p>
            <p className="font-display text-2xl font-semibold">{formatSol(balance)}</p>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{publicKey}</p>
          </div>
          <button role="menuitem" type="button" onClick={copy} className="mt-1 flex min-h-tap w-full items-center gap-3 rounded-xl px-3 text-left font-medium hover:bg-surface-sunken">
            <Copy className="h-4 w-4" aria-hidden />
            {copied ? "Adresse copiée" : "Copier l'adresse"}
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              void disconnect();
            }}
            className="flex min-h-tap w-full items-center gap-3 rounded-xl px-3 text-left font-medium text-danger-ink hover:bg-danger-soft"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
