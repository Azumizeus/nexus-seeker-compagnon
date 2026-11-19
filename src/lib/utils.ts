import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAddress(address?: string | null, chars = 4) {
  if (!address) return "—";
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function lamportsToSol(lamports: number) {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number) {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function formatSol(lamports: number | null | undefined, digits = 4) {
  if (lamports === null || lamports === undefined) return "—";
  const sol = lamportsToSol(lamports);
  return `${sol.toLocaleString("fr-FR", { maximumFractionDigits: digits })} SOL`;
}

export function formatRelative(timestamp: number) {
  const diff = Date.now() - timestamp;
  const s = Math.round(diff / 1000);
  if (s < 45) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(timestamp).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isValidPubkeyString(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.trim());
}
