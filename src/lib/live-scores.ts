import type { MatchEntry, MatchInfo, MatchScore } from "@/types/cricket";

interface RawMatch {
  matchInfo?: Record<string, unknown> & { matchId?: number | string };
  matchScore?: MatchScore;
}

const FLIGHT_PUSH = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
const WRAPPER_KEY = '"seriesAdWrapper":';

/** Concatenate the decoded React Server Component chunks embedded in the page. */
function readFlightData(html: string): string {
  let data = "";
  for (const m of html.matchAll(FLIGHT_PUSH)) {
    try {
      data += JSON.parse(`"${m[1]}"`) as string;
    } catch {
      // A malformed chunk should not discard the rest of the page.
    }
  }
  return data;
}

/** Return the balanced `{...}` object starting at `start`, respecting strings. */
function sliceObject(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

function toEntry(raw: RawMatch): MatchEntry | null {
  const info = raw.matchInfo;
  if (!info || info.matchId == null) return null;
  const matchInfo = {
    ...info,
    matchId: Number(info.matchId),
    seriesId: Number(info.seriesId),
    startDate: Number(info.startDate),
    endDate: Number(info.endDate),
  } as unknown as MatchInfo;
  if (!matchInfo.team1 || !matchInfo.team2) return null;
  return { match: { matchInfo, matchScore: raw.matchScore } };
}

/**
 * Extract every match listed on cricbuzz.com/cricket-match/live-scores.
 * The page repeats its data several times, so results are de-duplicated by matchId.
 */
export function parseLiveScoresPage(html: string): MatchEntry[] {
  const data = readFlightData(html);
  const seen = new Map<number, MatchEntry>();

  let from = 0;
  for (;;) {
    const at = data.indexOf(WRAPPER_KEY, from);
    if (at === -1) break;
    const start = at + WRAPPER_KEY.length;
    const json = sliceObject(data, start);
    from = start + (json?.length ?? 1);
    if (!json) continue;
    try {
      const wrapper = JSON.parse(json) as { matches?: RawMatch[] };
      for (const raw of wrapper.matches ?? []) {
        const entry = toEntry(raw);
        if (entry && !seen.has(entry.match.matchInfo.matchId)) {
          seen.set(entry.match.matchInfo.matchId, entry);
        }
      }
    } catch {
      // Skip a wrapper we cannot parse and keep going.
    }
  }
  return [...seen.values()];
}

/** Combine feeds; entries from earlier lists win when a matchId appears twice. */
export function mergeMatches(...lists: MatchEntry[][]): MatchEntry[] {
  const merged = new Map<number, MatchEntry>();
  for (const list of lists) {
    for (const entry of list) {
      const id = entry.match.matchInfo.matchId;
      if (!merged.has(id)) merged.set(id, entry);
    }
  }
  return [...merged.values()];
}
