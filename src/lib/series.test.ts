import { describe, expect, it } from "vitest";
import type { MatchEntry } from "@/types/cricket";
import { groupBySeries } from "./series";

const entry = (matchId: number, seriesId: number, seriesName: string) =>
  ({ match: { matchInfo: { matchId, seriesId, seriesName } } }) as unknown as MatchEntry;

describe("groupBySeries", () => {
  it("groups matches by series and keeps first-seen order", () => {
    const groups = groupBySeries([
      entry(1, 10, "Ashes"),
      entry(2, 20, "IPL"),
      entry(3, 10, "Ashes"),
    ]);
    expect(groups.map((g) => g.seriesName)).toEqual(["Ashes", "IPL"]);
    expect(groups[0].matches.map((m) => m.match.matchInfo.matchId)).toEqual([1, 3]);
  });

  it("returns an empty list for no matches", () => {
    expect(groupBySeries([])).toEqual([]);
  });
});
