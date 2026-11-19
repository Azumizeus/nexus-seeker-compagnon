import { useContext } from "react";
import { NexusContext } from "@/providers/contexts";

/** Program client, on-chain Config, network status and the connected user's role. */
export function useNexus() {
  const ctx = useContext(NexusContext);
  if (!ctx) throw new Error("useNexus doit être utilisé dans NexusProvider");
  return ctx;
}
