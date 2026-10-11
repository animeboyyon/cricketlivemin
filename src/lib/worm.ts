import type { InningsScorecard } from "@/types/scorecard";

export interface WormRow {
  over: number;
  team1?: number;
  team2?: number;
  team1Wicket?: string;
  team2Wicket?: string;
}

interface Anchor {
  ball: number;
  runs: number;
}

export function maxOversForFormat(format: string): number | null {
  const f = format.toUpperCase();
  if (f.includes("T20")) return 20;
  if (f.includes("ODI")) return 50;
  if (f.includes("T10")) return 10;
  if (f.includes("HUNDRED")) return 100 / 6;
  return null;
}

export function oversToBalls(overs: number): number {
  const whole = Math.trunc(overs);
  return whole * 6 + Math.round((overs - whole) * 10);
}

export function formatOvers(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

/**
 * Cricbuzz exposes only milestone totals (powerplay, each wicket, current score),
 * so the worm is linearly interpolated between those real anchor points.
 */
function buildAnchors(inn: InningsScorecard): Anchor[] {
  const totalBalls = inn.balls || oversToBalls(inn.overs);
  const anchors: Anchor[] = [{ ball: 0, runs: 0 }];
  if (inn.powerplay && inn.powerplay.toOver * 6 <= totalBalls) {
    anchors.push({ ball: Math.round(inn.powerplay.toOver * 6), runs: inn.powerplay.runs });
  }
  for (const w of inn.fallOfWickets) anchors.push({ ball: w.ball, runs: w.runs });
  anchors.push({ ball: totalBalls, runs: inn.runs });

  anchors.sort((a, b) => a.ball - b.ball);
  const monotonic: Anchor[] = [];
  for (const a of anchors) {
    const prev = monotonic[monotonic.length - 1];
    if (prev && a.ball === prev.ball) {
      prev.runs = Math.max(prev.runs, a.runs);
    } else if (!prev || a.runs >= prev.runs) {
      monotonic.push({ ...a });
    }
  }
  return monotonic;
}

function interpolate(anchors: Anchor[], ball: number): number {
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1];
    const b = anchors[i];
    if (ball <= b.ball) {
      const span = b.ball - a.ball || 1;
      return Math.round(a.runs + ((b.runs - a.runs) * (ball - a.ball)) / span);
    }
  }
  return anchors[anchors.length - 1]?.runs ?? 0;
}

export function buildWormData(
  team1Innings: InningsScorecard | undefined,
  team2Innings: InningsScorecard | undefined,
): WormRow[] {
  const rows = new Map<number, WormRow>();
  const rowAt = (over: number) => {
    const key = Math.round(over * 1000) / 1000;
    let row = rows.get(key);
    if (!row) {
      row = { over: key };
      rows.set(key, row);
    }
    return row;
  };

  const plot = (inn: InningsScorecard | undefined, key: "team1" | "team2") => {
    if (!inn) return;
    const anchors = buildAnchors(inn);
    const lastBall = anchors[anchors.length - 1]?.ball ?? 0;
    for (let ball = 0; ball <= lastBall; ball += 6)
      rowAt(ball / 6)[key] = interpolate(anchors, ball);
    rowAt(lastBall / 6)[key] = inn.runs;
    for (const w of inn.fallOfWickets) {
      const row = rowAt(w.ball / 6);
      row[key] = w.runs;
      row[`${key}Wicket`] = `${w.batterName} · ${w.runs}/${w.wicketNumber}`;
    }
  };

  plot(team1Innings, "team1");
  plot(team2Innings, "team2");
  return [...rows.values()].sort((a, b) => a.over - b.over);
}
