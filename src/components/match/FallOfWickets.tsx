import type { FallOfWicket } from "@/types/scorecard";

export function FallOfWickets({ wickets }: { wickets: FallOfWicket[] }) {
  if (wickets.length === 0) return null;
  return (
    <section aria-labelledby="fow-heading" className="mt-5">
      <h4
        id="fow-heading"
        className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        Fall of wickets
      </h4>
      <ol className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {wickets.map((w) => (
          <li
            key={w.wicketNumber}
            className="min-w-28 shrink-0 snap-start rounded-xl border border-border bg-background/40 px-3 py-2"
          >
            <p className="font-mono text-sm font-bold tabular-nums text-foreground">
              {w.runs}
              <span className="text-destructive">/{w.wicketNumber}</span>
              <span className="ml-1.5 text-xs font-medium text-muted-foreground">{w.over} ov</span>
            </p>
            <p
              className="mt-0.5 max-w-36 truncate text-xs text-muted-foreground"
              title={w.batterName}
            >
              {w.batterName}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
