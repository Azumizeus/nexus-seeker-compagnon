import { useEffect } from "react";
import { useLocalStore } from "./useLocalStore";
import {
  SESSION_HEARTBEAT_MS,
  clearSessions,
  deviceLabel,
  loadSessions,
  recordConnect,
  recordDisconnect,
  recordSeen,
  type SessionEntry,
} from "@/lib/sessionLog";

/** Records real wallet connections on this device. Mount once (NexusProvider). */
export function useSessionRecorder(address: string | null, walletName: string | null) {
  useEffect(() => {
    if (!address) return;
    const idPromise = recordConnect({
      address,
      walletName: walletName ?? "Wallet inconnu",
      network: "Devnet",
      device: deviceLabel(typeof navigator === "undefined" ? "" : navigator.userAgent),
    }).catch((e: unknown) => {
      console.error("[sessions]", e);
      return null;
    });
    const beat = setInterval(() => {
      void idPromise.then((id) => id && recordSeen(id).catch((e: unknown) => console.error("[sessions]", e)));
    }, SESSION_HEARTBEAT_MS);
    return () => {
      clearInterval(beat);
      void idPromise.then((id) => id && recordDisconnect(id).catch((e: unknown) => console.error("[sessions]", e)));
    };
  }, [address, walletName]);
}

/** Connection history stored on this device, newest first. */
export function useSessionHistory() {
  const { data, loading, error } = useLocalStore<SessionEntry[]>("sessions", loadSessions, []);
  return { sessions: data, loading, error, clear: clearSessions };
}
