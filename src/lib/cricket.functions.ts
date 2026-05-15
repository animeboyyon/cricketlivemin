import { createServerFn } from "@tanstack/react-start";

export const getCricketHome = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const res = await fetch("https://www.cricbuzz.com/api/home", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return { matches: [], error: `Upstream error ${res.status}` };
    }
    const json = (await res.json()) as { matches?: unknown[] };
    return { matches: json.matches ?? [], error: null as string | null };
  } catch (e) {
    return { matches: [], error: (e as Error).message };
  }
});
