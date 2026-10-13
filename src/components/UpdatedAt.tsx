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
      className={`inline-flex shrink-0 items-center text-[11px] font-medium tabular-nums ${
        isStale ? "text-chart-4" : "text-muted-foreground"
      }`}
      title={isStale ? "Live feed is delayed; showing the last known scores" : "Scores are up to date"}
    >
      <span className="sr-only">{isStale ? "Delayed, last updated " : "Updated "}</span>
      {isStale ? "Delayed · " : ""}
      {formatAge(seconds)}
    </p>
  );
}
