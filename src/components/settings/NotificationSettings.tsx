import { Lock } from "lucide-react";
import Badge from "@/components/shared/Badge";
import Switch from "@/components/shared/Switch";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import type { NotificationPrefs } from "@/lib/notificationPrefs";

const LOCKED_ROWS = [
  { label: "Signatures autonomes", hint: "Un wallet en mode « Agent autorisé » a signé seul." },
  { label: "Pause et reprise de contrôle", hint: "Programme mis en pause ou relancé, contrôle repris ou rendu." },
  { label: "Gouvernance", hint: "Changement de guardian, transfert d'authority proposé ou accepté." },
];

const OPTIONAL_ROWS: { key: keyof Omit<NotificationPrefs, "system">; label: string; hint: string }[] = [
  { key: "spends", label: "Dépenses validées", hint: "Chaque dépense signée en validation humaine ou après un Oui." },
  { key: "registry", label: "Registre des wallets", hint: "Wallet enregistré ou révoqué, mode, plafond, compteurs, limites." },
];

const PERMISSION_HINT = {
  granted: "Autorisées par le navigateur.",
  denied: "Bloquées par le navigateur : réactive-les dans les réglages du site.",
  default: "Le navigateur te demandera l'autorisation.",
  unsupported: "Non disponibles sur ce navigateur (sur Android, elles demandent l'application installée).",
} as const;

/** Which program events raise an alert. Real events, settings stored on this device. */
export default function NotificationSettings() {
  const { prefs, update, permission, setSystem } = useNotificationPrefs();

  return (
    <div className="stack !gap-3" data-testid="notification-settings">
      <p className="text-sm text-muted-foreground">
        Alertes déclenchées par les événements du programme on-chain. Le journal d'activité enregistre tout, quels que soient ces réglages.
      </p>

      <ul className="stack !gap-2">
        {LOCKED_ROWS.map((row) => (
          <li key={row.label} className="flex min-h-tap items-center gap-3 rounded-xl border-[1.5px] border-border px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{row.label}</span>
              <span className="block text-xs text-muted-foreground">{row.hint}</span>
            </span>
            <Badge tone="neutral">
              <Lock className="h-3 w-3" aria-hidden /> Toujours actif
            </Badge>
          </li>
        ))}
        {OPTIONAL_ROWS.map((row) => (
          <li key={row.key}>
            <label htmlFor={`notif-${row.key}`} className="flex min-h-tap cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-border px-3 py-2 hover:border-border-strong">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{row.label}</span>
                <span className="block text-xs text-muted-foreground">{row.hint}</span>
              </span>
              <Switch id={`notif-${row.key}`} checked={prefs[row.key]} onCheckedChange={(v) => update(row.key === "spends" ? { spends: v } : { registry: v })} />
            </label>
          </li>
        ))}
      </ul>

      <p className="label pt-1">Canal supplémentaire</p>
      <label htmlFor="notif-system" className="flex min-h-tap cursor-pointer items-center gap-3 rounded-xl bg-surface-sunken px-3 py-2">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Notifications du système</span>
          <span className="block text-xs text-muted-foreground">
            En plus des alertes dans l'app, quand l'onglet est en arrière-plan. Les couper ne coupe ni les alertes toujours actives ni le
            journal. {PERMISSION_HINT[permission]}
          </span>
        </span>
        <Switch
          id="notif-system"
          checked={prefs.system && permission === "granted"}
          disabled={permission === "unsupported" || permission === "denied"}
          onCheckedChange={(v) => void setSystem(v)}
        />
      </label>
      <p className="text-xs text-muted-foreground">Réglages enregistrés sur cet appareil uniquement.</p>
    </div>
  );
}
