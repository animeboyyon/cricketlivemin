import { Activity } from "lucide-react";
import type { MatchCenter, WinProbability } from "@/types/scorecard";
import { BallDots } from "./BallDots";

function unavailable(value: string) {
  return <span className="text-muted-foreground">{value}</span>;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </p>
  );
}

function WinProbabilityBar({
  probability,
  team1Label,
  team2Label,
}: {
  probability: WinProbability | null | undefined;
  team1Label: string;
  team2Label: string;
}) {
  if (!probability) {
    return (
      <>
        <div className="h-2.5 rounded-full bg-muted" aria-hidden="true" />
        <p className="mt-1.5 text-xs">{unavailable("Unavailable from live feed")}</p>
        <p className="sr-only">
          {team1Label} and {team2Label} win probabilities are unavailable from the live feed.
        </p>
      </>
    );
  }

  return (
    <>
      <div
        className="flex h-2.5 gap-px overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${team1Label} ${probability.team1}% win probability, ${team2Label} ${probability.team2}% win probability${probability.draw ? `, draw ${probability.draw}%` : ""}`}
      >
        <div className="h-full bg-primary" style={{ width: `${probability.team1}%` }} />
        {probability.draw ? (
          <div className="h-full bg-chart-3" style={{ width: `${probability.draw}%` }} />
        ) : null}
        <div className="h-full bg-accent" style={{ width: `${probability.team2}%` }} />
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-3 tabular-nums">
        <span className="text-primary">
          <span className="text-base font-bold">{probability.team1}%</span>{" "}
          <span className="text-xs font-medium">{team1Label}</span>
        </span>
        {probability.draw ? (
          <span className="text-chart-3">
            <span className="text-sm font-bold">{probability.draw}%</span>{" "}
            <span className="text-xs font-medium">Draw</span>
          </span>
        ) : null}
        <span className="text-right text-accent">
          <span className="text-xs font-medium">{team2Label}</span>{" "}
          <span className="text-base font-bold">{probability.team2}%</span>
        </span>
      </div>
    </>
  );
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
  if (!isLive) return null;

  const liveInnings = center.live?.inningsId
    ? center.innings.find((innings) => innings.inningsId === center.live?.inningsId)
    : undefined;
  const playIsInProgress = center.state === "In Progress";
  const hasLiveInnings = playIsInProgress && Boolean(liveInnings);
  const batters = liveInnings?.batters.filter((batter) => batter.isBatting).slice(0, 2) ?? [];
  const bowler = liveInnings?.bowlers.at(-1);
  const hasBowler = Boolean(bowler && (bowler.overs > 0 || bowler.runs > 0 || bowler.wickets > 0));
  const probability = center.live?.winProbability;
  const hasBalls = center.recentBalls.length > 0;

  return (
    <section
      aria-labelledby="live-summary-heading"
      className="rounded-xl border border-border bg-card p-3"
    >
      <h2
        id="live-summary-heading"
        className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
      >
        <Activity className="h-3.5 w-3.5" /> Live now
      </h2>

      <div className="space-y-2.5 divide-y divide-border [&>*:not(:first-child)]:pt-2.5">
        {hasLiveInnings && (
          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-0 sm:divide-x sm:divide-border">
            <div className="sm:pr-4">
              <SectionLabel>Batting</SectionLabel>
              {batters.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {batters.map((batter, index) => (
                    <div key={batter.id} className="flex items-center justify-between gap-3">
                      <span
                        className={
                          index === 0
                            ? "min-w-0 truncate text-sm font-semibold text-foreground"
                            : "min-w-0 truncate text-sm text-foreground"
                        }
                      >
                        {index === 0 && <span aria-label="Striker">* </span>}
                        {batter.name}
                      </span>
                      <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-foreground">
                        {batter.runs}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({batter.balls})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                unavailable("Unavailable")
              )}
            </div>

            <div className="sm:pl-4">
              <SectionLabel>Bowling</SectionLabel>
              {hasBowler && bowler ? (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {bowler.name}
                  </span>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                    {bowler.overs} ov ·{" "}
                    <span className={bowler.wickets > 0 ? "font-bold text-chart-4" : undefined}>
                      {bowler.runs}/{bowler.wickets}
                    </span>
                  </span>
                </div>
              ) : (
                unavailable("Unavailable")
              )}
            </div>
          </div>
        )}

        {hasLiveInnings && hasBalls && (
          <div>
            <SectionLabel>This over</SectionLabel>
            <BallDots balls={center.recentBalls} />
          </div>
        )}

        <div>
          <SectionLabel>
            {`Win probability${probability?.estimated ? " · est." : ""}`}
          </SectionLabel>
          <WinProbabilityBar
            probability={probability}
            team1Label={team1Label}
            team2Label={team2Label}
          />
        </div>
      </div>
    </section>
  );
}
