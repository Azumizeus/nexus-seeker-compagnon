/**
 * Contract of the trading-key server function + an in-memory mock for the skeleton.
 *
 * Real implementation (later): a server function that encrypts key/secret at rest,
 * returns only a `TradingKeyRecord`, and checks the on-chain override flags of
 * nexus_access before executing any order. Nothing here touches the network.
 */
import type { WalletMode } from "./guards";
import { keyHintOf, platformDisplayName, type TradingKeyRecord, type TradingKeySubmission } from "./tradingKeys";
import { uid } from "./utils";

export interface TradingKeyServer {
  subscribe(listener: () => void): () => void;
  getSnapshot(): TradingKeyRecord[];
  submit(input: TradingKeySubmission): Promise<TradingKeyRecord>;
  setMode(id: string, mode: WalletMode, opts?: { acknowledgedMarginRisk?: boolean }): Promise<void>;
  setRiskCap(id: string, riskCapUsd: number): Promise<void>;
  revoke(id: string): Promise<void>;
  seedDemo(agentId: string, agentSlot: number): void;
}

function createMockServer(): TradingKeyServer {
  let records: TradingKeyRecord[] = [];
  const listeners = new Set<() => void>();
  const seeded = new Set<string>();

  const commit = (next: TradingKeyRecord[]) => {
    records = next;
    listeners.forEach((l) => l());
  };
  const patch = (id: string, changes: Partial<TradingKeyRecord>) => {
    if (!records.some((r) => r.id === id)) throw new Error("Clé introuvable.");
    commit(records.map((r) => (r.id === id ? { ...r, ...changes } : r)));
  };
  const tick = () => new Promise((resolve) => setTimeout(resolve, 250));

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => records,

    async submit(input) {
      await tick();
      // The mock keeps only a 4-char hint. Key and secret are dropped here,
      // exactly like the real function will drop them after encrypting.
      const record: TradingKeyRecord = {
        id: uid(),
        agentId: input.agentId,
        agentSlot: input.agentSlot,
        platform: input.platform,
        platformName: platformDisplayName(input.platform, input.customName),
        keyHint: keyHintOf(input.apiKey),
        mode: "humanValidation",
        riskCapUsd: input.riskCapUsd,
        createdAt: Date.now(),
      };
      commit([...records, record]);
      return record;
    },

    async setMode(id, mode, opts) {
      await tick();
      if (mode === "agentAuthorized" && !opts?.acknowledgedMarginRisk) {
        throw new Error("Avertissement sur le risque du trading sur marge non accepté.");
      }
      patch(id, { mode });
    },

    async setRiskCap(id, riskCapUsd) {
      await tick();
      patch(id, { riskCapUsd });
    },

    async revoke(id) {
      await tick();
      commit(records.filter((r) => r.id !== id));
    },

    seedDemo(agentId, agentSlot) {
      if (seeded.has(agentId)) return;
      seeded.add(agentId);
      commit([
        ...records,
        {
          id: uid(),
          agentId,
          agentSlot,
          platform: "bitunix",
          platformName: "Bitunix",
          keyHint: "••••d3m0",
          mode: "humanValidation",
          riskCapUsd: 250,
          createdAt: Date.now(),
          demo: true,
        },
      ]);
    },
  };
}

export const tradingKeyServer: TradingKeyServer = createMockServer();
