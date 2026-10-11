import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { getCricketHome } from "@/lib/cricket.functions";
import { MatchCard } from "@/components/MatchCard";
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

const LIVE_STATES = ["In Progress", "Innings Break", "Live", "Tea", "Lunch", "Stumps"];

function Index() {
  const { data, isLoading, isFetching, refetch, error, dataUpdatedAt } = useQuery({
    queryKey: ["cricket-home"],
    queryFn: () => getCricketHome(),
    refetchInterval: 30_000,
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const matches: MatchEntry[] = data?.matches ?? [];

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
    if (filter === "all") return matches;
    return matches.filter((m) => {
      const s = m.match.matchInfo.state;
      if (filter === "live") return LIVE_STATES.includes(s);
      if (filter === "upcoming") return s === "Preview" || s === "Upcoming";
      if (filter === "complete") return s === "Complete";
      return true;
    });
  }, [matches, filter]);

  const lastUpdatedSec = dataUpdatedAt ? Math.floor((now - dataUpdatedAt) / 1000) : 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="mb-8 sm:mb-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              <Activity className="h-3 w-3" />
              Live Scoreboard
            </div>
            <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
              Cricket{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Live
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Real-time scores, fixtures, and results from across the cricketing world.
              Instant live updates when available.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
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
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {key === "live" && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      active ? "bg-primary-foreground" : "bg-primary live-dot"
                    }`}
                  />
                )}
                {label}
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    active ? "bg-primary-foreground/20" : "bg-muted"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
          {dataUpdatedAt > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              Updated {lastUpdatedSec}s ago
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load matches. {(error as Error).message}
        </div>
      )}
      {data?.error && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {data.error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-border bg-card"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">No matches in this category right now.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MatchCard key={m.match.matchInfo.matchId} entry={m} />
          ))}
        </div>
      )}

      <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Data sourced from cricbuzz.com · Instant live updates when available
      </footer>
    </main>
  );
}
