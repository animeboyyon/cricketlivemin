import { describe, expect, it } from "vitest";
import type { InningsScorecard, LiveSituation } from "@/types/scorecard";
import {
  alignProbability,
  estimateChaseProbability,
  normalizeCommentary,
  parsePrediction,
  parseRecentBalls,
} from "./scorecard.functions";

describe("parsePrediction", () => {
  const block = (id: number, t1: number, t2: number, draw: number) =>
    `\\"winProbability\\":{\\"matchId\\":${id},\\"drawTiePercent\\":${draw},\\"drawPercent\\":${draw},\\"team1\\":{\\"id\\":11,\\"percent\\":${t1},\\"name\\":\\"South Africa\\"},\\"team2\\":{\\"id\\":4,\\"percent\\":${t2},\\"name\\":\\"Australia\\"},\\"odds\\":{\\"team1_point\\":2.8}}`;
  const html = `<script>${block(111, 2, 73, 25)},${block(222, 34, 36, 30)}</script>`;

  it("reads the exact match's percentages including the draw", () => {
    expect(parsePrediction(html, 222)).toEqual({
      team1: 34,
      team2: 36,
      draw: 30,
      team1Id: 11,
      team2Id: 4,
    });
  });

  it("returns null for a match that has no prediction", () => {
    expect(parsePrediction(html, 333)).toBeNull();
  });
});

describe("alignProbability", () => {
  it("swaps percentages when the prediction lists teams in the opposite order", () => {
    const result = alignProbability({ team1: 34, team2: 36, draw: 30, team1Id: 11, team2Id: 4 }, 4, 11);
    expect(result).toEqual({ team1: 36, team2: 34, draw: 30 });
  });

  it("keeps the order when it already matches", () => {
    const result = alignProbability({ team1: 34, team2: 36, team1Id: 11, team2Id: 4 }, 11, 4);
    expect(result).toEqual({ team1: 34, team2: 36 });
  });
});

describe("parseRecentBalls", () => {
  it("keeps the last six deliveries and drops dot placeholders", () => {
    expect(parseRecentBalls("1 . 4 W 6 0 2 1 | 1")).toEqual(["W", "6", "0", "2", "1", "1"]);
    expect(parseRecentBalls("1 4 W 6 0 2 1 3")).toEqual(["W", "6", "0", "2", "1", "3"]);
  });

  it("handles missing input", () => {
    expect(parseRecentBalls(undefined)).toEqual([]);
  });
});

describe("normalizeCommentary", () => {
  it("orders newest first, strips markup and flags boundaries and wickets", () => {
    const entries = normalizeCommentary({
      a: { timestamp: 1, ballMetric: 0.1, commText: "Smith, <b>FOUR</b> runs", event: ["FOUR"] },
      b: { timestamp: 2, ballMetric: 0.2, commText: "Jones &amp; co, OUT", event: [] },
      c: { timestamp: 3, commText: "Pitch report", event: [] },
    });
    expect(entries.map((e) => e.kind)).toEqual(["note", "ball", "ball"]);
    expect(entries[1]).toMatchObject({ text: "Jones & co, OUT", highlight: "wicket", over: "0.2" });
    expect(entries[2]).toMatchObject({ text: "Smith, FOUR runs", highlight: "four" });
  });

  it("builds an over summary row from an over separator", () => {
    const [row] = normalizeCommentary({
      a: {
        timestamp: 5,
        commType: "over-separator",
        overSeparator: {
          overNumber: 7,
          overRuns: 1,
          overSummary: "1 . . . . .",
          batTeamObj: { teamName: "AUS", teamScore: "40/1" },
        },
      },
    });
    expect(row).toMatchObject({
      kind: "over",
      text: "End of over 7",
      detail: "1 run · AUS 40/1",
      balls: ["1"],
    });
  });

  it("returns nothing for empty or malformed payloads", () => {
    expect(normalizeCommentary(undefined)).toEqual([]);
    expect(normalizeCommentary({ a: { commText: "no timestamp" } })).toEqual([]);
  });
});

describe("estimateChaseProbability", () => {
  const chasing = {
    inningsId: 2,
    battingTeamId: 2,
    runs: 80,
    wickets: 2,
    overs: 10,
    runRate: 8,
  } as InningsScorecard;
  const first = { inningsId: 1, battingTeamId: 1, runs: 160 } as InningsScorecard;
  const live = { inningsId: 2, target: 161, requiredRunRate: 8.1 } as LiveSituation;

  it("flags the figure as an estimate and sums to 100", () => {
    const result = estimateChaseProbability([first, chasing], live);
    expect(result?.estimated).toBe(true);
    expect((result?.team1 ?? 0) + (result?.team2 ?? 0)).toBe(100);
  });

  it("returns null when there is no chase to estimate", () => {
    expect(estimateChaseProbability([first], { ...live, target: null })).toBeNull();
    expect(estimateChaseProbability([first, chasing], null)).toBeNull();
  });
});
