import { createServerFn } from "@tanstack/react-start";
import type { MatchEntry } from "@/types/cricket";

export interface CricketHomeResult {
  matches: MatchEntry[];
  error: string | null;
  fetchedAt: number | null;
  stale: boolean;
}

const CACHE_TTL_MS = 3_000;
const REQUEST_TIMEOUT_MS = 8_000;

let lastGood: { matches: MatchEntry[]; fetchedAt: number } | null = null;
let inflight: Promise<CricketHomeResult> | null = null;

async function fetchHome(): Promise<CricketHomeResult> {
  try {
    const res = await fetch("https://www.cricbuzz.com/api/home", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Upstream error ${res.status}`);
    const json = (await res.json()) as { matches?: MatchEntry[] };
    lastGood = { matches: json.matches ?? [], fetchedAt: Date.now() };
    return { ...lastGood, error: null, stale: false };
  } catch (e) {
    // Serve the last good snapshot instead of blanking the scoreboard.
    if (lastGood) return { ...lastGood, error: null, stale: true };
    return { matches: [], error: (e as Error).message, fetchedAt: null, stale: false };
  }
}

export const getCricketHome = createServerFn({ method: "GET" }).handler(
  async (): Promise<CricketHomeResult> => {
    if (lastGood && Date.now() - lastGood.fetchedAt < CACHE_TTL_MS) {
      return { ...lastGood, error: null, stale: false };
    }
    // Share one upstream request between concurrent visitors.
    inflight ??= fetchHome().finally(() => {
      inflight = null;
    });
    return inflight;
  },
);
