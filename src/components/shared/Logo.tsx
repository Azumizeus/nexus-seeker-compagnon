import { cn } from "@/lib/utils";

/** Geometric eye / radar mark — the iris is a key. Colours come from tokens. */
export default function Logo({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-10 w-10", className)} role="img" aria-label="Nexus">
      <rect width="64" height="64" rx="16" className="fill-surface stroke-foreground" strokeWidth="2.5" />
      <path
        d="M7 32 C17 17 47 17 57 32 C47 47 17 47 7 32 Z"
        className="fill-background stroke-foreground"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <g className={cn(animated && "animate-scan")} style={{ transformOrigin: "32px 32px" }}>
        <circle cx="32" cy="32" r="16.5" fill="none" className="stroke-secondary" strokeWidth="2" strokeDasharray="3 4" />
      </g>
      <circle cx="32" cy="32" r="11.5" className="fill-primary stroke-foreground" strokeWidth="2.5" />
      <circle cx="32" cy="29" r="3.6" className="fill-foreground" />
      <path d="M32 31.5 V40 M32 37 H35.5" className="stroke-foreground" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <circle cx="47" cy="19" r="3" className="fill-accent" />
    </svg>
  );
}
