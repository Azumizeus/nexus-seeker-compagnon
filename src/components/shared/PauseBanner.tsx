import { OctagonPause } from "lucide-react";
import { useNexus } from "@/hooks/useNexus";

/** Fixed banner while the program is paused (paused = true in Config). */
export default function PauseBanner() {
  const { config } = useNexus();
  if (!config?.paused) return null;
  return (
    <div
      role="alert"
      data-testid="pause-banner"
      className="sticky top-[64px] z-30 flex items-center gap-3 border-y-2 border-foreground bg-danger px-4 py-2.5 text-sm font-semibold text-danger-foreground"
    >
      <OctagonPause className="h-5 w-5 shrink-0" aria-hidden />
      <span>Programme en pause : aucune nouvelle dépense ni nouveau wallet agent. Seule l'authority peut relancer.</span>
    </div>
  );
}
