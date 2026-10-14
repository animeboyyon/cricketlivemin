export const ALERT_CATEGORIES = [
  { key: "starting_soon", label: "Starting soon", description: "30 minutes before the match begins", defaultOn: true },
  { key: "match_start", label: "Toss & play started", description: "Toss result and when the first ball is bowled", defaultOn: true },
  { key: "wickets", label: "Wickets", description: "Every dismissal with the batter's score", defaultOn: true },
  { key: "sixes", label: "Sixes", description: "Each six hit", defaultOn: false },
  { key: "fours", label: "Fours", description: "Each boundary four (can be frequent)", defaultOn: false },
  { key: "milestones", label: "Milestones", description: "Fifties, hundreds and five-wicket hauls", defaultOn: true },
  { key: "breaks", label: "Breaks & interruptions", description: "Innings break, lunch, tea, stumps, rain, play resumed", defaultOn: true },
  { key: "result", label: "Final result", description: "The moment the match ends", defaultOn: true },
] as const;

export type AlertCategory = (typeof ALERT_CATEGORIES)[number]["key"];

export const DEFAULT_CATEGORIES: AlertCategory[] = ALERT_CATEGORIES.filter((category) => category.defaultOn).map(
  (category) => category.key,
);

const VALID_KEYS = new Set<string>(ALERT_CATEGORIES.map((category) => category.key));

export function sanitizeCategories(input: unknown): AlertCategory[] {
  if (!Array.isArray(input)) return [];
  const requested = new Set(input.filter((value): value is string => typeof value === "string" && VALID_KEYS.has(value)));
  return ALERT_CATEGORIES.filter((category) => requested.has(category.key)).map((category) => category.key);
}
