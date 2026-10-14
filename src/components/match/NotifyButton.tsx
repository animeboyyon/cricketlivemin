import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

interface NotifyButtonProps {
  matchId: number;
  matchLabel: string;
  state: string;
  status: string;
}

const isSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function getSubscription() {
  const registration = await navigator.serviceWorker.register("/sw.js");
  return registration.pushManager.getSubscription();
}

export function NotifyButton({ matchId, matchLabel }: NotifyButtonProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!isSupported()) return;
    setSupported(true);
    setPermission(Notification.permission);
    getSubscription().then((subscription) => setEnabled(Boolean(subscription))).catch(() => undefined);
  }, []);

  if (!supported) return null;
  const blocked = permission === "denied";

  async function toggle() {
    if (blocked) return;
    if (enabled) {
      const subscription = await getSubscription();
      if (subscription) {
        await fetch("/api/push/reminders", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint, matchId }) });
      }
      setEnabled(false);
      return;
    }
    const nextPermission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    setPermission(nextPermission);
    if (nextPermission !== "granted") return;
    const registration = await navigator.serviceWorker.register("/sw.js");
    const keyResponse = await fetch("/api/push/public-key");
    if (!keyResponse.ok) throw new Error("Push notifications are not configured");
    const { publicKey } = await keyResponse.json() as { publicKey: string };
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0)) });
    const response = await fetch("/api/push/reminders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint, keys: subscription.toJSON().keys, matchId, matchLabel }) });
    if (!response.ok) throw new Error("Could not enable reminder");
    setEnabled(true);
  }

  const label = blocked ? "Notifications are blocked in your browser settings" : enabled ? "Turn off background match reminders" : "Get background reminders for this match";
  const Icon = blocked ? BellOff : enabled ? BellRing : Bell;
  return <button type="button" onClick={() => void toggle()} disabled={blocked} aria-pressed={enabled} aria-label={label} title={label} className={`inline-flex size-8 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? "border-primary/60 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}><Icon className="size-4" /></button>;
}
