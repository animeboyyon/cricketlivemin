import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  BatterRow,
  BowlerRow,
  CommentaryEntry,
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
  const positive = (v: unknown) => {
    const value = typeof v === "string" ? Number.parseFloat(v.replace(/%/g, "")) : v;
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
  };
  const findNumber = (source: unknown, keys: string[]): number | null => {
    if (!source || typeof source !== "object") return null;
    for (const [key, value] of Object.entries(source as Raw)) {
      if (keys.some((candidate) => key.toLowerCase().replace(/[_-]/g, "").includes(candidate))) {
        const parsed = positive(value);
        if (parsed !== null && parsed <= 100) return parsed;
      }
      const nested = findNumber(value, keys);
      if (nested !== null) return nested;
    }
    return null;
  };
  // Cricbuzz's miniscore may expose a rapidly changing heuristic. Do not use it;
  // the scorecard consumes the official prediction page value below instead.
  const winProbability = null;

  return {
    inningsId: num(mini.inningsId),
    currentRunRate: positive(mini.currentRunRate),
    requiredRunRate: positive(mini.requiredRunRate),
    target: positive(mini.target),
    runsToWin: positive(mini.remRunsToWin),
    winProbability,
  };
}

const MAX_COMMENTARY = 60;
const lastOfficialProbability = new Map<number, WinProbability>();

const stripMarkup = (text: unknown) =>
  String(text ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

function parseBalls(summary: unknown): string[] {
  return String(summary ?? "")
    .split(/[\s|]+/)
    .filter((token) => token !== "" && !/^\.+$/.test(token));
}

export function parseRecentBalls(recentOvsStats: unknown): string[] {
  return parseBalls(recentOvsStats).slice(-6);
}

export function normalizeCommentary(raw: unknown): CommentaryEntry[] {
  return values(raw)
    .filter((entry) => typeof entry.timestamp === "number")
    .sort((a, b) => b.timestamp - a.timestamp)
    .flatMap((entry, index): CommentaryEntry[] => {
      const id = `${entry.timestamp}-${index}`;
      if (entry.commType === "over-separator" && entry.overSeparator) {
        const sep = entry.overSeparator as Raw;
        const runs = num(sep.overRuns);
        const team = sep.batTeamObj?.teamName;
        const score = sep.batTeamObj?.teamScore;
        return [
          {
            id,
            kind: "over",
            over: null,
            text: `End of over ${num(sep.overNumber)}`,
            detail: [
              `${runs} ${runs === 1 ? "run" : "runs"}`,
              team && score ? `${team} ${score}` : "",
            ]
              .filter(Boolean)
              .join(" · "),
            balls: parseBalls(sep.overSummary),
            highlight: null,
          },
        ];
      }
      const text = stripMarkup(entry.commText);
      if (!text) return [];
      const events = (Array.isArray(entry.event) ? entry.event : []).map((e: unknown) =>
        String(e).toLowerCase(),
      );
      const highlight =
        events.includes("wicket") || /,\s*OUT\b/.test(text)
          ? "wicket"
          : events.includes("six") || /,\s*SIX runs?\b/.test(text)
            ? "six"
            : events.includes("four") || /,\s*FOUR runs?\b/.test(text)
              ? "four"
              : null;
      const hasBall = typeof entry.ballMetric === "number";
      return [
        {
          id,
          kind: hasBall ? "ball" : "note",
          over: hasBall ? String(entry.ballMetric) : null,
          text,
          highlight,
        },
      ];
    })
    .slice(0, MAX_COMMENTARY);
}

async function fetchJson(url: string): Promise<Raw | null> {
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok || !res.headers.get("content-type")?.includes("json")) return null;
  return (await res.json()) as Raw;
}

async function fetchPrediction(matchId: number): Promise<WinProbability | null> {
  try {
    const res = await fetch(
      `https://www.cricbuzz.com/live-cricket-match-predictions?ts=${Date.now()}`,
      {
        headers: { ...HEADERS, Accept: "text/html", "Cache-Control": "no-cache" },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const html = await res.text();
    return parsePrediction(html, matchId);
  } catch {
    return null;
  }
}

// Cricbuzz embeds each match's figure as escaped JSON inside serialized
// Next.js data, so we unescape and parse that exact object.
export function parsePrediction(html: string, matchId: number): WinProbability | null {
  const text = html.replace(/\\"/g, '"');
  const key = '"winProbability":';
  const marker = `${key}{"matchId":${matchId},`;
  const candidates: Array<{ probability: WinProbability; updatedOver: number }> = [];
  let searchFrom = 0;

  while (true) {
    const start = text.indexOf(marker, searchFrom);
    if (start < 0) break;
    const objectStart = start + key.length;
    let depth = 0;
    let objectEnd = -1;
    for (let i = objectStart; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}" && --depth === 0) {
        objectEnd = i;
        break;
      }
    }
    if (objectEnd < 0) break;

    try {
      const data = JSON.parse(text.slice(objectStart, objectEnd + 1)) as Raw;
      const team1 = Number(data.team1?.percent);
      const team2 = Number(data.team2?.percent);
      const draw = Number(data.drawPercent ?? data.drawTiePercent ?? 0);
      const valid = (value: number) => Number.isFinite(value) && value >= 0 && value <= 100;
      if (valid(team1) && valid(team2)) {
        candidates.push({
          probability: {
            team1,
            team2,
            draw: valid(draw) && draw > 0 ? draw : undefined,
            team1Id: num(data.team1?.id),
            team2Id: num(data.team2?.id),
          },
          updatedOver: Number(data.lastUpdatedOver) || -1,
        });
      }
    } catch {
      // Ignore malformed serialized records and continue scanning the payload.
    }
    searchFrom = objectEnd + 1;
  }

  return candidates
    .sort((a, b) => b.updatedOver - a.updatedOver)
    .at(0)?.probability ?? null;
}

// Cricbuzz's prediction page orders teams differently from the scorecard, so
// put each percentage on the team it belongs to.
export function alignProbability(
  probability: WinProbability,
  team1Id: number,
  team2Id: number,
): WinProbability {
  const { team1Id: p1, team2Id: p2, ...rest } = probability;
  if (p1 && p2 && p1 === team2Id && p2 === team1Id) {
    return { ...rest, team1: probability.team2, team2: probability.team1 };
  }
  return rest;
}

export function estimateChaseProbability(
  innings: InningsScorecard[],
  live: LiveSituation | null,
  team1Id?: number,
): WinProbability | null {
  if (!live?.target || live.inningsId <= 0) return null;
  const current = innings.find((entry) => entry.inningsId === live.inningsId);
  if (!current || current.runs <= 0 || current.overs <= 0) return null;
  const previous = innings.find((entry) => entry.inningsId !== current.inningsId);
  const ballsRemaining = Math.max(
    1,
    Math.round(((live.target - current.runs) / Math.max(live.requiredRunRate ?? 6, 1)) * 6),
  );
  const wicketsRemaining = Math.max(0, 10 - current.wickets);
  const requiredRate = live.requiredRunRate ?? (live.target - current.runs) / (ballsRemaining / 6);
  const scoringRate = current.runRate || current.runs / (current.overs || 1);
  const pressure = requiredRate / Math.max(scoringRate, 1);
  const chase = Math.max(
    5,
    Math.min(
      95,
      58 - (pressure - 1) * 28 + wicketsRemaining * 1.8 + Math.min(ballsRemaining, 120) / 20,
    ),
  );
  const battingTeamIsTeam1 = current.battingTeamId === (team1Id || previous?.battingTeamId || 0);
  return battingTeamIsTeam1
    ? { team1: Math.round(chase), team2: Math.round(100 - chase), estimated: true }
    : { team1: Math.round(100 - chase), team2: Math.round(chase), estimated: true };
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
      recentBalls: [],
      commentary: [],
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
          const normalized = normalizeLive(comm?.miniscore);
          if (!normalized) return null;
          const current =
            innings.find((entry) => entry.inningsId === normalized.inningsId) ?? innings.at(-1);
          if (!current) return normalized;
          const previous = innings
            .filter((entry) => entry.inningsId !== current.inningsId)
            .sort((a, b) => b.inningsId - a.inningsId)[0];
          const live = {
            ...normalized,
            inningsId: current.inningsId,
            target:
              normalized.target ??
              (previous && current.inningsId > previous.inningsId ? previous.runs + 1 : null),
            runsToWin:
              normalized.runsToWin ??
              (normalized.target && current ? Math.max(0, normalized.target - current.runs) : null),
          };
          const team1Id = num(header.team1?.id);
          const team2Id = num(header.team2?.id);
          if (prediction) {
            const official = alignProbability(prediction, team1Id, team2Id);
            lastOfficialProbability.set(matchId, official);
            return { ...live, winProbability: official };
          }
          // Keep the last official value through tea, lunch, stumps and innings
          // breaks. Never replace it with a miniscore heuristic or an unavailable state.
          return {
            ...live,
            winProbability: lastOfficialProbability.get(matchId) ?? null,
          };
        })(),
        recentBalls: parseRecentBalls(comm?.miniscore?.recentOvsStats),
        commentary: normalizeCommentary(comm?.matchCommentary),
        error: null,
      };
    } catch (e) {
      return { ...empty, error: (e as Error).message };
    }
  });
