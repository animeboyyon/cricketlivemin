import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { BatterRow, BowlerRow, InningsScorecard } from "@/types/scorecard";
import { FallOfWickets } from "./FallOfWickets";

type View = "batting" | "bowling";

const th =
  "px-1 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:px-2";
const td = "px-1 py-1.5 text-right font-mono text-[13px] tabular-nums sm:px-2 sm:text-sm";

function inningsLabel(inn: InningsScorecard, all: InningsScorecard[]) {
  const sameTeam = all.filter((i) => i.battingTeamId === inn.battingTeamId);
  if (sameTeam.length < 2) return inn.battingTeamShort;
  return `${inn.battingTeamShort} ${sameTeam.indexOf(inn) + 1}`;
}

export function Scorecard({
  innings,
  team1Id,
}: {
  innings: InningsScorecard[];
  team1Id: number;
}) {
  const latest = innings[innings.length - 1];
  const [view, setView] = useState<View>("batting");

  if (!latest) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Scorecard will appear once the first ball is bowled.
      </p>
    );
  }

  return (
    <Tabs defaultValue={String(latest.inningsId)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
          <TabsList className="h-auto w-max rounded-xl bg-background/50 p-1">
            {innings.map((inn) => {
              const isTeam1 = inn.battingTeamId === team1Id;
              return (
                <TabsTrigger
                  key={inn.inningsId}
                  value={String(inn.inningsId)}
                  className={cn(
                    "gap-1.5 rounded-lg px-2.5 py-1.5 data-[state=active]:bg-card sm:gap-2 sm:px-3",
                    isTeam1
                      ? "data-[state=active]:text-primary data-[state=active]:shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_35%,transparent)]"
                      : "data-[state=active]:text-accent data-[state=active]:shadow-[0_0_0_1px_color-mix(in_oklch,var(--accent)_35%,transparent)]",
                  )}
                >
                  <span className="font-semibold">{inningsLabel(inn, innings)}</span>
                  <span className="font-mono text-xs tabular-nums opacity-80">
                    {inn.runs}/{inn.wickets}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div
          role="radiogroup"
          aria-label="Scorecard view"
          className="grid grid-cols-2 rounded-xl bg-background/50 p-1 text-xs sm:inline-grid"
        >
          {(["batting", "bowling"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-semibold capitalize transition",
                view === v
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {innings.map((inn) => (
        <TabsContent key={inn.inningsId} value={String(inn.inningsId)} className="mt-4">
          <div className="mb-2 flex items-end justify-between gap-3">
            <p className="min-w-0 text-sm text-muted-foreground">
              <span className="block truncate font-semibold text-foreground">
                {inn.battingTeam}
              </span>
              {view === "bowling" && (
                <span className="block truncate text-xs">{inn.bowlingTeam} bowling</span>
              )}
            </p>
            <p className="shrink-0 text-right font-mono tabular-nums text-muted-foreground">
              <span className="text-lg font-bold text-foreground">
                {inn.runs}/{inn.wickets}
              </span>
              <span className="block text-[11px] sm:ml-1.5 sm:inline sm:text-xs">
                {inn.overs} ov · RR {inn.runRate.toFixed(2)}
              </span>
            </p>
          </div>

          {view === "batting" ? <BattingTable inn={inn} /> : <BowlingTable bowlers={inn.bowlers} />}

          <FallOfWickets wickets={inn.fallOfWickets} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function BattingTable({ inn }: { inn: InningsScorecard }) {
  const { extras } = inn;
  return (
    <table className="w-full table-fixed border-collapse text-sm">
      <caption className="sr-only">Batting scorecard for {inn.battingTeam}</caption>
      <colgroup>
        <col />
        <col className="w-9 sm:w-12" />
        <col className="w-9 sm:w-12" />
        <col className="w-7 sm:w-10" />
        <col className="w-7 sm:w-10" />
        <col className="w-[3.25rem] sm:w-16" />
      </colgroup>
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className={cn(th, "pl-0 text-left sm:pl-0")}>
            Batter
          </th>
          <th scope="col" className={th}>
            R
          </th>
          <th scope="col" className={th}>
            B
          </th>
          <th scope="col" className={th}>
            4s
          </th>
          <th scope="col" className={th}>
            6s
          </th>
          <th scope="col" className={cn(th, "pr-0 sm:pr-0")}>
            SR
          </th>
        </tr>
      </thead>
      <tbody>
        {inn.batters.map((b) => (
          <BatterTableRow key={b.id} b={b} />
        ))}
      </tbody>
      <tfoot className="text-muted-foreground">
        <tr className="border-t border-border">
          <th scope="row" className="py-1.5 pr-1 text-left text-xs font-medium">
            Extras
            <span className="block truncate font-mono text-[11px] font-normal tabular-nums">
              b {extras.byes}, lb {extras.legByes}, w {extras.wides}, nb {extras.noBalls}
              {extras.penalty ? `, p ${extras.penalty}` : ""}
            </span>
          </th>
          <td className={cn(td, "font-semibold text-foreground")}>{extras.total}</td>
          <td colSpan={4} />
        </tr>
        {inn.yetToBat.length > 0 && (
          <tr>
            <td colSpan={6} className="pt-1 pb-2 text-xs leading-relaxed">
              <span className="font-medium">Yet to bat:</span> {inn.yetToBat.join(", ")}
            </td>
          </tr>
        )}
      </tfoot>
    </table>
  );
}

function BatterTableRow({ b }: { b: BatterRow }) {
  return (
    <tr
      className={cn("border-b border-border/60 last:border-0", b.isBatting && "bg-primary/[0.04]")}
    >
      <th scope="row" className="py-1.5 pr-1 text-left font-normal">
        <div className="flex min-w-0 items-center gap-1">
          <span
            className={cn(
              "truncate font-semibold",
              b.isBatting ? "text-primary" : "text-foreground",
            )}
          >
            {b.name}
          </span>
          {b.isCaptain && <span className="shrink-0 text-[10px] text-muted-foreground">(c)</span>}
          {b.isKeeper && <span className="shrink-0 text-[10px] text-muted-foreground">(wk)</span>}
          {b.isBatting && (
            <span className="shrink-0 text-primary" aria-label="Batting">
              *
            </span>
          )}
        </div>
        <p
          className={cn(
            "truncate text-[11px] sm:text-xs",
            b.isOut ? "text-muted-foreground" : "text-primary/80",
          )}
          title={b.dismissal}
        >
          {b.dismissal}
        </p>
      </th>
      <td className={cn(td, "font-bold text-foreground")}>{b.runs}</td>
      <td className={cn(td, "text-muted-foreground")}>{b.balls}</td>
      <td className={cn(td, b.fours > 0 ? "font-semibold text-accent" : "text-muted-foreground")}>
        {b.fours}
      </td>
      <td className={cn(td, b.sixes > 0 ? "font-semibold text-primary" : "text-muted-foreground")}>
        {b.sixes}
      </td>
      <td className={cn(td, "pr-0 text-foreground sm:pr-0")}>{b.strikeRate.toFixed(1)}</td>
    </tr>
  );
}

function BowlingTable({ bowlers }: { bowlers: BowlerRow[] }) {
  return (
    <table className="w-full table-fixed border-collapse text-sm">
      <caption className="sr-only">Bowling figures</caption>
      <colgroup>
        <col />
        <col className="w-10 sm:w-12" />
        <col className="w-7 sm:w-10" />
        <col className="w-9 sm:w-12" />
        <col className="w-7 sm:w-10" />
        <col className="w-12 sm:w-16" />
      </colgroup>
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className={cn(th, "pl-0 text-left sm:pl-0")}>
            Bowler
          </th>
          <th scope="col" className={th}>
            O
          </th>
          <th scope="col" className={th}>
            M
          </th>
          <th scope="col" className={th}>
            R
          </th>
          <th scope="col" className={th}>
            W
          </th>
          <th scope="col" className={cn(th, "pr-0 sm:pr-0")}>
            Econ
          </th>
        </tr>
      </thead>
      <tbody>
        {bowlers.map((b) => (
          <tr key={b.id} className="border-b border-border/60 last:border-0">
            <th
              scope="row"
              className="truncate py-1.5 pr-1 text-left font-semibold text-foreground"
              title={b.name}
            >
              {b.name}
            </th>
            <td className={cn(td, "text-foreground")}>{b.overs}</td>
            <td className={cn(td, "text-muted-foreground")}>{b.maidens}</td>
            <td className={cn(td, "text-muted-foreground")}>{b.runs}</td>
            <td className={cn(td, "font-bold", b.wickets > 0 ? "text-accent" : "text-foreground")}>
              {b.wickets}
            </td>
            <td className={cn(td, "pr-0 text-foreground sm:pr-0")}>{b.economy.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
