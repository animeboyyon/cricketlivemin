import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreProps {
  runs: number;
  wickets?: number;
  overs?: number;
  className?: string;
}

export function Score({ runs, wickets, overs, className }: ScoreProps) {
  const wicketCount = wickets ?? 0;
  const previous = useRef({ runs, wickets: wicketCount });
  const [flash, setFlash] = useState<"runs" | "wicket" | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = { runs, wickets: wicketCount };
    if (before.runs === runs && before.wickets === wicketCount) return;

    setFlash(wicketCount > before.wickets ? "wicket" : "runs");
    const timer = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(timer);
  }, [runs, wicketCount]);

  return (
    <span
      className={cn(
        "-mx-0.5 whitespace-nowrap rounded px-0.5 font-mono font-bold tabular-nums",
        flash === "runs" && "score-flash-runs",
        flash === "wicket" && "score-flash-wicket",
        className,
      )}
    >
      {runs}/{wicketCount}
      {overs != null && (
        <span className="ml-1 text-[11px] font-medium text-muted-foreground sm:text-xs">
          ({overs} ov)
        </span>
      )}
    </span>
  );
}
