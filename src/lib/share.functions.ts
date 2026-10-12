import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { loadHome } from "@/lib/cricket.functions";
import type { Innings, TeamScore } from "@/types/cricket";

export interface MatchShareMeta {
  title: string;
  description: string;
  origin: string;
}

function latestInnings(score?: TeamScore): Innings | undefined {
  return score?.inngs2 ?? score?.inngs1;
}

function formatScore(inn?: Innings) {
  if (!inn) return null;
  return `${inn.runs}/${inn.wickets ?? 0}`;
}

export const getMatchShareMeta = createServerFn({ method: "GET" })
  .inputValidator((input: { matchId: number }) => input)
  .handler(async ({ data }): Promise<MatchShareMeta | null> => {
    const { origin } = getRequestUrl();
    const home = await loadHome();
    const entry = home.matches.find((m) => m.match.matchInfo.matchId === data.matchId);
    if (!entry) return null;

    const info = entry.match.matchInfo;
    const score = entry.match.matchScore;
    const t1 = formatScore(latestInnings(score?.team1Score));
    const t2 = formatScore(latestInnings(score?.team2Score));

    const teams = `${info.team1.teamSName} vs ${info.team2.teamSName}`;
    const scoreLine = t1 || t2 ? ` · ${t1 ?? "-"} v ${t2 ?? "-"}` : "";

    return {
      title: `${teams}${scoreLine} — Cricket Live`,
      description: `${info.status}. ${info.matchDesc}, ${info.seriesName}.`,
      origin,
    };
  });
