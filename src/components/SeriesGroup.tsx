import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MatchCard } from "@/components/MatchCard";
import { LIVE_STATES } from "@/lib/teamTone";
import { cn } from "@/lib/utils";
import type { SeriesGroupData } from "@/lib/series";

export function SeriesGroup({ group }: { group: SeriesGroupData }) {
  const [open, setOpen] = useState(true);
  const headingId = `series-${group.seriesId}`;
  const panelId = `series-panel-${group.seriesId}`;
  const liveCount = group.matches.filter((m) =>
    LIVE_STATES.includes(m.match.matchInfo.state),
  ).length;

  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <h2 id={headingId} className="m-0">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-card/60"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              !open && "-rotate-90",
            )}
            aria-hidden="true"
          />
          <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.seriesName}
          </span>
          {liveCount > 0 && (
            <span
              className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              role="img"
              aria-label={`${liveCount} live`}
            />
          )}
          <span className="h-px flex-1 bg-border/60" aria-hidden="true" />
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {group.matches.length}
          </span>
        </button>
      </h2>
      {open && (
        <div id={panelId} className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {group.matches.map((m) => (
            <MatchCard key={m.match.matchInfo.matchId} entry={m} />
          ))}
        </div>
      )}
    </section>
  );
}
