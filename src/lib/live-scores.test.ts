import { describe, expect, it } from "vitest";
import type { MatchEntry } from "@/types/cricket";
import { mergeMatches, parseLiveScoresPage } from "./live-scores";

const team = (teamId: number, teamSName: string) => ({ teamId, teamName: teamSName, teamSName });

const rawMatch = (matchId: number) => ({
  matchInfo: {
    matchId,
    seriesId: "13180",
    seriesName: "CSA T20 Challenge 2026",
    startDate: "1791907200000",
    endDate: "1791919800000",
    state: "Preview",
    team1: team(157, "LIONS"),
    team2: team(1775, "BOR"),
  },
});

const pageWith = (payload: unknown) => {
  const chunk = JSON.stringify(payload);
  return `<script>self.__next_f.push([1,${JSON.stringify(chunk)}])</script>`;
};

describe("parseLiveScoresPage", () => {
  it("reads every match from every series wrapper and de-duplicates", () => {
    const wrapper = (id: number, ids: number[]) => ({
      seriesAdWrapper: { seriesId: id, matches: ids.map(rawMatch) },
    });
    const html = pageWith([
      { matchType: "Domestic", seriesMatches: [wrapper(1, [10, 11]), wrapper(2, [12])] },
      { matchType: "Women", seriesMatches: [wrapper(3, [12, 13])] },
    ]);

    const matches = parseLiveScoresPage(html);

    expect(matches.map((m) => m.match.matchInfo.matchId)).toEqual([10, 11, 12, 13]);
  });

  it("converts string ids and dates to numbers", () => {
    const html = pageWith({ seriesAdWrapper: { matches: [rawMatch(10)] } });
    const { matchInfo } = parseLiveScoresPage(html)[0].match;

    expect(matchInfo.seriesId).toBe(13180);
    expect(matchInfo.startDate).toBe(1791907200000);
  });

  it("returns nothing for a page without match data", () => {
    expect(parseLiveScoresPage("<html></html>")).toEqual([]);
  });
});

describe("mergeMatches", () => {
  const entry = (id: number, status: string) =>
    ({ match: { matchInfo: { matchId: id, status } } }) as unknown as MatchEntry;

  it("adds new matches and keeps the earlier list's copy on conflict", () => {
    const merged = mergeMatches([entry(1, "carousel")], [entry(1, "page"), entry(2, "page")]);

    expect(merged.map((m) => m.match.matchInfo.matchId)).toEqual([1, 2]);
    expect(merged[0].match.matchInfo.status).toBe("carousel");
  });
});
