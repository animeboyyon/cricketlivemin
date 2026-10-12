import { Activity, CircleHelp } from "lucide-react";
import type { MatchCenter } from "@/types/scorecard";

function unavailable(value: string) {
  return <span className="text-muted-foreground">{value}</span>;
}

export function LiveMatchSummary({
  center,
  isLive,
  team1Label,
  team2Label,
}: {
  center: MatchCenter;
  isLive: boolean;
  team1Label: string;
  team2Label: string;
}) {
  const inningsBreakStates = new Set(["innings break", "tea", "lunch", "stumps"]);
  const playIsInProgress = isLive && !inningsBreakStates.has(center.state.trim().toLowerCase());
  const liveInnings = playIsInProgress
    ? center.innings.find((innings) => innings.inningsId === center.live?.inningsId) ?? center.innings.at(-1)
    : undefined;
  const hasLiveInnings = Boolean(liveInnings);
  const batters = liveInnings?.batters.filter((batter) => batter.isBatting || !batter.isOut).slice(0, 2) ?? [];
  const bowler = liveInnings?.bowlers.find((candidate) =>
    candidate.overs > 0 || candidate.runs > 0 || candidate.wickets > 0,
  ) ?? liveInnings?.bowlers.at(-1);
  const hasBowler = Boolean(bowler && (bowler.overs > 0 || bowler.runs > 0 || bowler.wickets > 0));
  const probability = center.live?.winProbability;

  return (
    <section
      aria-labelledby="live-summary-heading"
      className="rounded-2xl border border-border bg-card/80 p-4 shadow-[var(--shadow-card)] sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id="live-summary-heading"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
        >
          <Activity className="h-3.5 w-3.5 text-primary" /> Live match summary
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {isLive ? "Feed data" : "Not live"}
        </span>
      </div>

      {!isLive ? (
        <p className="text-sm text-muted-foreground">
          Live batter, bowler, and win probability data will appear when play is live.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 sm:divide-x sm:divide-border">
          {hasLiveInnings && (
            <div className="sm:pr-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Current batter
              </p>
              {batters.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {batters.map((batter, index) => (
                    <div key={batter.id} className="flex items-center justify-between gap-3">
                      <span
                        className={
                          index === 0
                            ? "min-w-0 truncate text-sm font-semibold text-primary"
                            : "min-w-0 truncate text-sm text-foreground"
                        }
                      >
                        {index === 0 && <span aria-label="Striker">*</span>}
                        {batter.name}
                      </span>
                      <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                        {batter.runs}{" "}
                        <span className="text-xs text-muted-foreground">({batter.balls})</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                unavailable("Unavailable")
              )}
              {batters.length > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">* striker · runs (balls)</p>
              )}
            </div>
          )}

          {hasLiveInnings && (
            <div className="sm:px-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Current bowler
              </p>
              {hasBowler && bowler ? (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {bowler.name}
                  </span>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                    {bowler.overs} ov · {bowler.runs}/{bowler.wickets}
                  </span>
                </div>
              ) : (
                unavailable("Unavailable")
              )}
            </div>
          )}

          <div className="sm:pl-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Win probability
              </p>
              <CircleHelp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </div>
            {probability ? (
              <>
                <div
                  className="flex h-1.5 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${team1Label} ${probability.team1}% win probability, ${team2Label} ${probability.team2}% win probability`}
                >
                  <div className="h-full bg-primary" style={{ width: `${probability.team1}%` }} />
                  <div className="h-full bg-accent" style={{ width: `${probability.team2}%` }} />
                </div>
                <div className="mt-2 flex justify-between gap-3 text-xs tabular-nums text-muted-foreground">
                  <span>
                    {team1Label} {probability.team1}%
                  </span>
                  <span>
                    {team2Label} {probability.team2}%
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="h-1.5 rounded-full bg-muted" aria-hidden="true" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {unavailable("Unavailable from live feed")}
                </p>
                <p className="sr-only">
                  {team1Label} and {team2Label} win probabilities are unavailable from the live
                  feed.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
