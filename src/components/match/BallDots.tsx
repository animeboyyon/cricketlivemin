const toneFor = (ball: string) => {
  const token = ball.toLowerCase();
  if (token === "w") return "bg-destructive text-destructive-foreground";
  if (token === "6") return "bg-primary text-primary-foreground";
  if (token === "4") return "bg-accent text-accent-foreground";
  if (token === "0") return "bg-muted text-muted-foreground";
  if (/^(wd|nb|lb|b)/.test(token)) return "border border-border text-muted-foreground";
  return "bg-muted text-foreground";
};

export function BallDots({ balls }: { balls: string[] }) {
  if (balls.length === 0) return null;
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Last {balls.length}
      </span>
      <ol className="flex items-center gap-1.5" aria-label="Last balls, oldest first">
        {balls.map((ball, index) => (
          <li
            key={`${index}-${ball}`}
            className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 font-mono text-[11px] font-bold tabular-nums ${toneFor(ball)}`}
          >
            {ball.toUpperCase() === "W" ? "W" : ball}
          </li>
        ))}
      </ol>
    </div>
  );
}
