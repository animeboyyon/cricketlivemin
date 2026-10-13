import type { MatchEntry } from "@/types/cricket";

export interface SeriesGroupData {
  seriesId: number;
  seriesName: string;
  matches: MatchEntry[];
}

const SKIPPED_WORDS = new Set(["of", "the", "in", "tour", "vs", "v", "and"]);

function abbreviate(part: string): string {
  const words = part.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) {
    const word = words[0];
    return word.length <= 4 ? word.toUpperCase() : word.slice(0, 3).toUpperCase();
  }
  return words
    .filter((w) => !SKIPPED_WORDS.has(w.toLowerCase()))
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function shortSeriesName(name: string): string {
  const base = name.replace(/,?\s*\d{4}(\/\d{2,4})?\s*$/, "").trim();
  const versus = base.match(/^(.+?)\s+(?:tour of|vs|v)\s+(.+?)(?:\s+in\s+.+)?$/i);
  if (versus) return `${abbreviate(versus[1])} v ${abbreviate(versus[2])}`;
  return base.length <= 12 ? base : abbreviate(base);
}

export function groupBySeries(entries: MatchEntry[]): SeriesGroupData[] {
  const groups = new Map<number, SeriesGroupData>();
  for (const entry of entries) {
    const { seriesId, seriesName } = entry.match.matchInfo;
    const group = groups.get(seriesId);
    if (group) group.matches.push(entry);
    else groups.set(seriesId, { seriesId, seriesName, matches: [entry] });
  }
  return [...groups.values()];
}
