import { useRef } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Trophy, Calendar, ListOrdered } from "lucide-react";
import { getCricketHome } from "@/lib/cricket.functions";
import { getMatchCenter } from "@/lib/scorecard.functions";
import { getMatchShareMeta } from "@/lib/share.functions";
import { MatchStats, MatchWorm } from "@/components/match/MatchAnalytics";
import { StickyScoreStrip } from "@/components/match/StickyScoreStrip";
import { MatchTabs } from "@/components/match/Commentary";
import { LiveMatchSummary } from "@/components/match/LiveMatchSummary";
import { NotifyButton } from "@/components/match/NotifyButton";
import { Scorecard } from "@/components/match/Scorecard";
import { ShareButton } from "@/components/match/ShareButton";
import { TeamSheet } from "@/components/match/TeamSheet";
import { Score } from "@/components/Score";
import { cn } from "@/lib/utils";
import {
  LIVE_STATES,
  getStatusKind,
  getTeamTones,
  statusClass,
  toneLabel,
  toneRowClass,
  toneScoreClass,
  type TeamTone,
} from "@/lib/teamTone";
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

// Polling pauses automatically while the tab is hidden (react-query default).
const LIVE_REFRESH_MS = 5_000;
const IDLE_REFRESH_MS = 120_000;

function ScoreboardCard({
  team1,
  team1Score,
  team2,
  team2Score,
  matchId,
  tones,
}: {
  team1: Team;
  team1Score?: TeamScore;
  team2: Team;
  team2Score?: TeamScore;
  matchId: number;
  tones: Record<"team1" | "team2", TeamTone>;
}) {
  const rows = [
    { team: team1, score: team1Score, tone: tones.team1 },
    { team: team2, score: team2Score, tone: tones.team2 },
  ];

  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card px-3 sm:px-4">
      {rows.map(({ team, score, tone }) => {
        const innings = [score?.inngs1, score?.inngs2].filter(Boolean) as Innings[];
        const label = toneLabel[tone];
        return (
          <div
            key={team.teamSName}
            className={cn("flex items-center gap-2.5 py-2 sm:py-2.5", toneRowClass[tone])}
          >
            <TeamSheet team={team} currentMatchId={matchId} size="sm" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold leading-tight text-foreground sm:text-base">
                {team.teamName}
              </h3>
              <p className="flex items-center gap-1.5 text-[11px] leading-tight text-muted-foreground sm:text-xs">
                {team.teamSName}
                {tone === "batting" && (
                  <span
                    className="h-1 w-1 shrink-0 rounded-full bg-primary"
                    role="img"
                    aria-label="Batting"
                  />
                )}
                {label && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    {label}
                  </span>
                )}
              </p>
            </div>
            <div className="shrink-0 space-y-0.5 text-right">
              {innings.length > 0 ? (
                innings.map((inn, index) => (
                  <p key={inn.inningsId} className="flex items-baseline justify-end gap-2">
                    {innings.length > 1 && (
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Inn {index + 1}
                      </span>
                    )}
                    <Score
                      runs={inn.runs}
                      wickets={inn.wickets}
                      overs={inn.overs}
                      className={cn(
                        "text-base sm:text-lg",
                        // Only the latest innings takes the highlight colour; earlier ones stay neutral.
                        index === innings.length - 1 ? toneScoreClass[tone] : "text-foreground/80",
                      )}
                    />
                  </p>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Yet to bat</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MatchDetail() {
  const { matchId } = Route.useParams();
  const id = Number(matchId);
  const scoreboardRef = useRef<HTMLElement | null>(null);

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

  return (
    <main className="mx-auto max-w-4xl px-3 py-3 sm:px-6 sm:py-8 lg:px-8">
      <StickyScoreStrip
        watchRef={scoreboardRef}
        info={info}
        score={score}
        tones={getTeamTones(info, score)}
        isLive={isLive}
      />
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground sm:text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <div className="flex items-center gap-1.5">
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

      <header className="mt-2 rounded-xl border border-border bg-card p-3 sm:mt-4 sm:p-4">
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex min-w-0 items-center gap-1.5">
            <Trophy className="h-3 w-3 shrink-0" />
            <span className="truncate">{info.seriesName}</span>
          </div>
          {isLive ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <span className="live-pulse h-1.5 w-1.5 rounded-full bg-primary" />
              Live
            </span>
          ) : (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider">
              {info.state}
            </span>
          )}
        </div>
        <h1 className="mt-1 text-lg font-black leading-tight text-foreground sm:text-2xl">
          {info.team1.teamName} <span className="font-semibold text-muted-foreground">vs</span>{" "}
          {info.team2.teamName}
        </h1>
        <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
          {info.matchDesc} · {info.matchFormat}
        </p>
        <p
          className={cn(
            "mt-2 border-t border-border pt-2 text-[13px] font-semibold leading-snug sm:text-sm",
            statusClass[getStatusKind(info.status, info.state)],
          )}
        >
          {info.status}
        </p>
      </header>

      <section ref={scoreboardRef} className="mt-2 sm:mt-3">
        <ScoreboardCard
          team1={info.team1}
          team1Score={score?.team1Score}
          team2={info.team2}
          team2Score={score?.team2Score}
          matchId={id}
          tones={getTeamTones(info, score)}
        />
      </section>

      {centerLoading && !center ? (
        <div className="mt-3 space-y-3" aria-busy="true" aria-label="Loading match analytics">
          <div className="h-48 animate-pulse rounded-xl bg-card" />
          <div className="h-40 animate-pulse rounded-xl bg-card" />
        </div>
      ) : center && center.innings.length > 0 ? (
        <MatchTabs commentary={center.commentary}>
          <div className="mb-3">
            
            <LiveMatchSummary
              center={center}
              isLive={isLive}
              team1Label={info.team1.teamSName}
              team2Label={info.team2.teamSName}
            />
          </div>

          <section
            aria-labelledby="scorecard-heading"
            className="mt-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)] sm:p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                id="scorecard-heading"
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                <ListOrdered className="h-3.5 w-3.5" /> Scorecard
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
            <div className="mb-3">
              <MatchStats center={center} isLive={isLive} />
            </div>
            <Scorecard
              innings={center.innings}
              team1Id={center.team1Id || info.team1.teamId}
              liveInningsId={isLive ? center.live?.inningsId : undefined}
            />
          </section>

          <div className="mt-3">
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

      <section className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {info.venueInfo && (
          <div className="rounded-xl border border-border bg-card px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="h-3 w-3" /> Venue
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">{info.venueInfo.ground}</p>
            <p className="text-xs text-muted-foreground">{info.venueInfo.city}</p>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-3 w-3" /> Schedule
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {new Date(info.startDate).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <p className="text-xs text-muted-foreground">{info.seriesName}</p>
        </div>
      </section>
    </main>
  );
}
