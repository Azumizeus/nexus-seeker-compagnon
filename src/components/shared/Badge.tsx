import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-sunken text-muted-foreground",
        success: "border-primary/50 bg-primary-soft text-primary-ink",
        violet: "border-secondary/40 bg-secondary-soft text-secondary-ink",
        accent: "border-accent/40 bg-accent-soft text-accent-ink",
        warning: "border-warning/50 bg-warning-soft text-warning-ink",
        danger: "border-danger/40 bg-danger-soft text-danger-ink",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export default function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
