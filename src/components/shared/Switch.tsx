import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

/** On/off toggle in the app's style (thick outline, pop shadow when on). */
export default function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      {...props}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-foreground transition-colors duration-150",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-sunken",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <SwitchPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-foreground bg-surface transition-transform duration-150 data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]" />
    </SwitchPrimitive.Root>
  );
}
