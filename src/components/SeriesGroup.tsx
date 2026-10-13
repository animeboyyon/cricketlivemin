import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MatchCard } from "@/components/MatchCard";
import { cn } from "@/lib/utils";
import type { SeriesGroupData } from "@/lib/series";

export function SeriesGroup({ group }: { group: SeriesGroupData }) {
  const [open, setOpen] = useState(true);
  const headingId = `series-${group.seriesId}`;
  const panelId = `series-panel-${group.seriesId}`;
  const isSingleMatch = group.matches.length === 1;

  if (isSingleMatch) {
    return (
      <section aria-labelledby={headingId}>
        <div
          id={panelId}
          className="overflow-hidden rounded-xl border border-border bg-card/40"
        >
          <h2
            id={headingId}
            className="border-b border-border/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {group.seriesName}
          </h2>
          <div className="p-2 sm:p-3">
            <MatchCard entry={group.matches[0]} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="overflow-hidden rounded-xl border border-border bg-card/40"
    >
      <h2 id={headingId} className="m-0">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-card/80"
        >
          <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.seriesName}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              !open && "-rotate-90",
            )}
            aria-hidden="true"
          />
        </button>
      </h2>
      {open && (
        <div
          id={panelId}
          className="grid gap-2 border-t border-border/60 p-2 sm:grid-cols-2 sm:gap-3 sm:p-3 lg:grid-cols-3"
        >
          {group.matches.map((m) => (
            <MatchCard key={m.match.matchInfo.matchId} entry={m} />
          ))}
        </div>
      )}
    </section>
  );
}
