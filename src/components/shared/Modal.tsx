import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  tone?: "default" | "danger";
}

/** Bottom sheet on mobile, centred dialog on larger screens. */
export default function Modal({ open, onOpenChange, title, description, children, footer, tone = "default" }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl border-2 border-foreground bg-surface p-5 pb-safe shadow-float",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl",
            tone === "danger" && "border-danger",
          )}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border-strong sm:hidden" aria-hidden />
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="stack !gap-1">
              <Dialog.Title className={cn("font-display text-xl font-semibold", tone === "danger" && "text-danger-ink")}>
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="text-sm text-muted-foreground">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="grid h-tap w-tap shrink-0 place-items-center rounded-full hover:bg-surface-sunken" aria-label="Fermer">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="stack">{children}</div>
          {footer && <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
