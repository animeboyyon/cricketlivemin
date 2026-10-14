import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CommentaryEntry } from "@/types/scorecard";

const BADGE = {
  four: { label: "4", className: "bg-accent text-accent-foreground" },
  six: { label: "6", className: "bg-primary text-primary-foreground" },
  wicket: { label: "W", className: "bg-destructive text-destructive-foreground" },
} as const;

function Entry({ entry }: { entry: CommentaryEntry }) {
  if (entry.kind === "over") {
    return (
      <li className="rounded-lg bg-muted/50 px-3 py-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {entry.text}
          </span>
          {entry.detail && (
            <span className="text-xs tabular-nums text-muted-foreground">{entry.detail}</span>
          )}
        </div>
        {entry.balls && entry.balls.length > 0 && (
          <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
            {entry.balls.join(" ")}
          </p>
        )}
      </li>
    );
  }

  const badge = entry.highlight ? BADGE[entry.highlight] : null;
  return (
    <li className="flex gap-3 px-1">
      <div className="flex w-10 shrink-0 flex-col items-center gap-1 pt-0.5">
        {entry.over && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{entry.over}</span>
        )}
        {badge && (
          <span
            className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[11px] font-bold ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
      </div>
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">{entry.text}</p>
    </li>
  );
}

export function Commentary({ entries }: { entries: CommentaryEntry[] }) {
  return (
    <section
      aria-label="Ball-by-ball commentary"
      className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)] sm:p-4"
    >
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <Entry key={entry.id} entry={entry} />
        ))}
      </ul>
    </section>
  );
}

export function MatchTabs({
  commentary,
  children,
}: {
  commentary: CommentaryEntry[];
  children: ReactNode;
}) {
  if (commentary.length === 0) return <>{children}</>;
  return (
    <Tabs defaultValue="scorecard" className="mt-3 sm:mt-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
        <TabsTrigger value="commentary">Commentary</TabsTrigger>
      </TabsList>
      <TabsContent value="scorecard" className="mt-3 sm:mt-4">
        {children}
      </TabsContent>
      <TabsContent value="commentary" className="mt-3 sm:mt-4">
        <Commentary entries={commentary} />
      </TabsContent>
    </Tabs>
  );
}
