import type { MatchEntry } from "@/types/cricket";

export interface SeriesGroupData {
  seriesId: number;
  seriesName: string;
  matches: MatchEntry[];
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
