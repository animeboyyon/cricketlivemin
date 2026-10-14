import { describe, expect, it } from "vitest";
import { ALERT_CATEGORIES, DEFAULT_CATEGORIES, sanitizeCategories, type AlertCategory } from "./push-categories";
import { buildSnapshot, evaluateReminder, type ReminderProgress } from "./push-events";

const ALL = ALERT_CATEGORIES.map((category) => category.key) as AlertCategory[];
const NOW = 1_800_000_000_000;

interface CommOptions {
  state?: string;
  status?: string;
  complete?: boolean;
  startTs?: number;
  toss?: boolean;
  entries?: Record<string, unknown>[];
  striker?: Record<string, unknown>;
  bowler?: Record<string, unknown>;
}

function comm(options: CommOptions = {}) {
  const commentary: Record<string, unknown> = {};
  for (const entry of options.entries ?? []) commentary[String(entry.timestamp)] = { commType: "commentary", ...entry };
  return {
    matchHeader: {
      state: options.state ?? "In Progress",
      status: options.status ?? "India need 76 runs in 28 balls",
      complete: options.complete ?? false,
      matchStartTimestamp: options.startTs ?? NOW - 3_600_000,
      tossResults: options.toss === false ? {} : { tossWinnerName: "India", decision: "Bowling" },
    },
    miniscore: {
      inningsId: 2,
      batsmanStriker: options.striker ?? { id: 1, name: "Tilak Varma", runs: 12, balls: 9 },
      batsmanNonStriker: { id: 0, name: "", runs: 0, balls: 0 },
      bowlerStriker: options.bowler ?? { id: 5, name: "Shamar Springer", wickets: 1, runs: 20, overs: 3 },
      bowlerNonStriker: { id: 0, name: "", wickets: 0, runs: 0, overs: 0 },
      matchScoreDetails: { inningsScoreList: [{ inningsId: 2, batTeamName: "IND", score: 168, wickets: 5, overs: 15 }] },
    },
    matchCommentary: commentary,
  };
}

const wicket = (ts: number) => ({
  timestamp: ts,
  event: ["wicket", "all"],
  commText: "Springer to Reddy, <b>out</b> Bowled!! <b>Nitish Reddy b Shamar Springer 14(9) [4s-1]</b>",
});
const six = (ts: number) => ({ timestamp: ts, event: ["six", "all"], commText: "Springer to Reddy, <b>SIX</b>, over long-off" });
const four = (ts: number) => ({ timestamp: ts, event: ["four", "team_hundred", "all"], commText: "Springer to Reddy, <b>FOUR</b>, cut away" });

function run(data: ReturnType<typeof comm>, progress: ReminderProgress, categories: AlertCategory[] = ALL, now = NOW) {
  const snapshot = buildSnapshot(data);
  if (!snapshot) throw new Error("expected a snapshot");
  return evaluateReminder({ snapshot, progress, categories, label: "IND v WIC", matchId: 1, now });
}

describe("categories", () => {
  it("sanitizes unknown and non-string values and keeps display order", () => {
    expect(sanitizeCategories(["result", "bogus", 4, "wickets"])).toEqual(["wickets", "result"]);
    expect(sanitizeCategories("wickets")).toEqual([]);
  });

  it("leaves the noisy categories off by default", () => {
    expect(DEFAULT_CATEGORIES).not.toContain("fours");
    expect(DEFAULT_CATEGORIES).not.toContain("sixes");
    expect(DEFAULT_CATEGORIES).toContain("wickets");
  });
});

describe("buildSnapshot", () => {
  it("returns null when the feed has no match state", () => {
    expect(buildSnapshot({})).toBeNull();
  });

  it("classifies wickets, sixes and fours and extracts the dismissal line", () => {
    const snapshot = buildSnapshot(comm({ entries: [four(3), wicket(1), six(2)] }));
    expect(snapshot?.events.map((event) => event.category)).toEqual(["wickets", "sixes", "fours"]);
    expect(snapshot?.events[0].body).toBe("Nitish Reddy b Shamar Springer 14(9) [4s-1]\nIND 168/5 (15 ov)");
  });
});

describe("evaluateReminder", () => {
  it("only records a baseline on the first run and sends nothing", () => {
    const result = run(comm({ entries: [wicket(10), six(11)] }), {});
    expect(result.messages).toEqual([]);
    expect(result.progress).toMatchObject({ init: true, cursor: 11, toss: true, done: false });
  });

  it("notifies only for events newer than the cursor", () => {
    const baseline = run(comm({ entries: [wicket(10)] }), {}).progress;
    const result = run(comm({ entries: [wicket(10), wicket(20), six(21)] }), baseline);
    expect(result.messages.map((message) => message.category)).toEqual(["wickets", "sixes"]);
    expect(result.messages[0].title).toBe("WICKET · IND v WIC");
    expect(run(comm({ entries: [wicket(10), wicket(20), six(21)] }), result.progress).messages).toEqual([]);
  });

  it("respects the categories a subscriber selected", () => {
    const baseline = run(comm(), {}).progress;
    const data = comm({ entries: [wicket(20), six(21), four(22)] });
    expect(run(data, baseline, ["sixes"]).messages.map((message) => message.category)).toEqual(["sixes"]);
    expect(run(data, baseline, ["milestones"]).messages).toEqual([]);
  });

  it("announces a batter reaching fifty once", () => {
    const baseline = run(comm(), {}).progress;
    const data = comm({ striker: { id: 1, name: "Tilak Varma", runs: 51, balls: 30 } });
    const first = run(data, baseline);
    expect(first.messages.map((message) => message.title)).toEqual(["Tilak Varma reaches a fifty · IND v WIC"]);
    expect(run(data, first.progress).messages).toEqual([]);
  });

  it("does not announce milestones that were already reached at baseline", () => {
    const data = comm({ striker: { id: 1, name: "Tilak Varma", runs: 104, balls: 60 } });
    const baseline = run(data, {}).progress;
    expect(run(data, baseline).messages).toEqual([]);
  });

  it("announces a five-wicket haul", () => {
    const baseline = run(comm(), {}).progress;
    const data = comm({ bowler: { id: 5, name: "Shamar Springer", wickets: 5, runs: 30, overs: 4 } });
    expect(run(data, baseline).messages[0].title).toBe("Shamar Springer takes a five-wicket haul · IND v WIC");
  });

  it("sends toss and play-started messages for a match that begins after subscribing", () => {
    const preview = comm({ state: "Preview", toss: false, startTs: NOW + 3_600_000, status: "Match starts soon" });
    const baseline = run(preview, {}).progress;
    expect(baseline.soon).toBe(false);

    const toss = run(comm({ state: "Toss", startTs: NOW + 600_000, status: "India opt to bowl" }), baseline);
    expect(toss.messages.map((message) => message.title)).toEqual(["Starting soon · IND v WIC", "Toss · IND v WIC"]);
    expect(toss.messages[0].body).toBe("Play begins in 10 min");

    const started = run(comm({ state: "In Progress" }), toss.progress);
    expect(started.messages.map((message) => message.title)).toEqual(["Play has started · IND v WIC"]);
  });

  it("reports breaks and resumption", () => {
    const baseline = run(comm(), {}).progress;
    const stumps = run(comm({ state: "Stumps", status: "Day 1: Stumps" }), baseline);
    expect(stumps.messages.map((message) => [message.category, message.title])).toEqual([["breaks", "Stumps · IND v WIC"]]);
    const resumed = run(comm({ state: "In Progress" }), stumps.progress);
    expect(resumed.messages.map((message) => message.title)).toEqual(["Play resumed · IND v WIC"]);
  });

  it("sends the result once and marks the reminder done", () => {
    const baseline = run(comm(), {}).progress;
    const finished = comm({ state: "Complete", complete: true, status: "India won by 4 wickets" });
    const result = run(finished, baseline);
    expect(result.messages).toMatchObject([{ category: "result", title: "Result · IND v WIC", body: "India won by 4 wickets" }]);
    expect(result.progress.done).toBe(true);
    expect(run(finished, result.progress).messages).toEqual([]);
  });

  it("collapses a burst of events into a single summary message", () => {
    const baseline = run(comm(), {}).progress;
    const entries = Array.from({ length: 8 }, (_, index) => six(100 + index));
    const { messages } = run(comm({ entries }), baseline);
    expect(messages).toHaveLength(4);
    expect(messages[3].title).toBe("IND v WIC · 5 more updates");
  });
});
