import { describe, expect, it } from "vitest";
import type { InningsScorecard } from "@/types/scorecard";
import { buildWormData, formatOvers, maxOversForFormat, oversToBalls } from "./worm";

const innings = (overrides: Partial<InningsScorecard>) =>
  ({
    inningsId: 1,
    runs: 60,
    wickets: 1,
    overs: 2,
    balls: 12,
    fallOfWickets: [],
    ...overrides,
  }) as InningsScorecard;

describe("overs helpers", () => {
  it("converts overs notation to balls and back", () => {
    expect(oversToBalls(12.3)).toBe(75);
    expect(formatOvers(75)).toBe("12.3");
  });

  it("knows the over limit per format", () => {
    expect(maxOversForFormat("T20")).toBe(20);
    expect(maxOversForFormat("odi")).toBe(50);
    expect(maxOversForFormat("TEST")).toBeNull();
  });
});

describe("buildWormData", () => {
  it("returns nothing when there are no innings", () => {
    expect(buildWormData(undefined, undefined)).toEqual([]);
  });

  it("interpolates between anchors and ends on the real total", () => {
    const rows = buildWormData(innings({}), undefined);
    expect(rows.map((r) => r.over)).toEqual([0, 1, 2]);
    expect(rows.map((r) => r.team1)).toEqual([0, 30, 60]);
  });

  it("labels wickets and keeps the series monotonic", () => {
    const rows = buildWormData(
      innings({
        fallOfWickets: [{ ball: 6, runs: 40, batterName: "A. Batter", wicketNumber: 1 }] as never,
      }),
      undefined,
    );
    const wicketRow = rows.find((r) => r.over === 1);
    expect(wicketRow?.team1).toBe(40);
    expect(wicketRow?.team1Wicket).toBe("A. Batter · 40/1");
    const values = rows.map((r) => r.team1 ?? 0);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});
