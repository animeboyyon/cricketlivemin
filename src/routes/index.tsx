import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { getCricketHome } from "@/lib/cricket.functions";
import { SeriesGroup } from "@/components/SeriesGroup";
import { groupBySeries } from "@/lib/series";
import type { MatchEntry } from "@/types/cricket";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cricket Live Scoreboard — Real-time Scores & Updates" },
      {
        name: "description",
        content:
          "Live cricket scores, upcoming fixtures and recent results from international and league matches, refreshed in real time.",
      },
      { property: "og:title", content: "Cricket Live Scoreboard" },
      {
        property: "og:description",
        content: "Real-time cricket scores, upcoming matches, and results.",
      },
    ],
  }),
  component: Index,
});

type Filter = "all" | "live" | "upcoming" | "complete";

const filterActiveClass: Record<Filter, string> = {
  all: "bg-foreground text-background",
  live: "bg-foreground text-background",
  upcoming: "bg-foreground text-background",
  complete: "bg-foreground text-background",
};

const filterIdleClass: Record<Filter, string> = {
  all: "bg-card text-muted-foreground hover:text-foreground",
  live: "bg-card text-muted-foreground hover:text-foreground",
  upcoming: "bg-card text-muted-foreground hover:text-foreground",
  complete: "bg-card text-muted-foreground hover:text-foreground",
};

const LIVE_STATES = ["In Progress", "Innings Break", "Live", "Tea", "Lunch", "Stumps"];

// Keep marquee fixtures ahead of lower-profile matches when several matches share a state.
// This is intentionally a transparent fallback until the feed exposes an official priority.
const TEAM_PROFILE: Record<string, number> = {
  Australia: 100,
  England: 98,
  India: 100,
  "New Zealand": 94,
  Pakistan: 93,
  "South Africa": 96,
  "Sri Lanka": 86,
  "West Indies": 84,
  Bangladesh: 78,
  Afghanistan: 76,
  Zimbabwe: 70,
  Ireland: 68,
  Netherlands: 65,
  Scotland: 62,
  Nepal: 58,
  "United States": 55,
  Canada: 52,
  Namibia: 50,
  Oman: 48,
  UAE: 46,
};

const FORMAT_PROFILE: Record<string, number> = {
  Test: 30,
  ODI: 20,
  T20: 10,
  T20I: 10,
};

function matchPriority(match: MatchEntry) {
  const { matchInfo } = match.match;
  const teamScore = (teamName: string) => TEAM_PROFILE[teamName] ?? 40;
  const formatScore =
    Object.entries(FORMAT_PROFILE).find(([format]) =>
      matchInfo.matchFormat.toUpperCase().includes(format.toUpperCase()),
    )?.[1] ?? 0;

  return teamScore(matchInfo.team1.teamName) + teamScore(matchInfo.team2.teamName) + formatScore;
}

function Index() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["cricket-home"],
    queryFn: () => getCricketHome(),
    refetchInterval: 5_000,
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [seriesFilter, setSeriesFilter] = useState<number | null>(null);

  const matches = useMemo<MatchEntry[]>(() => data?.matches ?? [], [data?.matches]);

  const counts = useMemo(() => {
    let live = 0,
      upcoming = 0,
      complete = 0;
    for (const m of matches) {
      const s = m.match.matchInfo.state;
      if (LIVE_STATES.includes(s)) live++;
      else if (s === "Preview" || s === "Upcoming") upcoming++;
      else if (s === "Complete") complete++;
    }
    return { live, upcoming, complete, all: matches.length };
  }, [matches]);

  const filtered = useMemo(() => {
    const visibleMatches = matches.filter((m) => {
      const { state, seriesId } = m.match.matchInfo;
      if (seriesFilter !== null && seriesId !== seriesFilter) return false;
      if (filter === "live") return LIVE_STATES.includes(state);
      if (filter === "upcoming") return state === "Preview" || state === "Upcoming";
      if (filter === "complete") return state === "Complete";
      return true;
    });

    if (filter !== "all") return visibleMatches;

    const categoryRank = (state: string) => {
      if (LIVE_STATES.includes(state)) return 0;
      if (state === "Preview" || state === "Upcoming") return 1;
      if (state === "Complete") return 2;
      return 3;
    };

    return visibleMatches
      .map((match, index) => ({ match, index }))
      .sort(
        (a, b) =>
          categoryRank(a.match.match.matchInfo.state) -
            categoryRank(b.match.match.matchInfo.state) ||
          matchPriority(b.match) - matchPriority(a.match) ||
          a.index - b.index,
      )
      .map(({ match }) => match);
  }, [matches, filter, seriesFilter]);

  const groups = useMemo(() => groupBySeries(filtered), [filtered]);

  const seriesOptions = useMemo(
    () =>
      groupBySeries(matches).map(({ seriesId, seriesName }) => ({
        seriesId,
        seriesName,
      })),
    [matches],
  );
  const activeSeries =
    seriesFilter !== null && seriesOptions.some((s) => s.seriesId === seriesFilter);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-8 pt-4 sm:px-6 sm:pt-8 lg:px-8">
      <header className="mb-1 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-foreground sm:text-4xl">
            <img
              src="/og-image.png"
              alt="Cricket Live"
              className="h-9 w-28 object-contain object-left sm:h-11 sm:w-36"
            />
          </h1>
          <p className="mt-1 hidden max-w-xl text-sm text-muted-foreground sm:block">
            Real-time scores, fixtures, and results from across the cricketing world.
          </p>
        </div>
      </header>

      <div className="sticky top-0 z-30 -mx-4 mb-3 bg-background/85 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div
          role="group"
          aria-label="Filter matches"
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          {(
            [
              ["all", "All", counts.all],
              ["live", "Live", counts.live],
              ["upcoming", "Upcoming", counts.upcoming],
              ["complete", "Results", counts.complete],
            ] as const
          ).map(([key, label, count]) => {
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                aria-pressed={active}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold transition ${
                  active ? filterActiveClass[key] : filterIdleClass[key]
                }`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                    active ? "bg-black/15" : "bg-background/50"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
          {seriesOptions.length > 1 && (
            <>
              <span className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
              {seriesOptions.map(({ seriesId, seriesName }) => {
                const active = activeSeries && seriesFilter === seriesId;
                return (
                  <button
                    key={seriesId}
                    onClick={() => setSeriesFilter(active ? null : seriesId)}
                    aria-pressed={active}
                    title={seriesName}
                    className={`inline-flex max-w-[11rem] shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      active
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{seriesName}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {matches.length === 0 && (error || data?.error) && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load matches. {data?.error ?? (error as Error).message}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <p className="text-muted-foreground">No matches in this category right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <SeriesGroup key={group.seriesId} group={group} />
          ))}
        </div>
      )}

      <footer className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
        Data sourced from cricbuzz.com · Instant live updates when available
      </footer>
    </main>
  );
}
