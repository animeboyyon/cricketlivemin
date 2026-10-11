import { CartesianGrid, Line, LineChart, XAxis, YAxis, type DotProps } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import type { WormRow } from "@/lib/worm";

interface WormChartProps {
  data: WormRow[];
  team1Label: string;
  team2Label: string;
  maxOvers: number | null;
}

type WicketDotProps = DotProps & { payload?: WormRow; dataKey?: string };

function makeWicketDot(key: "team1" | "team2", color: string) {
  return function WicketDot(props: WicketDotProps) {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || !payload?.[`${key}Wicket`]) return <g key={`${key}-${cx}`} />;
    return (
      <g key={`${key}-${cx}-${cy}`}>
        <circle cx={cx} cy={cy} r={7} fill={color} opacity={0.18} />
        <circle cx={cx} cy={cy} r={3.5} fill="var(--background)" stroke={color} strokeWidth={2} />
      </g>
    );
  };
}

const Team1Dot = makeWicketDot("team1", "var(--color-team1)");
const Team2Dot = makeWicketDot("team2", "var(--color-team2)");

export function WormChart({ data, team1Label, team2Label, maxOvers }: WormChartProps) {
  const config = {
    team1: { label: team1Label, color: "var(--primary)" },
    team2: { label: team2Label, color: "var(--accent)" },
  } satisfies ChartConfig;

  const lastOver = data[data.length - 1]?.over ?? 0;
  const domainMax = maxOvers ?? Math.max(1, Math.ceil(lastOver));
  const tickStep = domainMax > 60 ? 20 : domainMax > 30 ? 10 : 5;
  const ticks = Array.from(
    { length: Math.floor(domainMax / tickStep) + 1 },
    (_, i) => i * tickStep,
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-2 text-foreground">
          <span className="h-0.5 w-4 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
          {team1Label}
        </span>
        <span className="inline-flex items-center gap-2 text-foreground">
          <span className="h-0.5 w-4 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
          {team2Label}
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full border-2 border-muted-foreground"
            aria-hidden="true"
          />
          Wicket
        </span>
      </div>
      <ChartContainer config={config} className="aspect-auto h-64 w-full sm:h-72">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <filter id="worm-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="var(--border)" />
          <XAxis
            dataKey="over"
            type="number"
            domain={[0, domainMax]}
            ticks={ticks}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="font-mono"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickMargin={4}
            className="font-mono"
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
            content={<WormTooltip team1Label={team1Label} team2Label={team2Label} />}
          />
          <Line
            dataKey="team1"
            type="monotone"
            stroke="var(--color-team1)"
            strokeWidth={2.25}
            filter="url(#worm-glow)"
            connectNulls
            isAnimationActive={false}
            dot={Team1Dot}
            activeDot={{
              r: 4,
              fill: "var(--color-team1)",
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
          />
          <Line
            dataKey="team2"
            type="monotone"
            stroke="var(--color-team2)"
            strokeWidth={2.25}
            filter="url(#worm-glow)"
            connectNulls
            isAnimationActive={false}
            dot={Team2Dot}
            activeDot={{
              r: 4,
              fill: "var(--color-team2)",
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function WormTooltip({
  active,
  payload,
  team1Label,
  team2Label,
}: {
  active?: boolean;
  payload?: Array<{ payload: WormRow }>;
  team1Label: string;
  team2Label: string;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const overLabel = Number.isInteger(row.over) ? `Over ${row.over}` : `${row.over.toFixed(1)} ov`;
  const lines = [
    { label: team1Label, value: row.team1, wicket: row.team1Wicket, color: "bg-primary" },
    { label: team2Label, value: row.team2, wicket: row.team2Wicket, color: "bg-accent" },
  ].filter((l) => l.value != null);

  return (
    <div className="min-w-40 rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1.5 font-mono text-muted-foreground">{overLabel}</p>
      <ul className="space-y-1">
        {lines.map((l) => (
          <li key={l.label}>
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 text-foreground">
                <span className={`h-2 w-2 rounded-full ${l.color}`} />
                {l.label}
              </span>
              <span className="font-mono font-semibold tabular-nums text-foreground">
                {l.value}
              </span>
            </div>
            {l.wicket && <p className="pl-4 text-destructive">W · {l.wicket}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
