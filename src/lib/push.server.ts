import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_CATEGORIES, sanitizeCategories, type AlertCategory } from "./push-categories";
import { buildSnapshot, evaluateReminder, type ReminderProgress } from "./push-events";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

const COMM_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

class BadRequestError extends Error {}

function getAdmin() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase server credentials are not configured");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

type Admin = ReturnType<typeof getAdmin>;

function configurePush() {
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    throw new Error("Web Push VAPID credentials are not configured");
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export function getPublicKey() {
  if (!vapidPublicKey) throw new Error("VAPID_PUBLIC_KEY is not configured");
  return vapidPublicKey;
}

async function pruneSubscription(admin: Admin, subscriptionId: string) {
  const { count } = await admin
    .from("match_reminders")
    .select("id", { count: "exact", head: true })
    .eq("subscription_id", subscriptionId);
  if (!count) await admin.from("push_subscriptions").delete().eq("id", subscriptionId);
}

export async function registerReminder(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  matchId: number;
  matchLabel: string;
  categories: unknown;
}) {
  const categories = sanitizeCategories(input.categories ?? DEFAULT_CATEGORIES);
  if (
    !input.endpoint ||
    !input.keys?.p256dh ||
    !input.keys?.auth ||
    !Number.isInteger(input.matchId) ||
    typeof input.matchLabel !== "string" ||
    categories.length === 0
  ) {
    throw new BadRequestError("Invalid alert payload");
  }
  const admin = getAdmin();
  const { data: subscription, error: subscriptionError } = await admin
    .from("push_subscriptions")
    .upsert(
      { endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, updated_at: new Date().toISOString() },
      { onConflict: "endpoint" },
    )
    .select("id")
    .single();
  if (subscriptionError) throw subscriptionError;

  const { error } = await admin.from("match_reminders").upsert(
    {
      match_id: input.matchId,
      match_label: input.matchLabel.slice(0, 180),
      subscription_id: subscription.id,
      categories,
    },
    { onConflict: "match_id,subscription_id" },
  );
  if (error) throw error;
  return categories;
}

export async function lookupReminder(input: { endpoint: string; matchId: number }): Promise<AlertCategory[] | null> {
  if (!input.endpoint || !Number.isInteger(input.matchId)) throw new BadRequestError("Invalid lookup payload");
  const admin = getAdmin();
  const { data: subscription } = await admin.from("push_subscriptions").select("id").eq("endpoint", input.endpoint).maybeSingle();
  if (!subscription) return null;
  const { data } = await admin
    .from("match_reminders")
    .select("categories")
    .eq("match_id", input.matchId)
    .eq("subscription_id", subscription.id)
    .maybeSingle();
  return data ? sanitizeCategories(data.categories) : null;
}

export async function removeReminder(input: { endpoint: string; matchId: number }) {
  if (!input.endpoint || !Number.isInteger(input.matchId)) throw new BadRequestError("Invalid alert payload");
  const admin = getAdmin();
  const { data: subscription } = await admin.from("push_subscriptions").select("id").eq("endpoint", input.endpoint).maybeSingle();
  if (!subscription) return;
  await admin.from("match_reminders").delete().eq("match_id", input.matchId).eq("subscription_id", subscription.id);
  await pruneSubscription(admin, subscription.id);
}

interface ReminderRow {
  id: string;
  match_id: number;
  match_label: string;
  categories: unknown;
  progress: ReminderProgress | null;
  subscription_id: string;
  push_subscriptions: { endpoint: string; p256dh: string; auth: string } | { endpoint: string; p256dh: string; auth: string }[] | null;
}

async function fetchComm(matchId: number): Promise<unknown | null> {
  try {
    const response = await fetch(`https://www.cricbuzz.com/api/mcenter/comm/${matchId}`, {
      headers: { "User-Agent": COMM_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function processMatch(admin: Admin, matchId: number, rows: ReminderRow[], now: number) {
  const snapshot = buildSnapshot(await fetchComm(matchId));
  if (!snapshot) return { checked: rows.length, sent: 0 };
  let sent = 0;
  for (const row of rows) {
    const { messages, progress } = evaluateReminder({
      snapshot,
      progress: row.progress ?? {},
      categories: sanitizeCategories(row.categories),
      label: row.match_label,
      matchId,
      now,
    });
    const subscription = Array.isArray(row.push_subscriptions) ? row.push_subscriptions[0] : row.push_subscriptions;
    let expired = false;
    if (subscription) {
      for (const message of messages) {
        try {
          await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            JSON.stringify({ title: message.title, body: message.body, tag: message.tag, url: `/match/${matchId}` }),
            { TTL: 600, urgency: "high" },
          );
          sent++;
        } catch (pushError) {
          const statusCode = (pushError as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            expired = true;
            break;
          }
        }
      }
    }
    if (expired) {
      await admin.from("push_subscriptions").delete().eq("id", row.subscription_id);
    } else if (progress.done) {
      await admin.from("match_reminders").delete().eq("id", row.id);
      await pruneSubscription(admin, row.subscription_id);
    } else {
      await admin
        .from("match_reminders")
        .update({ progress, ...(messages.length ? { last_notified_at: new Date(now).toISOString() } : {}) })
        .eq("id", row.id);
    }
  }
  return { checked: rows.length, sent };
}

export async function dispatchReminders() {
  configurePush();
  const admin = getAdmin();
  const { data, error } = await admin
    .from("match_reminders")
    .select("id, match_id, match_label, categories, progress, subscription_id, push_subscriptions(endpoint,p256dh,auth)");
  if (error) throw error;
  const byMatch = new Map<number, ReminderRow[]>();
  for (const row of (data ?? []) as ReminderRow[]) {
    byMatch.set(row.match_id, [...(byMatch.get(row.match_id) ?? []), row]);
  }
  const now = Date.now();
  const results = await Promise.all(
    [...byMatch.entries()].map(([matchId, rows]) => processMatch(admin, matchId, rows, now)),
  );
  return {
    checked: results.reduce((total, result) => total + result.checked, 0),
    sent: results.reduce((total, result) => total + result.sent, 0),
  };
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as never;
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }
}

export async function handlePushRequest(request: Request, pathname: string) {
  try {
    if (request.method === "GET" && pathname === "/api/push/public-key") {
      return Response.json({ publicKey: getPublicKey() });
    }
    if (request.method === "POST" && pathname === "/api/push/reminders") {
      const categories = await registerReminder(await readJson(request));
      return Response.json({ ok: true, categories });
    }
    if (request.method === "POST" && pathname === "/api/push/reminders/lookup") {
      return Response.json({ categories: await lookupReminder(await readJson(request)) });
    }
    if (request.method === "DELETE" && pathname === "/api/push/reminders") {
      await removeReminder(await readJson(request));
      return Response.json({ ok: true });
    }
    if ((request.method === "POST" || request.method === "GET") && pathname === "/api/push/dispatch") {
      const authorization = request.headers.get("authorization");
      if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      return Response.json(await dispatchReminders());
    }
    return null;
  } catch (error) {
    if (error instanceof BadRequestError) return Response.json({ error: error.message }, { status: 400 });
    console.error("[push]", error);
    return Response.json({ error: "Push service error" }, { status: 500 });
  }
}

export function pushServiceWorker() {
  return `self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Cricket Live", body: "Match update" };
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    tag: data.tag,
    icon: "/favicon.ico",
    data: { url: data.url || "/" },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    for (const client of windows) {
      if (client.url.endsWith(url) && "focus" in client) return client.focus();
    }
    return self.clients.openWindow(url);
  }));
});
`;
}

export function pushConfigIsReady() {
  return Boolean(supabaseUrl && serviceRoleKey && vapidPublicKey && vapidPrivateKey && vapidSubject);
}

export { vapidPublicKey };
