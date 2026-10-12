import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  BatterRow,
  BowlerRow,
  FallOfWicket,
  InningsScorecard,
  LiveSituation,
  MatchCenter,
  WinProbability,
} from "@/types/scorecard";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  Accept: "application/json",
};

/* eslint-disable @typescript-eslint/no-explicit-any -- upstream payload is untyped and normalized here */
type Raw = Record<string, any>;

const num = (v: unknown, fallback = 0) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const values = (obj: unknown): Raw[] =>
  obj && typeof obj === "object" ? Object.values(obj as Raw) : [];
const orderByKey = (obj: unknown, prefix: string): Raw[] =>
  obj && typeof obj === "object"
    ? Object.entries(obj as Raw)
        .sort(([a], [b]) => Number(a.replace(prefix, "")) - Number(b.replace(prefix, "")))
        .map(([, v]) => v as Raw)
    : [];

function normalizeInnings(raw: Raw): InningsScorecard {
  const bat = raw.batTeamDetails ?? {};
  const bowl = raw.bowlTeamDetails ?? {};
  const score = raw.scoreDetails ?? {};
  const extras = raw.extrasData ?? {};

  const allBatters = orderByKey(bat.batsmenData, "bat_");
  const batters: BatterRow[] = [];
  const yetToBat: string[] = [];
  for (const b of allBatters) {
    const desc = String(b.outDesc ?? "").trim();
    const hasBatted = desc !== "" || num(b.balls) > 0;
    if (!hasBatted) {
      yetToBat.push(b.batName);
      continue;
    }
    const isBatting = desc === "batting";
    const isOut = desc !== "" && desc !== "batting" && desc !== "not out";
    batters.push({
      id: num(b.batId),
      name: b.batName,
      dismissal: isBatting ? "batting" : desc || "not out",
      isOut,
      isBatting,
      isCaptain: Boolean(b.isCaptain),
      isKeeper: Boolean(b.isKeeper),
      runs: num(b.runs),
      balls: num(b.balls),
      fours: num(b.fours),
      sixes: num(b.sixes),
      strikeRate: num(b.strikeRate),
    });
  }

  const bowlers: BowlerRow[] = orderByKey(bowl.bowlersData, "bowl_").map((b) => ({
    id: num(b.bowlerId),
    name: b.bowlName,
    overs: num(b.overs),
    maidens: num(b.maidens),
    runs: num(b.runs),
    wickets: num(b.wickets),
    economy: num(b.economy),
  }));

  const fallOfWickets: FallOfWicket[] = values(raw.wicketsData)
    .map((w) => ({
      wicketNumber: num(w.wktNbr),
      batterName: w.batName,
      runs: num(w.wktRuns),
      over: num(w.wktOver),
      ball: num(w.ballNbr),
    }))
    .sort((a, b) => a.wicketNumber - b.wicketNumber);

  const pp = values(raw.ppData).find((p) => p.ppType === "Mandatory") ?? values(raw.ppData)[0];

  return {
    inningsId: num(raw.inningsId),
    battingTeamId: num(bat.batTeamId),
    battingTeam: bat.batTeamName ?? "",
    battingTeamShort: bat.batTeamShortName ?? "",
    bowlingTeam: bowl.bowlTeamName ?? "",
    runs: num(score.runs),
    wickets: num(score.wickets),
    overs: num(score.overs),
    balls: num(score.ballNbr),
    runRate: num(score.runRate),
    extras: {
      total: num(extras.total),
      byes: num(extras.byes),
      legByes: num(extras.legByes),
      wides: num(extras.wides),
      noBalls: num(extras.noBalls),
      penalty: num(extras.penalty),
    },
    powerplay: pp ? { toOver: num(pp.ppOversTo), runs: num(pp.runsScored) } : undefined,
    batters,
    yetToBat,
    bowlers,
    fallOfWickets,
  };
}

function normalizeLive(mini: Raw | undefined): LiveSituation | null {
  if (!mini) return null;
  const positive = (v: unknown) => (typeof v === "number" && v > 0 ? v : null);
  const probability = mini.winProbability ?? mini.winProbabilities ?? mini.win_probability;
  const team1Probability =
    probability?.team1 ?? probability?.team1Percentage ?? mini.team1WinProbability;
  const team2Probability =
    probability?.team2 ?? probability?.team2Percentage ?? mini.team2WinProbability;
  const winProbability =
    typeof team1Probability === "number" && typeof team2Probability === "number"
      ? { team1: team1Probability, team2: team2Probability }
      : null;

  return {
    inningsId: num(mini.inningsId),
    currentRunRate: typeof mini.currentRunRate === "number" ? mini.currentRunRate : null,
    requiredRunRate: positive(mini.requiredRunRate),
    target: positive(mini.target),
    runsToWin: positive(mini.remRunsToWin),
    winProbability,
  };
}

async function fetchJson(url: string): Promise<Raw | null> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) return null;
  return (await res.json()) as Raw;
}

async function fetchPrediction(matchId: number): Promise<WinProbability | null> {
  try {
    const res = await fetch("https://www.cricbuzz.com/live-cricket-match-predictions", {
      headers: { ...HEADERS, Accept: "text/html" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const matchIndex = Math.max(
      html.indexOf(`"matchId":${matchId}`),
      html.indexOf(`\\"matchId\\":${matchId}`),
    );
    if (matchIndex < 0) return null;
    const fragment = html.slice(Math.max(0, matchIndex - 400), matchIndex + 1000);
    if (!fragment.includes("winProbability")) return null;
    const team1 = /team1[^}]{0,300}?percent[^0-9]*(\\d+(?:\\.\\d+)?)/.exec(fragment)?.[1];
    const team2 = /team2[^}]{0,300}?percent[^0-9]*(\\d+(?:\\.\\d+)?)/.exec(fragment)?.[1];
    if (!team1 || !team2) return null;
    return { team1: Number(team1), team2: Number(team2) };
  } catch {
    return null;
  }
}

export const getMatchCenter = createServerFn({ method: "GET" })
  .inputValidator(z.object({ matchId: z.number().int().positive() }))
  .handler(async ({ data }): Promise<MatchCenter> => {
    const { matchId } = data;
    const empty: MatchCenter = {
      matchId,
      format: "",
      status: "",
      state: "",
      team1Id: 0,
      team2Id: 0,
      innings: [],
      live: null,
      error: null,
    };
    try {
      const [scorecard, comm, prediction] = await Promise.all([
        fetchJson(`https://www.cricbuzz.com/api/mcenter/scorecard/${matchId}`),
        fetchJson(`https://www.cricbuzz.com/api/mcenter/comm/${matchId}`).catch(() => null),
        fetchPrediction(matchId),
      ]);
      if (!scorecard) return { ...empty, error: "Scorecard unavailable" };

      const header = scorecard.matchHeader ?? {};
      const innings = (Array.isArray(scorecard.scoreCard) ? scorecard.scoreCard : [])
        .map(normalizeInnings)
        .sort((a: InningsScorecard, b: InningsScorecard) => a.inningsId - b.inningsId);

      return {
        matchId,
        format: header.matchFormat ?? "",
        status: scorecard.status ?? header.status ?? "",
        state: header.state ?? "",
        team1Id: num(header.team1?.id),
        team2Id: num(header.team2?.id),
        innings,
        live: (() => {
          const live = normalizeLive(comm?.miniscore);
          if (!live || live.winProbability || !prediction) return live;
          return { ...live, winProbability: prediction };
        })(),
        error: null,
      };
    } catch (e) {
      return { ...empty, error: (e as Error).message };
    }
  });
