import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: string;
  hint?: string;
  tone?: "primary" | "accent" | "warning" | "danger" | "violet" | "default";
}

export function StatsBar({ items }: { items: StatItem[] }) {
  return (
    <dl className="grid grid-cols-2 divide-border overflow-hidden rounded-xl border border-border bg-background/40 sm:grid-cols-4 sm:divide-x">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "min-w-0 px-2.5 py-1.5 sm:px-3 sm:py-2",
            i % 2 === 1 && "border-l border-border sm:border-l-0",
            i >= 2 && "border-t border-border sm:border-t-0",
          )}
        >
          <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {item.label}
          </dt>
          <dd
            className={cn(
              "font-mono text-base font-bold tabular-nums sm:text-lg",
              item.tone === "primary" && "text-primary",
              item.tone === "accent" && "text-accent",
              item.tone === "warning" && "text-chart-3",
              item.tone === "danger" && "text-chart-4",
              item.tone === "violet" && "text-chart-5",
              (!item.tone || item.tone === "default") && "text-foreground",
            )}
          >
            {item.value}
          </dd>
          {item.hint && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.hint}</p>
          )}
        </div>
      ))}
    </dl>
  );
}
