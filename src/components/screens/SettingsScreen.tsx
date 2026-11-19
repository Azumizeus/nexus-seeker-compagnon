import { ExternalLink, Lock, Moon, Sun } from "lucide-react";
import Badge from "@/components/shared/Badge";
import LimitsForm from "@/components/admin/LimitsForm";
import TelegramConnection from "@/components/settings/TelegramConnection";
import { SectionTitle } from "@/components/shared/Notices";
import { useTheme } from "@/hooks/useTheme";
import { useSupportedWallets } from "@/hooks/useSupportedWallets";
import { APP_NAME, APP_VERSION, GITHUB_URL } from "@/lib/appConfig";
import { CONFIG_ADDRESS, NEXUS_ACCESS_PROGRAM_ID, explorerAddressUrl } from "@/lib/solana";
import { cn } from "@/lib/utils";

const optionClass = (active: boolean) =>
  cn(
    "flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 font-semibold transition-colors",
    active ? "border-foreground bg-primary text-primary-foreground shadow-pop" : "border-border hover:border-border-strong",
  );

export default function SettingsScreen() {
  const { theme, setTheme, density, setDensity } = useTheme();
  const wallets = useSupportedWallets();

  return (
    <div className="stack !gap-5 animate-rise">
      <div>
        <p className="eyebrow">Préférences</p>
        <h1 className="text-3xl font-bold">Paramètres</h1>
      </div>

      <section className="card stack">
        <SectionTitle title="Réseau" />
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Réseau">
          <button type="button" role="radio" aria-checked className={optionClass(true)}>
            Devnet <Badge tone="success">Actif</Badge>
          </button>
          <button type="button" role="radio" aria-checked={false} disabled className={cn(optionClass(false), "cursor-not-allowed opacity-50")}>
            <Lock className="h-4 w-4" aria-hidden /> Mainnet
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Mainnet reste désactivé tant qu'aucun audit du programme n'est passé.</p>
      </section>

      <section className="card stack">
        <SectionTitle title="Wallets compatibles" />
        <ul className="stack !gap-2">
          {wallets.map((w) => (
            <li key={w.key} className="flex min-h-tap items-center gap-3 rounded-xl border-[1.5px] border-border px-3 py-2">
              {w.match?.adapter.icon ? (
                <img src={w.match.adapter.icon} alt="" className="h-7 w-7 rounded-lg" />
              ) : (
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface-sunken text-xs font-bold">{w.label[0]}</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{w.label}</span>
                <span className="block text-xs text-muted-foreground">{w.hint}</span>
              </span>
              <Badge tone={w.match ? "success" : "neutral"} dot>
                {w.match ? "Détecté" : "Non détecté"}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="card stack">
        <SectionTitle title="Connexions" />
        <TelegramConnection />
      </section>

      <section className="card stack">
        <SectionTitle title="Personnalisation" />
        <div className="field">
          <p className="label">Thème</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")} className={optionClass(theme === "light")}>
              <Sun className="h-4 w-4" aria-hidden /> Clair
            </button>
            <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")} className={optionClass(theme === "dark")}>
              <Moon className="h-4 w-4" aria-hidden /> Sombre
            </button>
          </div>
        </div>
        <div className="field">
          <p className="label">Densité</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={density === "comfortable"} onClick={() => setDensity("comfortable")} className={optionClass(density === "comfortable")}>
              Confortable
            </button>
            <button type="button" aria-pressed={density === "compact"} onClick={() => setDensity("compact")} className={optionClass(density === "compact")}>
              Compacte
            </button>
          </div>
        </div>
        <div className="stack !gap-2">
          <p className="label">Wallets agent : plafond global et limite par agent (on-chain)</p>
          <LimitsForm />
        </div>
      </section>

      <section className="card stack">
        <SectionTitle title="À propos" />
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Application</dt>
            <dd className="font-semibold">{APP_NAME}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Version</dt>
            <dd className="font-mono">{APP_VERSION}</dd>
          </div>
        </dl>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { href: explorerAddressUrl(NEXUS_ACCESS_PROGRAM_ID.toBase58()), label: "Programme sur l'explorateur" },
            { href: explorerAddressUrl(CONFIG_ADDRESS.toBase58()), label: "Config sur l'explorateur" },
            { href: GITHUB_URL, label: "Code sur GitHub" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-tap items-center justify-between gap-2 rounded-2xl border-[1.5px] border-border-strong px-4 font-semibold hover:bg-surface-sunken"
            >
              {l.label}
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
