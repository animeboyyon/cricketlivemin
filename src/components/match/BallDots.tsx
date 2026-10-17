import { cn } from "@/lib/utils";

const toneFor = (ball: string) => {
  const token = ball.toLowerCase();
  if (token === "w") return "bg-destructive text-destructive-foreground";
  if (token === "6") return "bg-six text-six-foreground";
  if (token === "4") return "bg-accent text-accent-foreground";
  if (token === "0") return "bg-muted text-muted-foreground";
  if (/^(wd|nb|lb|b)/.test(token)) return "bg-chart-3/20 text-chart-3 ring-1 ring-chart-3/40";
  return "bg-primary/15 text-primary";
};

export function BallDots({ balls, className }: { balls: string[]; className?: string }) {
  if (balls.length === 0) return null;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Last {balls.length}
      </span>
      <ol className="flex items-center gap-1" aria-label="Last balls, oldest first">
        {balls.map((ball, index) => (
          <li
            key={`${index}-${ball}`}
            className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold tabular-nums ${toneFor(ball)}`}
          >
            {ball.toUpperCase() === "W" ? "W" : ball}
          </li>
        ))}
      </ol>
    </div>
  );
}
