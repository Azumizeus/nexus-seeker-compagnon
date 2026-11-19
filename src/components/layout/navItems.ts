import { House, MessageCircle, Send, Settings, ShieldCheck, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { useNexus } from "@/hooks/useNexus";
import { canSeeAdministration } from "@/lib/guards";

export interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

const BASE_ITEMS: NavItem[] = [
  { to: "/", label: "Accueil", short: "Accueil", icon: House },
  { to: "/demander", label: "Demander une action", short: "Demander", icon: Send },
  { to: "/agents", label: "Agents & Wallets", short: "Agents", icon: Users },
  { to: "/chat", label: "Chat", short: "Chat", icon: MessageCircle },
  { to: "/performance", label: "Performance", short: "Perf", icon: TrendingUp },
];
const ADMIN_ITEM: NavItem = { to: "/admin", label: "Administration", short: "Admin", icon: ShieldCheck };
const SETTINGS_ITEM: NavItem = { to: "/parametres", label: "Paramètres", short: "Réglages", icon: Settings };

export function useNavItems() {
  const { role } = useNexus();
  return [...BASE_ITEMS, ...(canSeeAdministration(role) ? [ADMIN_ITEM] : []), SETTINGS_ITEM];
}
