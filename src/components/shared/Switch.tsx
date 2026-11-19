import { cn } from "@/lib/utils";

interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

/**
 * On/off toggle in the app's style (thick outline, pop shadow when on).
 * Native `role="switch"` on a button: no runtime dependency, and the browser
 * gives us keyboard activation and focus handling for free.
 */
export default function Switch({ id, checked, onCheckedChange, disabled, className, "aria-label": ariaLabel }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-foreground transition-colors duration-150",
        checked ? "bg-primary" : "bg-surface-sunken",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "block h-5 w-5 rounded-full border-2 border-foreground bg-surface transition-transform duration-150",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}
