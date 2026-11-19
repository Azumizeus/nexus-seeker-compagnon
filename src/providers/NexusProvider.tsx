import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { NexusContext } from "./contexts";
import { NexusAccessClient, type ConfigState } from "@/lib/nexusAccess";
import { DEVNET_GENESIS_HASH } from "@/lib/solana";
import type { NetworkStatus, Role } from "@/lib/guards";
import { isKnownSignature, logActivity } from "@/lib/activity";
import { getAll } from "@/lib/localDb";
import type { ActivitySeverity, Agent } from "@/lib/models";
import { formatSol, shortAddress } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";

type EventSpec = { title: string; severity: ActivitySeverity; toast?: boolean };

const EVENT_SPECS: Record<string, EventSpec> = {
  spendRecorded: { title: "Dépense enregistrée", severity: "info" },
  controlTakenBack: { title: "Contrôle repris", severity: "danger", toast: true },
  controlReleased: { title: "Autonomie rendue", severity: "success", toast: true },
  paused: { title: "Programme mis en pause", severity: "danger", toast: true },
  unpaused: { title: "Programme relancé", severity: "success", toast: true },
  walletModeUpdated: { title: "Mode de wallet modifié", severity: "info" },
  walletSpendCapUpdated: { title: "Plafond de wallet modifié", severity: "info" },
  agentWalletRegistered: { title: "Wallet agent enregistré", severity: "success" },
  agentWalletRevoked: { title: "Wallet agent révoqué", severity: "alert" },
  sharedWalletAssigned: { title: "Wallet commun réassigné", severity: "info" },
  walletSpentReset: { title: "Compteur de wallet remis à zéro", severity: "info" },
  globalSpentReset: { title: "Compteur global remis à zéro", severity: "info" },
  globalSpendCapUpdated: { title: "Plafond global modifié", severity: "info" },
  perAgentLimitUpdated: { title: "Limite par agent modifiée", severity: "info" },
  guardianUpdated: { title: "Guardian modifié", severity: "alert", toast: true },
  authorityProposed: { title: "Transfert d'authority proposé", severity: "alert", toast: true },
  authorityAccepted: { title: "Authority transférée", severity: "alert", toast: true },
};

function modeKey(value: unknown) {
  return value && typeof value === "object" ? Object.keys(value)[0] : undefined;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toString" in value) return Number(String(value));
  return 0;
}

export default function NexusProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const { connected, publicKey } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { toast } = useToast();

  const client = useMemo(() => new NexusAccessClient(connection, anchorWallet ?? null), [connection, anchorWallet]);

  const [config, setConfig] = useState<ConfigState | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkStatus>("checking");
  const [chainTick, setChainTick] = useState(0);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);

  const loadConfig = useCallback(async () => {
    const result = await client.fetchConfig();
    if (result.success && result.data) {
      setConfig(result.data);
      setConfigError(null);
    } else {
      setConfigError(result.error ?? "Lecture de la Config impossible");
    }
    setConfigLoading(false);
  }, [client]);

  const refreshConfig = useCallback(async () => {
    setConfigLoading(true);
    await loadConfig();
  }, [loadConfig]);

  const bumpChainTick = useCallback(() => setChainTick((t) => t + 1), []);

  /* Initial Config load. */
  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  /* Network check: the RPC must be Solana devnet. */
  useEffect(() => {
    let cancelled = false;
    connection
      .getGenesisHash()
      .then((hash) => {
        if (!cancelled) setNetwork(hash === DEVNET_GENESIS_HASH ? "ok" : "wrong");
      })
      .catch((error) => {
        console.error("[network]", error);
        if (!cancelled) setNetwork("offline");
      });
    return () => {
      cancelled = true;
    };
  }, [connection]);

  /* Real-time program events → journal, alerts, refresh. */
  useEffect(() => {
    const unsubscribers = Object.entries(EVENT_SPECS).map(([name, spec]) =>
      client.onEvent(name, (event, _slot, signature) => {
        void (async () => {
          const agents = await getAll<Agent>("agents").catch(() => [] as Agent[]);
          const slot = typeof event.agentId === "number" ? event.agentId : undefined;
          const agent = slot !== undefined ? agents.find((a) => a.slot === slot) : undefined;
          const agentLabel = slot === 255 ? "wallet commun" : agent ? agent.name : slot !== undefined ? `agent #${slot}` : undefined;

          let title = spec.title;
          let severity = spec.severity;
          let detail: string | undefined;
          let showToast = spec.toast ?? false;

          if (name === "spendRecorded") {
            const autonomous = modeKey(event.effectiveMode) === "agentAuthorized";
            title = autonomous ? "Signature autonome" : "Dépense validée";
            severity = autonomous ? "alert" : "info";
            detail = `${agentLabel ?? "Agent"} · ${formatSol(toNumber(event.amountLamports))}`;
            showToast = autonomous;
          } else if (name === "controlTakenBack" || name === "controlReleased") {
            detail = agentLabel ? `Agent : ${agentLabel}` : "Tous les wallets agent";
          } else if (event.wallet) {
            detail = `Wallet ${shortAddress(String(event.wallet))}`;
          }

          if (showToast) toast({ tone: severity === "success" ? "success" : severity === "danger" ? "danger" : "alert", title, description: detail });

          // Give our own transaction time to land in the journal first.
          await new Promise((r) => setTimeout(r, 1500));
          if (!isKnownSignature(signature)) {
            await logActivity({ source: name === "spendRecorded" ? "agent-wallet" : "program", severity, title, detail, signature, agentSlot: slot, agentId: agent?.id });
          }
          await loadConfig();
          bumpChainTick();
        })();
      }),
    );
    return () => unsubscribers.forEach((u) => u());
  }, [client, loadConfig, bumpChainTick, toast]);

  const walletAddress = publicKey?.toBase58() ?? null;

  const role = useMemo<Role>(
    () => ({
      isAuthority: !!walletAddress && config?.authority === walletAddress,
      isGuardian: !!walletAddress && config?.guardian === walletAddress,
      isPendingAuthority: !!walletAddress && config?.pendingAuthority === walletAddress,
    }),
    [walletAddress, config],
  );

  const openWalletPicker = useCallback(() => setWalletPickerOpen(true), []);

  const value = useMemo(
    () => ({
      client,
      connected,
      publicKey: walletAddress,
      network,
      config,
      configLoading,
      configError,
      refreshConfig,
      role,
      chainTick,
      bumpChainTick,
      openWalletPicker,
      walletPickerOpen,
      setWalletPickerOpen,
    }),
    [client, connected, walletAddress, network, config, configLoading, configError, refreshConfig, role, chainTick, bumpChainTick, openWalletPicker, walletPickerOpen],
  );

  return <NexusContext.Provider value={value}>{children}</NexusContext.Provider>;
}
