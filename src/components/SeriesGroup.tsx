import { MatchCard } from "@/components/MatchCard";
import type { SeriesGroupData } from "@/lib/series";

export function SeriesGroup({ group }: { group: SeriesGroupData }) {
  const headingId = `series-${group.seriesId}`;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex items-center gap-3">
        <h2
          id={headingId}
          className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {group.seriesName}
        </h2>
        <div className="h-px flex-1 bg-border/60" aria-hidden="true" />
        <span className="text-xs tabular-nums text-muted-foreground/70">
          {group.matches.length}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.matches.map((m) => (
          <MatchCard key={m.match.matchInfo.matchId} entry={m} />
        ))}
      </div>
    </section>
  );
}
