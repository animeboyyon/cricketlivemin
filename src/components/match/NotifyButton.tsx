import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import type { MatchCenter } from "@/types/scorecard";

const LIVE_STATES = ["In Progress", "Live"];
const BREAK_STATES = ["Innings Break", "Tea", "Lunch", "Stumps"];

interface NotifyButtonProps {
  matchLabel: string;
  state: string;
  status: string;
  center?: MatchCenter;
}

interface Snapshot {
  state: string;
  wickets: Record<number, number>;
}

function notify(title: string, body: string, tag: string) {
  try {
    new Notification(title, { body, tag });
  } catch {
    // Some mobile browsers only allow notifications through a service worker.
  }
}

function isSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function NotifyButton({ matchLabel, state, status, center }: NotifyButtonProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const previous = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (!isSupported()) return;
    setSupported(true);
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!enabled) {
      previous.current = null;
      return;
    }

    const wickets: Record<number, number> = {};
    for (const inn of center?.innings ?? []) wickets[inn.inningsId] = inn.wickets;
    const current: Snapshot = { state, wickets };
    const before = previous.current;
    previous.current = current;
    if (!before) return;

    for (const inn of center?.innings ?? []) {
      const prevWickets = before.wickets[inn.inningsId];
      if (prevWickets !== undefined && inn.wickets > prevWickets) {
        const fall = inn.fallOfWickets[inn.fallOfWickets.length - 1];
        const who = fall ? `${fall.batterName} out` : "Wicket";
        notify(
          `Wicket · ${matchLabel}`,
          `${who}. ${inn.battingTeamShort} ${inn.runs}/${inn.wickets} (${inn.overs} ov)`,
          `wicket-${inn.inningsId}-${inn.wickets}`,
        );
      }
    }

    if (before.state !== state) {
      if (state === "Complete") {
        notify(`Result · ${matchLabel}`, status, "result");
      } else if (LIVE_STATES.includes(state) && !LIVE_STATES.includes(before.state)) {
        notify(`Play started · ${matchLabel}`, status, `state-${state}`);
      } else if (BREAK_STATES.includes(state)) {
        notify(`${state} · ${matchLabel}`, status, `state-${state}`);
      }
    }
  }, [enabled, state, status, center, matchLabel]);

  if (!supported || state === "Complete") return null;

  const blocked = permission === "denied";

  async function toggle() {
    if (enabled) {
      setEnabled(false);
      return;
    }
    const result =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    setPermission(result);
    if (result === "granted") {
      setEnabled(true);
      notify("Alerts on", `${matchLabel}: wickets, breaks and the result.`, "enabled");
    }
  }

  const label = blocked
    ? "Notifications are blocked in your browser settings"
    : enabled
      ? "Turn off match alerts"
      : "Get alerts for wickets, breaks and the result while this page is open";
  const Icon = blocked ? BellOff : enabled ? BellRing : Bell;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={blocked}
      aria-pressed={enabled}
      aria-label={label}
      title={label}
      className={`inline-flex size-8 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        enabled
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
      }`}
    >
      <Icon className="size-4" />
    </button>
  );
}
