import StatusBadge from "@/components/shared/StatusBadge";
import { ConnectPrompt, GuardNotice } from "@/components/shared/Notices";
import ConfigCard from "@/components/home/ConfigCard";
import ActivityFeed from "@/components/home/ActivityFeed";
import { useNexus } from "@/hooks/useNexus";
import { networkReason } from "@/lib/guards";

export default function HomeScreen() {
  const { connected, network } = useNexus();
  const netReason = network === "wrong" || network === "offline" ? networkReason(network) : undefined;

  return (
    <div className="stack !gap-5 animate-rise">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Tableau de bord</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Bonjour.</h1>
        </div>
        <StatusBadge />
      </div>

      {netReason && <GuardNotice tone="danger">{netReason} Toutes les actions sont bloquées.</GuardNotice>}
      {!connected && <ConnectPrompt description="Lecture libre de la Config et du journal. Pour signer quoi que ce soit, connecte ton wallet." />}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <ConfigCard />
        <ActivityFeed />
      </div>
    </div>
  );
}
