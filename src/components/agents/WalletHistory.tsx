import { useEffect, useState } from "react";
import { PublicKey, type ConfirmedSignatureInfo } from "@solana/web3.js";
import { ExternalLink } from "lucide-react";
import { useNexus } from "@/hooks/useNexus";
import { explorerTxUrl } from "@/lib/solana";
import { formatRelative } from "@/lib/utils";

/** Last transactions of one agent wallet (loaded when expanded). */
export default function WalletHistory({ walletPubkey }: { walletPubkey: string }) {
  const { client, chainTick } = useNexus();
  const [items, setItems] = useState<ConfirmedSignatureInfo[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    client.connection
      .getSignaturesForAddress(new PublicKey(walletPubkey), { limit: 5 })
      .then((sigs) => alive && setItems(sigs))
      .catch((e) => {
        console.error("[wallet history]", e);
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [client, walletPubkey, chainTick]);

  if (error) return <p className="text-sm text-muted-foreground">Historique indisponible.</p>;
  if (!items) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!items.length) return <p className="text-sm text-muted-foreground">Aucune transaction pour ce wallet.</p>;

  return (
    <ul className="stack !gap-1">
      {items.map((s) => (
        <li key={s.signature}>
          <a
            href={explorerTxUrl(s.signature)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-tap items-center gap-2 rounded-xl px-2 text-sm hover:bg-surface-sunken"
          >
            <span className={s.err ? "font-semibold text-danger-ink" : "font-semibold"}>{s.err ? "Échec" : "OK"}</span>
            <span className="font-mono text-xs">{s.signature.slice(0, 12)}…</span>
            <span className="ml-auto text-xs text-muted-foreground">{s.blockTime ? formatRelative(s.blockTime * 1000) : ""}</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}
