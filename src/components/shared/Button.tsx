import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-semibold transition-[transform,background-color,box-shadow,opacity] duration-150 ease-out active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border-2 border-foreground bg-primary text-primary-foreground shadow-pop hover:brightness-105",
        secondary: "border-2 border-foreground bg-secondary text-secondary-foreground shadow-pop hover:brightness-110",
        outline: "border-[1.5px] border-border-strong bg-surface text-foreground hover:bg-surface-sunken",
        ghost: "text-foreground hover:bg-surface-sunken",
        danger: "border-2 border-foreground bg-danger text-danger-foreground shadow-pop hover:brightness-110",
        "danger-soft": "border-[1.5px] border-danger/40 bg-danger-soft text-danger-ink hover:border-danger",
        accent: "border-2 border-foreground bg-accent text-foreground shadow-pop hover:brightness-105",
      },
      size: {
        sm: "min-h-[36px] px-3 text-sm",
        md: "min-h-tap px-4 text-[0.95rem]",
        lg: "min-h-[52px] px-6 text-base",
        icon: "h-tap w-tap",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, loading, disabled, children, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export default Button;
