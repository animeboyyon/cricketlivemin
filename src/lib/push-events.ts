import type { AlertCategory } from "./push-categories";

export const SOON_WINDOW_MS = 30 * 60 * 1000;
const MAX_MESSAGES_PER_CYCLE = 4;

export interface MatchEvent {
  ts: number;
  category: "wickets" | "sixes" | "fours";
  title: string;
  body: string;
}

export interface MatchMilestone {
  key: string;
  title: string;
  body: string;
}

export interface MatchSnapshot {
  state: string;
  status: string;
  finished: boolean;
  startTs: number;
  toss: string | null;
  score: string;
  events: MatchEvent[];
  milestones: MatchMilestone[];
}

export interface ReminderProgress {
  init?: boolean;
  cursor?: number;
  state?: string;
  toss?: boolean;
  soon?: boolean;
  done?: boolean;
  milestones?: string[];
}

export interface AlertMessage {
  category: AlertCategory;
  title: string;
  body: string;
  tag: string;
}

type Rec = Record<string, unknown>;

const asRec = (value: unknown): Rec => (value && typeof value === "object" ? (value as Rec) : {});
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const str = (value: unknown) => (typeof value === "string" ? value : "");

export function stripHtml(text: string) {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

const isLiveState = (state: string) => /in progress/i.test(state);
const isPreState = (state: string) => !state || /preview|upcoming|toss/i.test(state);
const isFinishedState = (state: string) => /complete|abandon|no result/i.test(state);
const isBreakState = (state: string) => Boolean(state) && !isLiveState(state) && !isPreState(state) && !isFinishedState(state);

function buildScore(mini: Rec) {
  const innings = asRec(mini.matchScoreDetails).inningsScoreList;
  if (!Array.isArray(innings) || innings.length === 0) return "";
  const current = innings.find((entry) => num(asRec(entry).inningsId) === num(mini.inningsId)) ?? innings[innings.length - 1];
  const entry = asRec(current);
  return `${str(entry.batTeamName)} ${num(entry.score)}/${num(entry.wickets)} (${num(entry.overs)} ov)`.trim();
}

function buildToss(header: Rec) {
  const toss = asRec(header.tossResults);
  const winner = str(toss.tossWinnerName);
  if (!winner) return null;
  const decision = /bowl/i.test(str(toss.decision)) ? "bowl" : "bat";
  return `${winner} won the toss and chose to ${decision}`;
}

function buildEvents(commentary: Rec, score: string): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (const raw of Object.values(commentary)) {
    const entry = asRec(raw);
    const ts = num(entry.timestamp);
    if (str(entry.commType) !== "commentary" || !ts || !Array.isArray(entry.event)) continue;
    const tags = entry.event.filter((tag): tag is string => typeof tag === "string");
    const text = str(entry.commText);
    const plain = stripHtml(text);
    if (tags.includes("wicket")) {
      const bolds = [...text.matchAll(/<b>(.*?)<\/b>/g)].map((match) => stripHtml(match[1]));
      const dismissal = bolds.reverse().find((bold) => /\d+\(\d+\)/.test(bold));
      events.push({
        ts,
        category: "wickets",
        title: "WICKET",
        body: [dismissal ?? truncate(plain, 140), score].filter(Boolean).join("\n"),
      });
    } else if (tags.includes("six")) {
      events.push({ ts, category: "sixes", title: "SIX", body: truncate(plain, 140) });
    } else if (tags.includes("four")) {
      events.push({ ts, category: "fours", title: "FOUR", body: truncate(plain, 140) });
    }
  }
  return events.sort((a, b) => a.ts - b.ts);
}

function buildMilestones(mini: Rec, score: string): MatchMilestone[] {
  const milestones: MatchMilestone[] = [];
  const inningsId = num(mini.inningsId);
  for (const batter of [asRec(mini.batsmanStriker), asRec(mini.batsmanNonStriker)]) {
    const id = num(batter.id);
    const runs = num(batter.runs);
    if (!id) continue;
    for (let tier = 50; tier <= runs; tier += 50) {
      const name = str(batter.name);
      const headline = tier === 50 ? `${name} reaches a fifty` : tier === 100 ? `${name} scores a hundred` : `${name} reaches ${tier}`;
      milestones.push({
        key: `${inningsId}:bat:${id}:${tier}`,
        title: headline,
        body: [`${name} ${runs}(${num(batter.balls)})`, score].filter(Boolean).join(" · "),
      });
    }
  }
  for (const bowler of [asRec(mini.bowlerStriker), asRec(mini.bowlerNonStriker)]) {
    const id = num(bowler.id);
    if (!id || num(bowler.wickets) < 5) continue;
    const name = str(bowler.name);
    milestones.push({
      key: `${inningsId}:bowl:${id}:5`,
      title: `${name} takes a five-wicket haul`,
      body: [`${name} ${num(bowler.wickets)}/${num(bowler.runs)} (${num(bowler.overs)} ov)`, score].filter(Boolean).join(" · "),
    });
  }
  return milestones;
}

export function buildSnapshot(comm: unknown): MatchSnapshot | null {
  const root = asRec(comm);
  const header = asRec(root.matchHeader);
  const state = str(header.state);
  if (!state) return null;
  const mini = asRec(root.miniscore);
  const score = buildScore(mini);
  return {
    state,
    status: str(header.status) || str(mini.status),
    finished: header.complete === true || isFinishedState(state),
    startTs: num(header.matchStartTimestamp),
    toss: buildToss(header),
    score,
    events: buildEvents(asRec(root.matchCommentary), score),
    milestones: buildMilestones(mini, score),
  };
}

export function evaluateReminder(args: {
  snapshot: MatchSnapshot;
  progress: ReminderProgress;
  categories: AlertCategory[];
  label: string;
  matchId: number;
  now: number;
}): { messages: AlertMessage[]; progress: ReminderProgress } {
  const { snapshot, categories, label, matchId, now } = args;
  const previous = args.progress ?? {};
  const maxTs = snapshot.events.reduce((latest, event) => Math.max(latest, event.ts), previous.cursor ?? 0);
  const milestoneKeys = snapshot.milestones.map((milestone) => milestone.key);

  if (!previous.init) {
    return {
      messages: [],
      progress: {
        init: true,
        cursor: maxTs,
        state: snapshot.state,
        toss: Boolean(snapshot.toss),
        soon: snapshot.startTs > 0 && snapshot.startTs - now <= SOON_WINDOW_MS,
        done: snapshot.finished,
        milestones: milestoneKeys,
      },
    };
  }

  const all: AlertMessage[] = [];
  const next: ReminderProgress = { ...previous, cursor: maxTs, state: snapshot.state };
  const push = (category: AlertCategory, title: string, body: string, tag: string) =>
    all.push({ category, title, body, tag: `${matchId}-${tag}` });
  const status = snapshot.status || snapshot.state;

  if (!previous.soon && snapshot.startTs > 0 && snapshot.startTs - now <= SOON_WINDOW_MS) {
    next.soon = true;
    if (isPreState(snapshot.state)) {
      const minutes = Math.round((snapshot.startTs - now) / 60000);
      push("starting_soon", `Starting soon · ${label}`, minutes > 0 ? `Play begins in ${minutes} min` : "Play is about to begin", "soon");
    }
  }

  if (!previous.toss && snapshot.toss) {
    next.toss = true;
    push("match_start", `Toss · ${label}`, snapshot.toss, "toss");
  }

  const before = previous.state ?? "";
  if (before !== snapshot.state) {
    if (isLiveState(snapshot.state) && isPreState(before)) {
      push("match_start", `Play has started · ${label}`, status, `start`);
    } else if (isLiveState(snapshot.state) && isBreakState(before)) {
      push("breaks", `Play resumed · ${label}`, status, `resume-${now}`);
    } else if (isBreakState(snapshot.state)) {
      push("breaks", `${snapshot.state} · ${label}`, [status, snapshot.score].filter(Boolean).join("\n"), `break-${snapshot.state}-${now}`);
    }
  }

  for (const event of snapshot.events) {
    if (event.ts <= (previous.cursor ?? 0)) continue;
    push(event.category, `${event.title} · ${label}`, event.body, `${event.category}-${event.ts}`);
  }

  const seen = new Set(previous.milestones ?? []);
  for (const milestone of snapshot.milestones) {
    if (seen.has(milestone.key)) continue;
    push("milestones", `${milestone.title} · ${label}`, milestone.body, `ms-${milestone.key}`);
  }
  next.milestones = [...new Set([...(previous.milestones ?? []), ...milestoneKeys])].slice(-200);

  if (snapshot.finished && !previous.done) {
    next.done = true;
    push("result", `Result · ${label}`, status, "result");
  }

  let messages = all.filter((message) => categories.includes(message.category));
  if (messages.length > MAX_MESSAGES_PER_CYCLE) {
    const extra = messages.length - (MAX_MESSAGES_PER_CYCLE - 1);
    messages = [
      ...messages.slice(0, MAX_MESSAGES_PER_CYCLE - 1),
      {
        category: messages[MAX_MESSAGES_PER_CYCLE - 1].category,
        title: `${label} · ${extra} more updates`,
        body: [status, snapshot.score].filter(Boolean).join("\n"),
        tag: `${matchId}-more-${now}`,
      },
    ];
  }
  return { messages, progress: next };
}
