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
