import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { cn, shortAddress } from "@/lib/utils";
import { explorerAddressUrl } from "@/lib/solana";

interface AddressChipProps {
  address: string | null | undefined;
  label?: string;
  chars?: number;
  explorer?: boolean;
  className?: string;
}

/** Truncated address with copy + explorer link. */
export default function AddressChip({ address, label, chars = 4, explorer = true, className }: AddressChipProps) {
  const [copied, setCopied] = useState(false);
  if (!address) return <span className="font-mono text-sm text-muted-foreground">—</span>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("[clipboard]", error);
    }
  };

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-xl bg-surface-sunken pl-2.5 font-mono text-sm", className)}>
      {label && <span className="mr-1 font-body text-xs font-semibold text-muted-foreground">{label}</span>}
      <span title={address}>{shortAddress(address, chars)}</span>
      <button
        type="button"
        onClick={copy}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
        aria-label="Copier l'adresse"
      >
        {copied ? <Check className="h-4 w-4 text-primary-ink" /> : <Copy className="h-4 w-4" />}
      </button>
      {explorer && (
        <a
          href={explorerAddressUrl(address)}
          target="_blank"
          rel="noreferrer"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
          aria-label="Voir dans l'explorateur"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </span>
  );
}
