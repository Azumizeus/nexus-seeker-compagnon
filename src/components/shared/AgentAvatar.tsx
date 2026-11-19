import { cn } from "@/lib/utils";

/** Literal class lists so Tailwind keeps them — one colour token per on-chain slot. */
export const AGENT_BG = ["bg-agent-0", "bg-agent-1", "bg-agent-2", "bg-agent-3", "bg-agent-4", "bg-agent-5", "bg-agent-6"];
export const AGENT_TEXT = ["text-agent-0", "text-agent-1", "text-agent-2", "text-agent-3", "text-agent-4", "text-agent-5", "text-agent-6"];
export const AGENT_BORDER = [
  "border-agent-0",
  "border-agent-1",
  "border-agent-2",
  "border-agent-3",
  "border-agent-4",
  "border-agent-5",
  "border-agent-6",
];

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
