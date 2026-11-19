import { NavLink } from "react-router-dom";
import { House, MessageCircle, Send, Settings, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { useNexus } from "@/hooks/useNexus";
import { canSeeAdministration } from "@/lib/guards";
import { cn } from "@/lib/utils";

interface NavItem {
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
];
const ADMIN_ITEM: NavItem = { to: "/admin", label: "Administration", short: "Admin", icon: ShieldCheck };
const SETTINGS_ITEM: NavItem = { to: "/parametres", label: "Paramètres", short: "Réglages", icon: Settings };

export function useNavItems() {
  const { role } = useNexus();
  return [...BASE_ITEMS, ...(canSeeAdministration(role) ? [ADMIN_ITEM] : []), SETTINGS_ITEM];
}

/** Sidebar on desktop. */
export function SideNavigation() {
  const items = useNavItems();
  return (
    <nav aria-label="Navigation principale" className="sticky top-20 hidden w-60 shrink-0 self-start md:block">
      <ul className="stack !gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex min-h-tap items-center gap-3 rounded-2xl px-4 font-semibold transition-colors",
                  isActive ? "border-2 border-foreground bg-primary text-primary-foreground shadow-pop" : "hover:bg-surface-sunken",
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Thumb-reachable bottom bar on mobile. */
export function BottomNavigation() {
  const items = useNavItems();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-border bg-surface pb-safe md:hidden"
    >
      <ul className="no-scrollbar mx-auto flex max-w-xl overflow-x-auto">
        {items.map(({ to, short, label, icon: Icon }) => (
          <li key={to} className="min-w-[64px] flex-1">
            <NavLink
              to={to}
              end={to === "/"}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  "flex min-h-[64px] flex-col items-center justify-center gap-1 text-[0.7rem] font-semibold",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "grid h-8 w-12 place-items-center rounded-full transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  {short}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default BottomNavigation;
