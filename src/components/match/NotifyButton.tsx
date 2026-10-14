import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { ALERT_CATEGORIES, DEFAULT_CATEGORIES, type AlertCategory } from "@/lib/push-categories";

interface NotifyButtonProps {
  matchId: number;
  matchLabel: string;
  state: string;
  status: string;
}

const isSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function getRegistration() {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

function decodeKey(base64Url: string) {
  const padded = base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4);
  return Uint8Array.from(atob(padded.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
}

async function request(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error("Request failed");
  return response;
}

const inCategoryOrder = (keys: Set<AlertCategory>) =>
  ALERT_CATEGORIES.filter((category) => keys.has(category.key)).map((category) => category.key);

export function NotifyButton({ matchId, matchLabel }: NotifyButtonProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [saved, setSaved] = useState<AlertCategory[] | null>(null);
  const [draft, setDraft] = useState<AlertCategory[]>(DEFAULT_CATEGORIES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupported()) return;
    setSupported(true);
    setPermission(Notification.permission);
    let cancelled = false;
    (async () => {
      const registration = await getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;
      const response = await request("/api/push/reminders/lookup", "POST", { endpoint: subscription.endpoint, matchId });
      const { categories } = (await response.json()) as { categories: AlertCategory[] | null };
      if (!cancelled && categories?.length) {
        setSaved(categories);
        setDraft(categories);
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (!supported) return null;
  const blocked = permission === "denied";
  const active = saved !== null;

  async function subscribe() {
    const registration = await getRegistration();
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;
    const keyResponse = await fetch("/api/push/public-key");
    if (!keyResponse.ok) throw new Error("Alerts are not configured");
    const { publicKey } = (await keyResponse.json()) as { publicKey: string };
    return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey) });
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function save(categories: AlertCategory[]) {
    if (Notification.permission === "default") setPermission(await Notification.requestPermission());
    else setPermission(Notification.permission);
    if (Notification.permission !== "granted") return;
    const subscription = await subscribe();
    await request("/api/push/reminders", "POST", {
      endpoint: subscription.endpoint,
      keys: subscription.toJSON().keys,
      matchId,
      matchLabel,
      categories,
    });
    setSaved(categories);
    setDraft(categories);
  }

  async function turnOff() {
    const registration = await getRegistration();
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await request("/api/push/reminders", "DELETE", { endpoint: subscription.endpoint, matchId });
    setSaved(null);
    setDraft(DEFAULT_CATEGORIES);
  }

  function toggle(key: AlertCategory, on: boolean) {
    const next = new Set(draft);
    if (on) next.add(key);
    else next.delete(key);
    const ordered = inCategoryOrder(next);
    if (!active) {
      setDraft(ordered);
      return;
    }
    setDraft(ordered);
    void run(() => (ordered.length === 0 ? turnOff() : save(ordered)));
  }

  const label = blocked
    ? "Match alerts are blocked in your browser settings"
    : active
      ? `Match alerts on, ${saved.length} types`
      : "Set up match alerts";
  const Icon = blocked ? BellOff : active ? BellRing : Bell;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={`relative inline-flex size-8 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            active
              ? "border-primary/60 bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          }`}
        >
          <Icon className="size-4" />
          {active ? (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {saved.length}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))] p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Match alerts</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {active ? "Pick what you want to hear about for this match." : "Choose what to get notified about, even when this tab is closed."}
          </p>
        </div>
        <ul className="max-h-[50vh] divide-y divide-border overflow-y-auto">
          {ALERT_CATEGORIES.map((category) => {
            const id = `alert-${category.key}`;
            return (
              <li key={category.key}>
                <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{category.label}</span>
                    <span className="block text-xs text-muted-foreground">{category.description}</span>
                  </span>
                  <Switch
                    id={id}
                    checked={draft.includes(category.key)}
                    disabled={busy || blocked}
                    onCheckedChange={(on) => toggle(category.key, on)}
                  />
                </label>
              </li>
            );
          })}
        </ul>
        <div className="space-y-2 border-t border-border px-4 py-3">
          {blocked ? (
            <p className="text-xs text-muted-foreground">
              Notifications are blocked for this site. Allow them in your browser settings to use match alerts.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          {active ? (
            <Button type="button" variant="outline" size="sm" className="w-full" disabled={busy} onClick={() => void run(turnOff)}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Turn off all alerts
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="w-full"
              disabled={busy || blocked || draft.length === 0}
              onClick={() => void run(() => save(draft))}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Turn on alerts
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
