import { useState } from "react";
import Button from "@/components/shared/Button";
import { GuardNotice } from "@/components/shared/Notices";
import AddTradingKeyDialog from "./AddTradingKeyDialog";
import TradingKeyCard from "./TradingKeyCard";
import { useAgentTradingKeys } from "@/hooks/useAgentTradingKeys";
import type { Agent } from "@/lib/models";
import { TRADING_KEYS_PER_AGENT_MAX } from "@/lib/tradingKeys";

/** "Clés API de trading" section of an agent card. Skeleton: mock server, no network. */
export default function AgentTradingKeys({ agent, canEdit }: { agent: Agent; canEdit: boolean }) {
  const trading = useAgentTradingKeys(agent);
  const [dialogKey, setDialogKey] = useState<number | null>(null);

  return (
    <div className="stack !gap-3" data-testid={`trading-keys-${agent.slot}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="label">
          Clés API de trading ({trading.keys.length}/{TRADING_KEYS_PER_AGENT_MAX})
        </p>
        {canEdit && (
          <Button variant="outline" size="sm" disabled={!trading.canAdd} onClick={() => setDialogKey(Date.now())}>
            + Clé API
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">Aperçu : aucune clé n'est envoyée, les données sont factices.</p>

      {trading.overridden && trading.keys.length > 0 && (
        <GuardNotice tone="danger">Contrôle repris : tout le trading de {agent.name} repasse en validation humaine.</GuardNotice>
      )}

      {trading.keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune clé. Ajoute une plateforme (Bitunix, Evedex ou autre) pour que {agent.name} puisse trader.</p>
      ) : (
        trading.keys.map((k) => <TradingKeyCard key={k.id} tradingKey={k} agentName={agent.name} trading={trading} canEdit={canEdit} />)
      )}

      {dialogKey !== null && (
        <AddTradingKeyDialog key={dialogKey} open onOpenChange={(o) => !o && setDialogKey(null)} agentName={agent.name} trading={trading} />
      )}
    </div>
  );
}
