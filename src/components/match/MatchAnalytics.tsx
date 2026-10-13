import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { buildWormData, formatOvers, maxOversForFormat, oversToBalls } from "@/lib/worm";
import type { MatchCenter } from "@/types/scorecard";
import { StatsBar, type StatItem } from "./StatsBar";
import { WormChart } from "./WormChart";

export function MatchStats({ center, isLive }: { center: MatchCenter; isLive: boolean }) {
  const { innings, live } = center;
  const maxOvers = maxOversForFormat(center.format);

  const stats = useMemo<StatItem[]>(() => {
    const current = innings.at(-1);
    if (!current) return [];
    const ballsBowled = current.balls || oversToBalls(current.overs);
    const crr = live?.currentRunRate ?? current.runRate;

    const isChase = maxOvers != null && innings.length >= 2;
    const target = live?.target ?? (isChase ? innings[innings.length - 2].runs + 1 : null);
    const totalBalls = maxOvers != null ? Math.round(maxOvers * 6) : null;
    const ballsLeft = totalBalls != null ? Math.max(0, totalBalls - ballsBowled) : null;
    const runsNeeded = target != null ? Math.max(0, target - current.runs) : null;

    const rrr =
      live?.requiredRunRate ??
      (isLive && runsNeeded != null && ballsLeft ? (runsNeeded / ballsLeft) * 6 : null);

    const projected =
      maxOvers != null && ballsLeft != null && Number.isFinite(crr)
        ? Math.round(current.runs + (crr * ballsLeft) / 6)
        : null;

    const stats: StatItem[] = [
      {
        label: "Current RR",
        value: crr.toFixed(2),
        hint: `${current.battingTeamShort} · ${formatOvers(ballsBowled)} ov`,
        tone: "primary",
      },
    ];

    if (maxOvers != null) {
      stats.push(
        {
          label: "Required RR",
          value: rrr != null ? rrr.toFixed(2) : "—",
          hint: rrr != null ? (rrr > crr ? "Above current rate" : "Within reach") : "Not chasing",
          tone: rrr != null ? (rrr > crr ? "danger" : "accent") : "default",
        },
        {
          label: "Target",
          tone: target != null ? "warning" : "default",
          value: target != null ? String(target) : "—",
          hint:
            target != null && runsNeeded != null && ballsLeft != null && isLive
              ? `Need ${runsNeeded} off ${ballsLeft}`
              : target != null
                ? `Set by ${innings[innings.length - 2]?.battingTeamShort ?? ""}`
                : "Batting first",
        },
        {
          label: "Projected",
          tone: "default",
          value: projected != null ? String(projected) : "—",
          hint: projected != null ? `At ${crr.toFixed(2)} rpo` : "Limited-overs projection",
        },
      );
    }

    return stats;
  }, [innings, live, maxOvers, isLive]);

  if (stats.length === 0) return null;
  return <StatsBar items={stats} />;
}

export function MatchWorm({
  center,
  team1Label,
  team2Label,
}: {
  center: MatchCenter;
  team1Label: string;
  team2Label: string;
}) {
  const { innings, team1Id, team2Id } = center;
  const maxOvers = maxOversForFormat(center.format);

  const wormData = useMemo(() => {
    const latestFor = (teamId: number) => innings.filter((i) => i.battingTeamId === teamId).at(-1);
    return buildWormData(latestFor(team1Id), latestFor(team2Id));
  }, [innings, team1Id, team2Id]);

  if (innings.length === 0) return null;

  return (
    <section
      aria-labelledby="analytics-heading"
      className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)] sm:p-4"
    >
      <h2
        id="analytics-heading"
        className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        <TrendingUp className="h-3.5 w-3.5 text-primary" /> Match worm
      </h2>
      <WormChart
        data={wormData}
        team1Label={team1Label}
        team2Label={team2Label}
        maxOvers={maxOvers}
      />
    </section>
  );
}
