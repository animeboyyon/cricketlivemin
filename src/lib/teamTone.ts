import type { MatchInfo, MatchScore } from "@/types/cricket";

export type TeamSide = "team1" | "team2";
export type TeamTone = "batting" | "winner" | "loser" | "neutral";

export const LIVE_STATES = ["In Progress", "Innings Break", "Live", "Tea", "Lunch", "Stumps"];

function latestInningsId(score?: MatchScore["team1Score"]) {
  return Math.max(score?.inngs1?.inningsId ?? 0, score?.inngs2?.inningsId ?? 0);
}

// The team holding the highest innings id is the one currently at the crease.
function getBattingSide(score?: MatchScore): TeamSide | null {
  const a = latestInningsId(score?.team1Score);
  const b = latestInningsId(score?.team2Score);
  if (a === 0 && b === 0) return null;
  return a > b ? "team1" : "team2";
}

function getWinnerSide(info: MatchInfo): TeamSide | null {
  const status = info.status.toLowerCase();
  const won = (name: string) => status.includes(`${name.toLowerCase()} won`);
  if (won(info.team1.teamName) || won(info.team1.teamSName)) return "team1";
  if (won(info.team2.teamName) || won(info.team2.teamSName)) return "team2";
  return null;
}

export function getTeamTones(
  info: MatchInfo,
  score?: MatchScore,
): Record<TeamSide, TeamTone> {
  const neutral = { team1: "neutral", team2: "neutral" } as Record<TeamSide, TeamTone>;

  if (LIVE_STATES.includes(info.state)) {
    const batting = getBattingSide(score);
    if (!batting) return neutral;
    return { ...neutral, [batting]: "batting" };
  }

  if (info.state === "Complete") {
    const winner = getWinnerSide(info);
    if (!winner) return neutral;
    const loser: TeamSide = winner === "team1" ? "team2" : "team1";
    return { ...neutral, [winner]: "winner", [loser]: "loser" };
  }

  return neutral;
}

export const toneRowClass: Record<TeamTone, string> = {
  batting: "bg-primary/10 ring-1 ring-primary/30",
  winner: "bg-primary/10 ring-1 ring-primary/30",
  loser: "opacity-60",
  neutral: "",
};

export const toneScoreClass: Record<TeamTone, string> = {
  batting: "text-primary",
  winner: "text-primary",
  loser: "text-muted-foreground",
  neutral: "text-foreground",
};

export const toneLabel: Partial<Record<TeamTone, string>> = {
  batting: "Batting",
  winner: "Won",
};

export function formatBadgeClass(format: string) {
  const f = format.toUpperCase();
  if (f.includes("TEST")) return "bg-chart-5/15 text-chart-5";
  if (f.includes("ODI")) return "bg-chart-3/15 text-chart-3";
  if (f.includes("T20") || f.includes("T10")) return "bg-accent/15 text-accent";
  return "bg-muted text-muted-foreground";
}

export function stateAccentClass(state: string) {
  if (LIVE_STATES.includes(state)) return "border-l-primary";
  if (state === "Preview" || state === "Upcoming") return "border-l-chart-3";
  if (state === "Complete") return "border-l-muted-foreground/40";
  return "border-l-border";
}

export type StatusKind =
  | "chase"
  | "won"
  | "lead"
  | "trail"
  | "toss"
  | "draw"
  | "live"
  | "upcoming"
  | "plain";

export function getStatusKind(status: string, state: string): StatusKind {
  const s = status.toLowerCase();
  if (/toss|opt to|elected to/.test(s)) return "toss";
  if (/\bneed|\brequire/.test(s)) return "chase";
  if (/\bwon\b/.test(s)) return "won";
  if (/\blead\b|\bleads\b/.test(s)) return "lead";
  if (/\btrail/.test(s)) return "trail";
  if (/draw|tied|no result|abandon/.test(s)) return "draw";
  if (LIVE_STATES.includes(state)) return "live";
  if (state === "Preview" || state === "Upcoming") return "upcoming";
  return "plain";
}

export const statusClass: Record<StatusKind, string> = {
  chase: "bg-chart-3/15 text-chart-3 ring-1 ring-chart-3/30",
  won: "bg-primary/15 text-primary ring-1 ring-primary/30",
  lead: "bg-accent/15 text-accent ring-1 ring-accent/30",
  trail: "bg-chart-4/15 text-chart-4 ring-1 ring-chart-4/30",
  toss: "bg-muted text-muted-foreground",
  draw: "bg-chart-5/15 text-chart-5 ring-1 ring-chart-5/30",
  live: "bg-primary/10 text-primary ring-1 ring-primary/25",
  upcoming: "bg-chart-3/10 text-chart-3 ring-1 ring-chart-3/25",
  plain: "bg-muted/50 text-foreground/90",
};
