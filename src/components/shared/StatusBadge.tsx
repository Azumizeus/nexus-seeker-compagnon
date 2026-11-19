import Badge from "./Badge";
import { useNexus } from "@/hooks/useNexus";

/** Connecté / Déconnecté / Mauvais réseau. */
export default function StatusBadge() {
  const { connected, network } = useNexus();
  if (network === "wrong") return <Badge tone="danger" dot data-testid="status-badge">Mauvais réseau</Badge>;
  if (network === "offline") return <Badge tone="danger" dot data-testid="status-badge">Réseau injoignable</Badge>;
  if (!connected) return <Badge tone="neutral" dot data-testid="status-badge">Déconnecté</Badge>;
  if (network === "checking") return <Badge tone="warning" dot data-testid="status-badge">Vérification…</Badge>;
  return <Badge tone="success" dot data-testid="status-badge">Connecté · Devnet</Badge>;
}
