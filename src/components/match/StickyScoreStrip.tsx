import { useEffect, useState, type RefObject } from "react";
import { Score } from "@/components/Score";
import { cn } from "@/lib/utils";
import type { TeamTone } from "@/lib/teamTone";
import type { MatchInfo, MatchScore, TeamScore } from "@/types/cricket";

const latestInnings = (score?: TeamScore) => score?.inngs2 ?? score?.inngs1;

export function StickyScoreStrip({
  watchRef,
  info,
  score,
  tones,
  isLive,
  runsToWin,
}: {
  watchRef: RefObject<HTMLElement | null>;
  info: MatchInfo;
  score?: MatchScore;
  tones: Record<"team1" | "team2", TeamTone>;
  isLive: boolean;
  runsToWin?: number | null;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = watchRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [watchRef]);

  const rows = [
    { team: info.team1, innings: latestInnings(score?.team1Score), tone: tones.team1 },
    { team: info.team2, innings: latestInnings(score?.team2Score), tone: tones.team2 },
  ];

  if (!rows.some((row) => row.innings)) return null;

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b border-border bg-background/90 backdrop-blur transition-transform duration-200",
        visible ? "translate-y-0" : "pointer-events-none -translate-y-full",
      )}
    >
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-3 py-1.5 sm:px-6">
        {isLive && <span className="live-dot h-2 w-2 shrink-0 rounded-full bg-primary" />}
        {rows.map(({ team, innings, tone }) => (
          <span key={team.teamSName} className="flex min-w-0 items-baseline gap-1.5">
            <span
              className={cn(
                "text-xs font-bold",
                tone === "batting" ? "text-primary" : "text-muted-foreground",
              )}
            >
              {team.teamSName}
            </span>
            {innings ? (
              <Score
                runs={innings.runs}
                wickets={innings.wickets}
                className={cn("text-sm", tone === "batting" ? "text-primary" : "text-foreground")}
              />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </span>
        ))}
        {runsToWin != null && runsToWin > 0 && (
          <span className="ml-auto shrink-0 rounded-md bg-chart-3/15 px-1.5 py-0.5 text-[11px] font-bold text-chart-3">
            Need {runsToWin}
          </span>
        )}
      </div>
    </div>
  );
}
