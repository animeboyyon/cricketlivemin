import { describe, expect, it } from "vitest";
import {
  alignProbability,
  normalizeCommentary,
  parseRecentBalls,
  parseWinProbability,
} from "./scorecard.functions";

describe("parseWinProbability", () => {
  const commWinProbability = {
    matchId: 172671,
    drawTiePercent: 25,
    team1: { id: 96, percent: 2, name: "Afghanistan", shortName: "AFG" },
    team2: { id: 6, percent: 73, name: "Bangladesh", shortName: "BAN" },
    lastUpdatedOver: 108,
    odds: { team1_point: 47.5, team2_point: 1.3, draw_point: 3.8 },
  };

  it("reads Cricbuzz's live percentages including the draw", () => {
    expect(parseWinProbability(commWinProbability, 172671)).toEqual({
      team1: 2,
      team2: 73,
      draw: 25,
      team1Id: 96,
      team2Id: 6,
    });
  });

  it("omits the draw for limited-overs matches", () => {
    expect(
      parseWinProbability({ ...commWinProbability, drawTiePercent: 0 }, 172671)?.draw,
    ).toBeUndefined();
  });

  it("rejects a figure belonging to another match", () => {
    expect(parseWinProbability(commWinProbability, 999)).toBeNull();
  });

  it("returns null when Cricbuzz has no figure", () => {
    expect(parseWinProbability(undefined, 172671)).toBeNull();
    expect(parseWinProbability({ matchId: 172671 }, 172671)).toBeNull();
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
