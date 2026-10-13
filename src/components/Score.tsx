import { cn } from "@/lib/utils";

interface ScoreProps {
  runs: number;
  wickets?: number;
  overs?: number;
  className?: string;
}

export function Score({ runs, wickets, overs, className }: ScoreProps) {
  return (
    <span className={cn("whitespace-nowrap font-mono font-bold tabular-nums", className)}>
      {runs}/{wickets ?? 0}
      {overs != null && (
        <span className="ml-1 text-[11px] font-medium text-muted-foreground sm:text-xs">
          ({overs} ov)
        </span>
      )}
    </span>
  );
}
