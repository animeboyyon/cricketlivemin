import type { MatchEntry, MatchInfo, MatchScore } from "@/types/cricket";

interface RawMatch {
  matchInfo?: Record<string, unknown> & { matchId?: number | string };
  matchScore?: MatchScore;
}

const FLIGHT_PUSH = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
const WRAPPER_KEY = '"seriesAdWrapper":';
const TYPE_MATCHES_KEY = '"typeMatches":';

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

/** Return the balanced `{...}` or `[...]` value starting at `start`, respecting strings. */
function sliceBalanced(text: string, start: number): string | null {
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
    else if (ch === "{" || ch === "[") depth++;
    else if ((ch === "}" || ch === "]") && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

interface RawSeriesWrapper {
  matches?: RawMatch[];
}

interface RawTypeMatches {
  seriesMatches?: { seriesAdWrapper?: RawSeriesWrapper }[];
}

/**
 * Series wrappers in Cricbuzz's own ranking: match type (International, League,
 * Domestic, Women), then the order of series inside each type.
 */
function rankedWrappers(data: string): RawSeriesWrapper[] {
  const wrappers: RawSeriesWrapper[] = [];
  let from = 0;
  for (;;) {
    const at = data.indexOf(TYPE_MATCHES_KEY, from);
    if (at === -1) break;
    const start = at + TYPE_MATCHES_KEY.length;
    const json = sliceBalanced(data, start);
    from = start + (json?.length ?? 1);
    if (!json) continue;
    try {
      for (const type of JSON.parse(json) as RawTypeMatches[]) {
        for (const series of type.seriesMatches ?? []) {
          if (series.seriesAdWrapper) wrappers.push(series.seriesAdWrapper);
        }
      }
    } catch {
      // Try the next occurrence of the block.
    }
    if (wrappers.length > 0) break;
  }
  return wrappers;
}

/** Every series wrapper found anywhere in the page, in page order. */
function scatteredWrappers(data: string): RawSeriesWrapper[] {
  const wrappers: RawSeriesWrapper[] = [];
  let from = 0;
  for (;;) {
    const at = data.indexOf(WRAPPER_KEY, from);
    if (at === -1) break;
    const start = at + WRAPPER_KEY.length;
    const json = sliceBalanced(data, start);
    from = start + (json?.length ?? 1);
    if (!json) continue;
    try {
      wrappers.push(JSON.parse(json) as RawSeriesWrapper);
    } catch {
      // Skip a wrapper we cannot parse and keep going.
    }
  }
  return wrappers;
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
 * Extract every match listed on cricbuzz.com/cricket-match/live-scores, in the
 * order Cricbuzz ranks them. The page repeats its data several times, so results
 * are de-duplicated by matchId; wrappers outside the ranked block are appended last.
 */
export function parseLiveScoresPage(html: string): MatchEntry[] {
  const data = readFlightData(html);
  const seen = new Map<number, MatchEntry>();

  for (const wrapper of [...rankedWrappers(data), ...scatteredWrappers(data)]) {
    for (const raw of wrapper.matches ?? []) {
      const entry = toEntry(raw);
      if (entry && !seen.has(entry.match.matchInfo.matchId)) {
        seen.set(entry.match.matchInfo.matchId, entry);
      }
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
