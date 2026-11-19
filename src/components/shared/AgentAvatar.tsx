import { cn } from "@/lib/utils";
import { AGENT_BG } from "./agentColors";

interface AgentAvatarProps {
  name: string;
  slot: number;
  size?: "sm" | "md" | "lg";
  status?: "active" | "thinking" | "awaiting" | "overridden";
  className?: string;
}

const STATUS_DOT: Record<NonNullable<AgentAvatarProps["status"]>, string> = {
  active: "bg-primary",
  thinking: "bg-secondary animate-pulse",
  awaiting: "bg-accent",
  overridden: "bg-danger",
};

export default function AgentAvatar({ name, slot, size = "md", status, className }: AgentAvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center rounded-2xl border-2 border-foreground font-display font-bold text-surface",
        AGENT_BG[slot % 7],
        size === "sm" && "h-8 w-8 rounded-xl text-xs",
        size === "md" && "h-11 w-11 text-sm",
        size === "lg" && "h-14 w-14 text-lg",
        className,
      )}
      aria-hidden
    >
      {initials || "?"}
      {status && (
        <span className={cn("absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-surface", STATUS_DOT[status])} />
      )}
    </span>
  );
}
