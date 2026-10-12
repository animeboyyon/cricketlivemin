# Cricket Glow

A minimal, dark-mode live cricket scoreboard. Live scores, scorecards, ball-by-ball commentary and win probability, built on TanStack Start and deployed to Cloudflare Workers.

**Live app**: https://cricketlivemin.lovable.app

## Features

- **Home**: matches grouped by series, with one row of filter chips (live, upcoming, completed, series) and a small "updated" timestamp that turns amber when data is stale.
- **Match page**: summary, scorecard and commentary tabs. The last six balls show as dots in the header, and a worm chart compares the innings.
- **Win probability**: Cricbuzz's own figure when available. Otherwise an estimate for chases, marked with a muted "est." label.
- **Team sheet**: tap a team logo to see its other results in the current feed.
- **Bell and share**: a bell for score-change notifications on a match, and a share button backed by per-match link previews.

Some elements only appear during live play (the ball dots, live commentary, the required rate and the bell's alerts).

## Data

All data comes from Cricbuzz public endpoints, fetched server-side.

- The home feed (`/api/home`) is cached for 3 seconds on the server and refetched every 5 seconds on the client.
- If a fetch fails, the last good response is served and flagged as stale, so the UI never goes blank.
- Match pages refresh every 5 seconds while live and every 2 minutes otherwise.

These are unofficial endpoints with no stability guarantee. If the response shape changes, the parsers in `src/lib/scorecard.functions.ts` are the place to look.

## Development

```sh
pnpm install
pnpm dev
```

| Command                  | What it does         |
| ------------------------ | -------------------- |
| `pnpm dev`               | Start the dev server |
| `pnpm build`             | Production build     |
| `pnpm test`              | Run the unit tests   |
| `pnpm lint`              | Lint the project     |
| `pnpm exec tsc --noEmit` | Type-check           |

## Project layout

- `src/routes`: pages (`index.tsx` home, `match.$matchId.tsx` match page).
- `src/lib`: server functions, the Cricbuzz parsers, series grouping and worm-chart data. Unit tests sit next to them as `*.test.ts`.
- `src/components`: UI, with match-specific pieces in `components/match`.
- `src/server.ts`: SSR entry with the error wrapper used by Cloudflare.
