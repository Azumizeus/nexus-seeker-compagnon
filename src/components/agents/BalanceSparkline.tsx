import { buildPolyline, type BalancePoint } from "@/lib/walletSeries";
import { cn } from "@/lib/utils";

const WIDTH = 100;
const HEIGHT = 40;

interface BalanceSparklineProps {
  points: BalancePoint[];
  label: string;
  className?: string;
}

/** Balance over time. Decorative: the surrounding text carries the numbers. */
export default function BalanceSparkline({ points, label, className }: BalanceSparklineProps) {
  const line = buildPolyline(points, WIDTH, HEIGHT, 2);
  if (!line) return null;

  const [cx, cy] = line.split(" ")[0].split(",").map(Number);
  const area = `2,${HEIGHT - 2} ${line} ${WIDTH - 2},${HEIGHT - 2}`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={cn("h-24 w-full", className)}
    >
      {points.length > 1 && <polygon points={area} className="fill-secondary-soft" aria-hidden />}
      {points.length > 1 ? (
        <polyline
          points={line}
          fill="none"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="stroke-secondary-ink"
        />
      ) : (
        <circle cx={cx} cy={cy} r={1.6} className="fill-secondary-ink" />
      )}
    </svg>
  );
}
