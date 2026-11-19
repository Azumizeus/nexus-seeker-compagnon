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
import { useSessionRecorder } from "@/hooks/useSessionLog";
import { alertChannels, categoryForEvent, getNotificationPrefs, notifySystem } from "@/lib/notificationPrefs";

/** Whether an event raises an alert is decided by the notification settings (lib/notificationPrefs). */
type EventSpec = { title: string; severity: ActivitySeverity };

const EVENT_SPECS: Record<string, EventSpec> = {
  spendRecorded: { title: "Dépense enregistrée", severity: "info" },
  controlTakenBack: { title: "Contrôle repris", severity: "danger" },
  controlReleased: { title: "Autonomie rendue", severity: "success" },
  paused: { title: "Programme mis en pause", severity: "danger" },
  unpaused: { title: "Programme relancé", severity: "success" },
  walletModeUpdated: { title: "Mode de wallet modifié", severity: "info" },
  walletSpendCapUpdated: { title: "Plafond de wallet modifié", severity: "info" },
  agentWalletRegistered: { title: "Wallet agent enregistré", severity: "success" },
  agentWalletRevoked: { title: "Wallet agent révoqué", severity: "alert" },
  sharedWalletAssigned: { title: "Wallet commun réassigné", severity: "info" },
  walletSpentReset: { title: "Compteur de wallet remis à zéro", severity: "info" },
  globalSpentReset: { title: "Compteur global remis à zéro", severity: "info" },
  globalSpendCapUpdated: { title: "Plafond global modifié", severity: "info" },
  perAgentLimitUpdated: { title: "Limite par agent modifiée", severity: "info" },
  guardianUpdated: { title: "Guardian modifié", severity: "alert" },
  authorityProposed: { title: "Transfert d'authority proposé", severity: "alert" },
  authorityAccepted: { title: "Authority transférée", severity: "alert" },
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
  const { connected, publicKey, wallet } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { toast } = useToast();

  /*
   * `connection` is stable (module-level config in SolanaProvider) and
   * `useAnchorWallet` is memoised by the adapter, so the client — and the
   * websocket subscriptions bound to it — is only rebuilt on connect/disconnect.
   */
  const client = useMemo(() => new NexusAccessClient(connection, anchorWallet ?? null), [connection, anchorWallet]);

  const [config, setConfig] = useState<ConfigState | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkStatus>("checking");
  const [chainTick, setChainTick] = useState(0);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);

  const applyConfigResult = useCallback((result: Awaited<ReturnType<NexusAccessClient["fetchConfig"]>>) => {
    if (result.success && result.data) {
      const next = result.data;
      // Keep the previous object when nothing changed: no re-render of every consumer.
      setConfig((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      setConfigError(null);
    } else {
      setConfigError(result.error ?? "Lecture de la Config impossible");
    }
    setConfigLoading(false);
  }, []);

  const loadConfig = useCallback(async () => {
    applyConfigResult(await client.fetchConfig());
  }, [client, applyConfigResult]);

  const refreshConfig = useCallback(async () => {
    setConfigLoading(true);
    await loadConfig();
  }, [loadConfig]);

  const bumpChainTick = useCallback(() => setChainTick((t) => t + 1), []);

  /* Initial Config load. */
  useEffect(() => {
    let alive = true;
    client.fetchConfig().then((result) => {
      if (alive) applyConfigResult(result);
    });
    return () => {
      alive = false;
    };
  }, [client, applyConfigResult]);

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
          let autonomous = false;

          if (name === "spendRecorded") {
            autonomous = modeKey(event.effectiveMode) === "agentAuthorized";
            title = autonomous ? "Signature autonome" : "Dépense validée";
            severity = autonomous ? "alert" : "info";
            detail = `${agentLabel ?? "Agent"} · ${formatSol(toNumber(event.amountLamports))}`;
          } else if (name === "controlTakenBack" || name === "controlReleased") {
            detail = agentLabel ? `Agent : ${agentLabel}` : "Tous les wallets agent";
          } else if (event.wallet) {
            detail = `Wallet ${shortAddress(String(event.wallet))}`;
          }

          // The journal entry above is always written; channels only decide how the user is alerted.
          const channels = alertChannels(categoryForEvent(name, autonomous), getNotificationPrefs());
          if (channels.toast) {
            toast({ tone: severity === "success" ? "success" : severity === "danger" ? "danger" : severity === "info" ? "info" : "alert", title, description: detail });
          }
          if (channels.system) notifySystem(title, detail);

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
  useSessionRecorder(walletAddress, wallet?.adapter.name ?? null);

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
