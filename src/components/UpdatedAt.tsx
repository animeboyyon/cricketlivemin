import { useEffect, useState } from "react";

interface UpdatedAtProps {
  timestamp: number;
  stale: boolean;
}

function formatAge(seconds: number) {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
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
      className={`text-xs tabular-nums ${isStale ? "text-amber-500" : "text-muted-foreground"}`}
      title={isStale ? "Live feed is delayed; showing the last known scores" : undefined}
    >
      {isStale ? "Delayed · " : ""}Updated {formatAge(seconds)}
    </p>
  );
}
