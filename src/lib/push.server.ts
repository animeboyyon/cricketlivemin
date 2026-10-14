import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

function getAdmin() {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase server credentials are not configured");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

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

export async function registerReminder(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  matchId: number;
  matchLabel: string;
}) {
  if (!input.endpoint || !input.keys?.p256dh || !input.keys?.auth || !Number.isInteger(input.matchId)) {
    throw new Error("Invalid reminder payload");
  }
  const admin = getAdmin();
  const { data: subscription, error: subscriptionError } = await admin
    .from("push_subscriptions")
    .upsert({ endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, updated_at: new Date().toISOString() }, { onConflict: "endpoint" })
    .select("id")
    .single();
  if (subscriptionError) throw subscriptionError;

  const { error } = await admin.from("match_reminders").upsert({
    match_id: input.matchId,
    match_label: input.matchLabel.slice(0, 180),
    subscription_id: subscription.id,
  }, { onConflict: "match_id,subscription_id" });
  if (error) throw error;
}

export async function removeReminder(input: { endpoint: string; matchId: number }) {
  const admin = getAdmin();
  const { data: subscription } = await admin.from("push_subscriptions").select("id").eq("endpoint", input.endpoint).maybeSingle();
  if (!subscription) return;
  await admin.from("match_reminders").delete().eq("match_id", input.matchId).eq("subscription_id", subscription.id);
  await admin.from("push_subscriptions").delete().eq("id", subscription.id).not("id", "in", `(select subscription_id from match_reminders)`);
}

export async function dispatchReminders() {
  configurePush();
  const admin = getAdmin();
  const { data: reminders, error } = await admin.from("match_reminders").select("id, match_id, match_label, last_state, last_wickets, subscription_id, push_subscriptions(endpoint,p256dh,auth)");
  if (error) throw error;
  let sent = 0;
  for (const reminder of reminders ?? []) {
    const scoreResponse = await fetch(`https://www.cricbuzz.com/api/mcenter/scorecard/${reminder.match_id}`, { headers: { "user-agent": "CricketLiveScoreboard/1.0" } });
    if (!scoreResponse.ok) continue;
    const score = await scoreResponse.json() as { matchHeader?: { state?: string; status?: string }; scoreCard?: { scoreDetails?: { wickets?: number } }[] };
    const state = score.matchHeader?.state ?? "";
    const wickets = (score.scoreCard ?? []).reduce((total, innings) => total + Number(innings.scoreDetails?.wickets ?? 0), 0);
    const stateChanged = reminder.last_state !== null && reminder.last_state !== state;
    const wicketChanged = wickets > reminder.last_wickets;
    if (stateChanged || wicketChanged) {
      const subscription = Array.isArray(reminder.push_subscriptions) ? reminder.push_subscriptions[0] : reminder.push_subscriptions;
      if (subscription) {
        try {
          await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: stateChanged && state === "Complete" ? `Result · ${reminder.match_label}` : `Match update · ${reminder.match_label}`, body: score.matchHeader?.status ?? state, tag: `match-${reminder.match_id}-${state}-${wickets}` }));
          sent++;
        } catch (pushError) {
          if ((pushError as { statusCode?: number }).statusCode === 404 || (pushError as { statusCode?: number }).statusCode === 410) await admin.from("push_subscriptions").delete().eq("id", reminder.subscription_id);
        }
      }
    }
    await admin.from("match_reminders").update({ last_state: state, last_wickets: wickets, last_notified_at: stateChanged || wicketChanged ? new Date().toISOString() : undefined }).eq("id", reminder.id);
  }
  return { checked: reminders?.length ?? 0, sent };
}

export async function handlePushRequest(request: Request, pathname: string) {
  if (request.method === "GET" && pathname === "/api/push/public-key") {
    return Response.json({ publicKey: getPublicKey() });
  }
  if (request.method === "POST" && pathname === "/api/push/reminders") {
    const body = await request.json();
    await registerReminder(body);
    return Response.json({ ok: true });
  }
  if (request.method === "DELETE" && pathname === "/api/push/reminders") {
    const body = await request.json();
    await removeReminder(body);
    return Response.json({ ok: true });
  }
  if (request.method === "POST" && pathname === "/api/push/dispatch") {
    const authorization = request.headers.get("authorization");
    if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
    return Response.json(await dispatchReminders());
  }
  return null;
}

export function pushServiceWorker() {
  return `self.addEventListener("push", event => {\n  const data = event.data?.json?.() ?? { title: "Cricket Live", body: "Match update" };\n  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, tag: data.tag, icon: "/favicon.ico" }));\n});\nself.addEventListener("notificationclick", event => { event.notification.close(); event.waitUntil(clients.openWindow("/")); });\n`;
}

export function pushConfigIsReady() {
  return Boolean(supabaseUrl && serviceRoleKey && vapidPublicKey && vapidPrivateKey && vapidSubject);
}

export { vapidPublicKey };
        
