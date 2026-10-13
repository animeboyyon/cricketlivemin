import type { MatchEntry } from "@/types/cricket";
import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";
import { Score } from "@/components/Score";
import { cn } from "@/lib/utils";
import {
  getTeamTones,
  toneLabel,
  toneRowClass,
  toneScoreClass,
  type TeamTone,
} from "@/lib/teamTone";

type ScoreData = { runs: number; wickets?: number; overs?: number };

function StatusBadge({ state, status }: { state: string; status: string }) {
  const isLive = ["In Progress", "Innings Break", "Live", "Tea", "Lunch", "Stumps"].includes(state);
  const isComplete = state === "Complete";
  const isUpcoming = state === "Preview" || state === "Upcoming";

  if (isLive) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
        <span className="live-dot h-2 w-2 rounded-full bg-primary" />
        Live
      </div>
    );
  }
  if (isComplete) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Result
      </div>
    );
  }
  if (isUpcoming) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
        Upcoming
      </div>
    );
  }
  return (
    <div className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {state}
    </div>
  );
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
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl px-2 py-1.5",
        toneRowClass[tone],
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamLogo name={name} short={short} imageId={imageId} size="sm" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight text-foreground">{name}</div>
          <div className="flex items-center gap-1.5 text-[11px] leading-tight text-muted-foreground">
            {short}
            {label && (
              <span className="rounded bg-primary/20 px-1 text-[9px] font-bold uppercase tracking-wider text-primary">
                {label}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        {score ? (
          <Score {...score} className={cn("text-base", toneScoreClass[tone])} />
        ) : (
          <span className="text-muted-foreground/60">—</span>
        )}
      </div>
    </div>
  );
}

export function MatchCard({ entry }: { entry: MatchEntry }) {
  const info = entry.match.matchInfo;
  const score = entry.match.matchScore;

  const t1 = score?.team1Score?.inngs2 ?? score?.team1Score?.inngs1;
  const t2 = score?.team2Score?.inngs2 ?? score?.team2Score?.inngs1;
  const tones = getTeamTones(info, score);
  const isLive = tones.team1 === "batting" || tones.team2 === "batting";

  return (
    <Link
      to="/match/$matchId"
      params={{ matchId: String(info.matchId) }}
      className="group relative block overflow-hidden rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-card)] transition hover:border-primary/50 hover:shadow-[var(--shadow-glow)] sm:p-5"
    >
      <header className="mb-2 flex items-start justify-between gap-3 sm:mb-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">
            {info.matchDesc} · {info.matchFormat}
          </div>
        </div>
        <StatusBadge state={info.state} status={info.status} />
      </header>

      <div className="space-y-1.5">
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

      <footer className="mt-2.5 space-y-1.5 sm:mt-3">
        <p
          className={cn(
            "text-[13px] font-medium leading-snug sm:text-sm",
            isLive ? "text-primary" : "text-foreground/90",
          )}
        >
          {info.status}
        </p>
        {info.venueInfo && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">
              {info.venueInfo.ground}, {info.venueInfo.city}
            </span>
          </div>
        )}
      </footer>
    </Link>
  );
}
