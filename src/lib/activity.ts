import { put } from "./localDb";
import type { ActivityEntry } from "./models";
import { uid } from "./utils";

/** Signatures already written to the journal — avoids duplicates when the program event arrives. */
const knownSignatures = new Set<string>();

export function isKnownSignature(signature: string) {
  return knownSignatures.has(signature);
}

/** Appends an entry to the local activity journal (wallet, agent wallets, agents, program). */
export async function logActivity(entry: Omit<ActivityEntry, "id" | "at"> & { at?: number }) {
  if (entry.signature) knownSignatures.add(entry.signature);
  try {
    await put<ActivityEntry>("activity", { id: uid(), at: entry.at ?? Date.now(), ...entry });
  } catch (error) {
    console.error("[activity] write failed", error);
  }
}
