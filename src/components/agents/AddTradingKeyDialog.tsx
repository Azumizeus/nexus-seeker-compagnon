import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import Modal from "@/components/shared/Modal";
import Button from "@/components/shared/Button";
import type { AgentTradingKeysApi } from "@/hooks/useAgentTradingKeys";
import { TRADING_PLATFORM_OPTIONS, TRADING_RISK_CAP_MAX_USD, validateTradingKeyInput, type TradingPlatform } from "@/lib/tradingKeys";
import { cn } from "@/lib/utils";

interface AddTradingKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  trading: AgentTradingKeysApi;
}

const inputClass = "min-h-tap w-full rounded-2xl border-[1.5px] border-border-strong bg-surface px-4 text-base outline-none focus:border-foreground";

/**
 * Collects a trading API key + secret and sends them once to the server function.
 * Fields are wiped right after submit; nothing is persisted on the client. Remount via `key` to reset.
 */
export default function AddTradingKeyDialog({ open, onOpenChange, agentName, trading }: AddTradingKeyDialogProps) {
  const [platform, setPlatform] = useState<TradingPlatform>("bitunix");
  const [customName, setCustomName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [cap, setCap] = useState("250");
  const [touched, setTouched] = useState(false);

  const input = { platform, customName, apiKey, apiSecret, riskCapUsd: Number(cap) };
  const errors = validateTradingKeyInput(input);
  const ready = Object.keys(errors).length === 0;
  const show = (field: keyof typeof errors) => touched && errors[field];

  const submit = async () => {
    setTouched(true);
    if (!ready) return;
    const payload = { ...input, customName: platform === "custom" ? customName.trim() : undefined, apiKey: apiKey.trim(), apiSecret: apiSecret.trim() };
    // Wipe the secrets from component state before the request settles.
    setApiKey("");
    setApiSecret("");
    if (await trading.addKey(payload)) onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Clé API de trading · ${agentName}`}
      description="Une plateforme d'échange crypto, une clé, un secret."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="primary" loading={trading.pending === "add"} disabled={touched && !ready} onClick={() => void submit()}>
            Envoyer au serveur
          </Button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="tk-platform" className="label">Plateforme</label>
        <select id="tk-platform" value={platform} onChange={(e) => setPlatform(e.target.value as TradingPlatform)} className={inputClass}>
          {TRADING_PLATFORM_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {platform === "custom" && (
        <div className="field">
          <label htmlFor="tk-name" className="label">Nom de la plateforme</label>
          <input id="tk-name" value={customName} onChange={(e) => setCustomName(e.target.value)} className={inputClass} placeholder="Ex. Hyperliquid" autoComplete="off" />
          {show("customName") && <p className="text-xs font-medium text-danger-ink">{errors.customName}</p>}
        </div>
      )}

      <div className="field">
        <label htmlFor="tk-key" className="label">Clé API</label>
        <input id="tk-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className={cn(inputClass, "font-mono text-sm")} autoComplete="off" spellCheck={false} />
        {show("apiKey") && <p className="text-xs font-medium text-danger-ink">{errors.apiKey}</p>}
      </div>

      <div className="field">
        <label htmlFor="tk-secret" className="label">Secret</label>
        <input id="tk-secret" type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className={cn(inputClass, "font-mono text-sm")} autoComplete="off" spellCheck={false} />
        {show("apiSecret") && <p className="text-xs font-medium text-danger-ink">{errors.apiSecret}</p>}
      </div>

      <div className="field">
        <label htmlFor="tk-cap" className="label">Plafond de risque ($) · max {TRADING_RISK_CAP_MAX_USD.toLocaleString("fr-FR")}</label>
        <input id="tk-cap" inputMode="decimal" value={cap} onChange={(e) => setCap(e.target.value.replace(",", "."))} className={inputClass} />
        {show("riskCapUsd") && <p className="text-xs font-medium text-danger-ink">{errors.riskCapUsd}</p>}
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-surface-sunken px-3 py-2 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden />
        <p>
          La clé et le secret partent une seule fois vers le serveur, y sont chiffrés, et ne seront plus jamais affichés. L'app ne garde que les
          4 derniers caractères de la clé. Désactive le droit de retrait sur la plateforme. La clé démarre en « Validation humaine requise ».
        </p>
      </div>
    </Modal>
  );
}
