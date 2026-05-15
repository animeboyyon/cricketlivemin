import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Trophy, Calendar, Activity } from "lucide-react";
import { getCricketHome } from "@/lib/cricket.functions";
import type { MatchEntry, Innings, TeamScore } from "@/types/cricket";

export const Route = createFileRoute("/match/$matchId")({
  head: ({ params }) => ({
    meta: [
      { title: `Match ${params.matchId} — Cricket Live Scoreboard` },
      { name: "description", content: "Live cricket match details, innings breakdown, and venue info." },
    ],
  }),
  component: MatchDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-foreground">Match not found</h1>
      <p className="mt-2 text-muted-foreground">It may no longer be in the active feed.</p>
      <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to scoreboard
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
      <p className="mt-2 text-sm text-destructive">{error.message}</p>
      <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
    </div>
  ),
});

const LIVE_STATES = ["In Progress", "Innings Break", "Live", "Tea", "Lunch", "Stumps"];

function formatInnings(inn?: Innings) {
  if (!inn) return "Yet to bat";
  return `${inn.runs}/${inn.wickets ?? 0}${inn.overs != null ? ` (${inn.overs} ov)` : ""}`;
}

function InningsCard({
  teamName,
  short,
  scores,
}: {
  teamName: string;
  short: string;
  scores?: TeamScore;
}) {
  const innings = [scores?.inngs1, scores?.inngs2].filter(Boolean) as Innings[];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-sm font-bold text-primary ring-1 ring-primary/30">
          {short.slice(0, 3)}
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">{teamName}</h3>
          <p className="text-xs text-muted-foreground">{short}</p>
        </div>
      </div>
      {innings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Yet to bat</p>
      ) : (
        <div className="space-y-2">
          {innings.map((inn, i) => (
            <div
              key={inn.inningsId}
              className="flex items-baseline justify-between rounded-lg bg-muted/40 px-3 py-2"
            >
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Innings {i + 1}
              </span>
              <span className="font-mono text-xl font-bold tabular-nums text-foreground">
                {formatInnings(inn)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchDetail() {
  const { matchId } = Route.useParams();
  const id = Number(matchId);

  const { data, isLoading } = useQuery({
    queryKey: ["cricket-home"],
    queryFn: () => getCricketHome(),
    refetchInterval: 30_000,
  });

  if (isLoading && !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="h-8 w-32 animate-pulse rounded bg-card" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }

  const entry = data?.matches.find((m: MatchEntry) => m.match.matchInfo.matchId === id);
  if (!entry) throw notFound();

  const info = entry.match.matchInfo;
  const score = entry.match.matchScore;
  const isLive = LIVE_STATES.includes(info.state);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to scoreboard
      </Link>

      <header className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Trophy className="h-3 w-3" />
              <span className="truncate">{info.seriesName}</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-foreground sm:text-3xl">
              {info.team1.teamName} <span className="text-muted-foreground">vs</span>{" "}
              {info.team2.teamName}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {info.matchDesc} · {info.matchFormat}
            </p>
          </div>
          {isLive ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <span className="live-dot h-2 w-2 rounded-full bg-primary" />
              Live
            </div>
          ) : (
            <div className="inline-flex rounded-full bg-muted px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {info.state}
            </div>
          )}
        </div>

        <div className="mt-5 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3 w-3" /> Current Status
          </div>
          <p className="mt-1 text-base font-semibold text-foreground sm:text-lg">{info.status}</p>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <InningsCard
          teamName={info.team1.teamName}
          short={info.team1.teamSName}
          scores={score?.team1Score}
        />
        <InningsCard
          teamName={info.team2.teamName}
          short={info.team2.teamSName}
          scores={score?.team2Score}
        />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {info.venueInfo && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3 w-3" /> Venue
            </div>
            <p className="mt-2 text-base font-semibold text-foreground">{info.venueInfo.ground}</p>
            <p className="text-sm text-muted-foreground">{info.venueInfo.city}</p>
          </div>
        )}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-3 w-3" /> Schedule
          </div>
          <p className="mt-2 text-base font-semibold text-foreground">
            {new Date(info.startDate).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <p className="text-sm text-muted-foreground">{info.seriesName}</p>
        </div>
      </section>
    </main>
  );
}
