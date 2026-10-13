import { useEffect, useState } from "react";

interface UpdatedAtProps {
  timestamp: number;
  stale: boolean;
}

function formatAge(seconds: number) {
  if (seconds < 5) return "now";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m`;
}

export function UpdatedAt({ timestamp, stale }: UpdatedAtProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.round((now - timestamp) / 1_000));
  const isStale = stale || seconds > 30;

  return (
    <p
      className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium tabular-nums text-muted-foreground"
      title={isStale ? "Live feed is delayed; showing the last known scores" : "Scores are up to date"}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          isStale ? "bg-muted-foreground/50" : "bg-emerald-400 shadow-[0_0_6px_rgb(52_211_153/0.7)]"
        }`}
      />
      <span className="sr-only">{isStale ? "Delayed, last updated " : "Updated "}</span>
      {formatAge(seconds)}
    </p>
  );
}
