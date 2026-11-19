import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import Logo from "@/components/shared/Logo";
import WalletButton from "@/components/shared/WalletButton";
import TakeControlButton from "@/components/shared/TakeControlButton";
import { useTheme } from "@/hooks/useTheme";
import { APP_NAME } from "@/lib/appConfig";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="sticky top-0 z-40 h-16 border-b-[1.5px] border-border bg-background/95">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-2 px-3 sm:px-5">
        <Link to="/" className="flex min-h-tap min-w-0 items-center gap-2" aria-label={`${APP_NAME} — accueil`}>
          <Logo className="h-9 w-9 shrink-0" />
          <span className="hidden min-w-0 font-display text-lg font-bold leading-tight tracking-tight sm:block">
            Nexus Seeker <span className="text-secondary-ink">Compagnon</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <TakeControlButton compact />
          <button
            type="button"
            onClick={toggleTheme}
            className="grid h-tap w-tap place-items-center rounded-2xl hover:bg-surface-sunken"
            aria-label={theme === "light" ? "Passer en thème sombre" : "Passer en thème clair"}
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
          <WalletButton compact />
        </div>
      </div>
    </header>
  );
}
