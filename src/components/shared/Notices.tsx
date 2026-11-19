import type { ReactNode } from "react";
import { CircleAlert, Wallet } from "lucide-react";
import Button from "./Button";
import Logo from "./Logo";
import { useNexus } from "@/hooks/useNexus";
import { cn } from "@/lib/utils";

/** Inline explanation shown next to a disabled action. */
export function GuardNotice({ children, tone = "warning", className }: { children: ReactNode; tone?: "warning" | "danger"; className?: string }) {
  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-medium",
        tone === "warning" ? "bg-warning-soft text-warning-ink" : "bg-danger-soft text-danger-ink",
        className,
      )}
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Disconnected state: centred call to action. */
export function ConnectPrompt({ title = "Connecter mon wallet pour commencer", description }: { title?: string; description?: string }) {
  const { openWalletPicker } = useNexus();
  return (
    <div className="card flex flex-col items-center gap-4 py-10 text-center" data-testid="connect-prompt">
      <Logo className="h-16 w-16" animated />
      <div className="stack !gap-1">
        <h2 className="text-xl font-semibold">Wallet non connecté</h2>
        {description && <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      <Button variant="primary" size="lg" onClick={openWalletPicker}>
        <Wallet className="h-5 w-5" aria-hidden />
        {title}
      </Button>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border-strong px-4 py-8 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted-foreground">{children}</div>}
      {action}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {action}
    </div>
  );
}
