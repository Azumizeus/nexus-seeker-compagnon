import { createContext } from "react";
import type { ConfigState, NexusAccessClient } from "@/lib/nexusAccess";
import type { NetworkStatus, Role } from "@/lib/guards";

/* ------------------------------- theme ------------------------------- */

export type ThemeMode = "light" | "dark";
export type Density = "comfortable" | "compact";

export interface ThemeContextValue {
  theme: ThemeMode;
  density: Density;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
  setDensity: (d: Density) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/* ------------------------------- toast ------------------------------- */

export type ToastTone = "info" | "success" | "alert" | "danger";

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  toast: (t: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

/* ------------------------------- nexus ------------------------------- */

export interface NexusContextValue {
  client: NexusAccessClient;
  connected: boolean;
  publicKey: string | null;
  network: NetworkStatus;
  config: ConfigState | null;
  configLoading: boolean;
  configError: string | null;
  refreshConfig: () => Promise<void>;
  role: Role;
  /** Bumps whenever an on-chain event is received — hooks use it to refetch. */
  chainTick: number;
  bumpChainTick: () => void;
  openWalletPicker: () => void;
  walletPickerOpen: boolean;
  setWalletPickerOpen: (open: boolean) => void;
}

export const NexusContext = createContext<NexusContextValue | null>(null);
