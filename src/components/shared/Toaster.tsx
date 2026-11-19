import { CircleCheck, Info, TriangleAlert, X, OctagonAlert } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

const ICONS = { info: Info, success: CircleCheck, alert: TriangleAlert, danger: OctagonAlert };
const TONES = {
  info: "border-border-strong bg-surface",
  success: "border-primary bg-primary-soft",
  alert: "border-accent bg-accent-soft",
  danger: "border-danger bg-danger-soft",
};

/** Alerts stack — sits above the bottom navigation on mobile. */
export default function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-[88px] z-[60] flex flex-col gap-2 md:bottom-6 md:left-auto md:right-6 md:w-96"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === "danger" || t.tone === "alert" ? "alert" : "status"}
            className={cn("pointer-events-auto flex animate-rise items-start gap-3 rounded-2xl border-2 p-3 shadow-float", TONES[t.tone])}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t.title}</p>
              {t.description && <p className="break-words text-sm text-muted-foreground">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-surface-sunken"
              aria-label="Fermer l'alerte"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
