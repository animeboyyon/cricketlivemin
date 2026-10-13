import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Trophy, Calendar, Activity, ListOrdered } from "lucide-react";
import { getCricketHome } from "@/lib/cricket.functions";
import { getMatchCenter } from "@/lib/scorecard.functions";
import { getMatchShareMeta } from "@/lib/share.functions";
import { MatchStats, MatchWorm } from "@/components/match/MatchAnalytics";
import { BallDots } from "@/components/match/BallDots";
import { MatchTabs } from "@/components/match/Commentary";
import { LiveMatchSummary } from "@/components/match/LiveMatchSummary";
import { NotifyButton } from "@/components/match/NotifyButton";
import { Scorecard } from "@/components/match/Scorecard";
import { ShareButton } from "@/components/match/ShareButton";
import { TeamSheet } from "@/components/match/TeamSheet";
import type { MatchEntry, Innings, Team, TeamScore } from "@/types/cricket";

export const Route = createFileRoute("/match/$matchId")({
  loader: async ({ params }) => {
    const matchId = Number(params.matchId);
    if (!Number.isInteger(matchId) || matchId <= 0) return null;
    try {
      return await getMatchShareMeta({ data: { matchId } });
    } catch {
      return null;
    }
  },
  head: ({ params, loaderData }) => {
    const title = loaderData?.title ?? `Match ${params.matchId} — Cricket Live Scoreboard`;
    const description =
      loaderData?.description ?? "Live cricket match details, innings breakdown, and venue info.";
    const origin = loaderData?.origin ?? "";
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];
    if (origin) {
      meta.push(
        { property: "og:url", content: `${origin}/match/${params.matchId}` },
        { property: "og:image", content: `${origin}/api/og/${params.matchId}` },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:image", content: `${origin}/api/og/${params.matchId}` },
      );
    }
    return { meta };
  },
  component: MatchDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold text-foreground">Match not found</h1>
      <p className="mt-2 text-muted-foreground">It may no longer be in the active feed.</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to scoreboard
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
      <p className="mt-2 text-sm text-destructive">
        {error instanceof Error ? error.message : "An unexpected error occurred."}
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
    </div>
  ),
});

const LIVE_STATES = ["In Progress", "Innings Break", "Live", "Tea", "Lunch", "Stumps"];
// Polling pauses automatically while the tab is hidden (react-query default).
const LIVE_REFRESH_MS = 5_000;
const IDLE_REFRESH_MS = 120_000;

function formatInnings(inn?: Innings) {
  if (!inn) return "Yet to bat";
  return `${inn.runs}/${inn.wickets ?? 0}${inn.overs != null ? ` (${inn.overs} ov)` : ""}`;
}

function InningsCard({
  team,
  matchId,
  scores,
}: {
  team: Team;
  matchId: number;
  scores?: TeamScore;
}) {
  const innings = [scores?.inngs1, scores?.inngs2].filter(Boolean) as Innings[];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="mb-3 flex items-center gap-3 sm:mb-4">
        <TeamSheet team={team} currentMatchId={matchId} />
        <div>
          <h3 className="text-lg font-bold text-foreground">{team.teamName}</h3>
          <p className="text-xs text-muted-foreground">{team.teamSName}</p>
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

function CombinedInningsCard({
  team1,
  team1Score,
  team2,
  team2Score,
  matchId,
}: {
  team1: Team;
  team1Score?: TeamScore;
  team2: Team;
  team2Score?: TeamScore;
  matchId: number;
}) {
  const rows = [
    { team: team1, name: team1.teamName, short: team1.teamSName, score: team1Score },
    { team: team2, name: team2.teamName, short: team2.teamSName, score: team2Score },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5 sm:col-span-2">
      <div className="flex flex-col gap-2">
        {rows.map((team, index) => {
          const innings = [team.score?.inngs1, team.score?.inngs2].filter(Boolean) as Innings[];
          return (
            <div
              key={team.short}
              className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-3 sm:px-4"
            >
              <TeamSheet team={team.team} currentMatchId={matchId} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-foreground">{team.name}</h3>
                    <p className="text-xs text-muted-foreground">{team.short}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {innings.length > 0 ? (
                      innings.map((inn, inningsIndex) => (
                        <p
                          key={inn.inningsId}
                          className="font-mono text-lg font-bold tabular-nums text-foreground"
                        >
                          {formatInnings(inn)}
                          {innings.length > 1 && (
                            <span className="ml-2 text-[10px] font-sans font-normal uppercase tracking-wider text-muted-foreground">
                              Inn {inningsIndex + 1}
                            </span>
                          )}
                        </p>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Yet to bat</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchDetail() {
  const { matchId } = Route.useParams();
  const id = Number(matchId);

  const { data, isLoading } = useQuery({
    queryKey: ["cricket-home"],
    queryFn: () => getCricketHome(),
    refetchInterval: (query) => {
      const match = query.state.data?.matches.find(
        (m: MatchEntry) => m.match.matchInfo.matchId === id,
      );
      return match && LIVE_STATES.includes(match.match.matchInfo.state)
        ? LIVE_REFRESH_MS
        : IDLE_REFRESH_MS;
    },
  });

  const liveEntry = data?.matches.find((m: MatchEntry) => m.match.matchInfo.matchId === id);
  const matchIsLive = !!liveEntry && LIVE_STATES.includes(liveEntry.match.matchInfo.state);

  const {
    data: center,
    isLoading: centerLoading,
    isFetching: centerFetching,
  } = useQuery({
    queryKey: ["match-center", id],
    queryFn: () => getMatchCenter({ data: { matchId: id } }),
    enabled: Number.isInteger(id) && id > 0,
    refetchInterval: matchIsLive ? LIVE_REFRESH_MS : false,
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
  const isLimitedOvers = /^(odi|t20|t20i|one day|twenty20)$/i.test(info.matchFormat.trim());

  return (
    <main className="mx-auto max-w-4xl px-3 py-5 sm:px-6 sm:py-12 lg:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to scoreboard
      </Link>

      <header className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:mt-6 sm:p-6">
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
          <div className="flex items-center gap-2">
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
            <NotifyButton
              matchLabel={`${info.team1.teamSName} v ${info.team2.teamSName}`}
              state={info.state}
              status={info.status}
              center={center}
            />
            <ShareButton
              title={`${info.team1.teamSName} vs ${info.team2.teamSName}`}
              text={info.status}
            />
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3 w-3" /> Current Status
          </div>
          <p className="mt-1 text-base font-semibold text-foreground sm:text-lg">{info.status}</p>
          {isLive && <BallDots balls={center?.recentBalls ?? []} />}
        </div>
      </header>

      {isLimitedOvers ? (
        <section className="mt-4 sm:mt-6">
          <CombinedInningsCard
            team1={info.team1}
            team1Score={score?.team1Score}
            team2={info.team2}
            team2Score={score?.team2Score}
            matchId={id}
          />
        </section>
      ) : (
        <section className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
          <InningsCard team={info.team1} matchId={id} scores={score?.team1Score} />
          <InningsCard team={info.team2} matchId={id} scores={score?.team2Score} />
        </section>
      )}

      {centerLoading && !center ? (
        <div className="mt-6 space-y-6" aria-busy="true" aria-label="Loading match analytics">
          <div className="h-96 animate-pulse rounded-2xl bg-card" />
          <div className="h-80 animate-pulse rounded-2xl bg-card" />
        </div>
      ) : center && center.innings.length > 0 ? (
        <MatchTabs commentary={center.commentary}>
          <div className="mb-4 sm:mb-6">
            <LiveMatchSummary
              center={center}
              isLive={isLive}
              team1Label={info.team1.teamSName}
              team2Label={info.team2.teamSName}
            />
          </div>

          <section
            aria-labelledby="scorecard-heading"
            className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:mt-6 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2
                id="scorecard-heading"
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                <ListOrdered className="h-3.5 w-3.5 text-accent" /> Scorecard
              </h2>
              {isLive && (
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span
                    className={
                      centerFetching
                        ? "h-1.5 w-1.5 animate-pulse rounded-full bg-primary"
                        : "h-1.5 w-1.5 rounded-full bg-primary/50"
                    }
                    aria-hidden="true"
                  />
                  {centerFetching ? "Updating" : "Live"}
                </span>
              )}
            </div>
            <div className="mb-5">
              <MatchStats center={center} isLive={isLive} />
            </div>
            <Scorecard
              innings={center.innings}
              team1Id={center.team1Id || info.team1.teamId}
              liveInningsId={isLive ? center.live?.inningsId : undefined}
            />
          </section>

          <div className="mt-4 sm:mt-6">
            <MatchWorm
              center={center}
              team1Label={info.team1.teamSName}
              team2Label={info.team2.teamSName}
            />
          </div>
        </MatchTabs>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {center?.error
            ? "Detailed scorecard is unavailable right now."
            : "Scorecard and worm chart will appear once play begins."}
        </p>
      )}

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
