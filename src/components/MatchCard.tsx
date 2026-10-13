import type { MatchEntry } from "@/types/cricket";
import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";
import { Score } from "@/components/Score";
import { cn } from "@/lib/utils";
import { shortSeriesName } from "@/lib/series";
import {
  LIVE_STATES,
  formatBadgeClass,
  getStatusKind,
  getTeamTones,
  statusClass,
  toneLabel,
  toneRowClass,
  toneScoreClass,
  type TeamTone,
} from "@/lib/teamTone";

type ScoreData = { runs: number; wickets?: number; overs?: number };

function StatusBadge({ state }: { state: string }) {
  const base =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider";

  if (LIVE_STATES.includes(state)) {
    return (
      <div className={cn(base, "bg-primary/15 text-primary")}>
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Live
      </div>
    );
  }
  if (state === "Complete") {
    return <div className={cn(base, "bg-muted text-muted-foreground")}>Result</div>;
  }
  if (state === "Preview" || state === "Upcoming") {
    return <div className={cn(base, "bg-chart-3/15 text-chart-3")}>Upcoming</div>;
  }
  return <div className={cn(base, "bg-muted text-muted-foreground")}>{state}</div>;
}

function TeamRow({
  name,
  short,
  score,
  imageId,
  tone,
}: {
  name: string;
  short: string;
  score?: ScoreData;
  imageId?: number;
  tone: TeamTone;
}) {
  const label = toneLabel[tone];
  return (
    <div className={cn("flex items-center justify-between gap-2 py-0.5", toneRowClass[tone])}>
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamLogo name={name} short={short} imageId={imageId} size="sm" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold leading-tight text-foreground">
              {name}
            </span>
            {tone === "batting" && (
              <span
                className="h-1 w-1 shrink-0 rounded-full bg-primary"
                role="img"
                aria-label="Batting"
              />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] leading-tight text-muted-foreground">
            {short}
            {label && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {label}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        {score ? (
          <Score {...score} className={cn("text-[15px]", toneScoreClass[tone])} />
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </div>
    </div>
  );
}

export function MatchCard({
  entry,
  showSeriesTitle = false,
}: {
  entry: MatchEntry;
  showSeriesTitle?: boolean;
}) {
  const info = entry.match.matchInfo;
  const score = entry.match.matchScore;

  const t1 = score?.team1Score?.inngs2 ?? score?.team1Score?.inngs1;
  const t2 = score?.team2Score?.inngs2 ?? score?.team2Score?.inngs1;
  const tones = getTeamTones(info, score);
  const kind = getStatusKind(info.status, info.state);

  return (
    <Link
      to="/match/$matchId"
      params={{ matchId: String(info.matchId) }}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-border bg-card p-3 transition hover:border-primary/40 sm:p-3.5",
      )}
    >
      <header className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              formatBadgeClass(info.matchFormat),
            )}
          >
            {info.matchFormat}
          </span>
          <span className="truncate" title={info.seriesName}>
            {showSeriesTitle ? info.seriesName : info.matchDesc}
            {!showSeriesTitle && (
              <span className="text-muted-foreground/70"> · {shortSeriesName(info.seriesName)}</span>
            )}
          </span>
        </div>
        <StatusBadge state={info.state} />
      </header>

      <div className="space-y-1">
        <TeamRow
          name={info.team1.teamName}
          short={info.team1.teamSName}
          score={t1}
          imageId={info.team1.imageId}
          tone={tones.team1}
        />
        <TeamRow
          name={info.team2.teamName}
          short={info.team2.teamSName}
          score={t2}
          imageId={info.team2.imageId}
          tone={tones.team2}
        />
      </div>

      <footer className="mt-2 space-y-1 border-t border-border pt-2">
        <p className={cn("text-xs font-semibold leading-snug sm:text-[13px]", statusClass[kind])}>
          {info.status}
        </p>
        {info.venueInfo && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {info.venueInfo.ground}, {info.venueInfo.city}
            </span>
          </div>
        )}
      </footer>
    </Link>
  );
}
