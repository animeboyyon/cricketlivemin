import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { BatterRow, BowlerRow, InningsScorecard } from "@/types/scorecard";
import { FallOfWickets } from "./FallOfWickets";

type View = "batting" | "bowling";

const th =
  "px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";
const td = "px-2 py-2.5 text-right font-mono tabular-nums";

function inningsLabel(inn: InningsScorecard, all: InningsScorecard[]) {
  const sameTeam = all.filter((i) => i.battingTeamId === inn.battingTeamId);
  if (sameTeam.length < 2) return inn.battingTeamShort;
  return `${inn.battingTeamShort} ${sameTeam.indexOf(inn) + 1}`;
}

export function Scorecard({
  innings,
  team1Id,
  liveInningsId,
}: {
  innings: InningsScorecard[];
  team1Id: number;
  liveInningsId?: number;
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList className="h-auto rounded-xl bg-background/50 p-1">
          {innings.map((inn) => {
            const isTeam1 = inn.battingTeamId === team1Id;
            return (
              <TabsTrigger
                key={inn.inningsId}
                value={String(inn.inningsId)}
                className={cn(
                  "gap-2 rounded-lg px-3 py-1.5 data-[state=active]:bg-card",
                  isTeam1
                    ? "data-[state=active]:text-primary data-[state=active]:shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_35%,transparent)]"
                    : "data-[state=active]:text-accent data-[state=active]:shadow-[0_0_0_1px_color-mix(in_oklch,var(--accent)_35%,transparent)]",
                )}
              >
                <span className="font-semibold">{inningsLabel(inn, innings)}</span>
                <span className="font-mono text-xs tabular-nums opacity-80">
                  {inn.runs}/{inn.wickets}
                </span>
                {inn.inningsId === liveInningsId && (
                  <span
                    className="live-dot h-1.5 w-1.5 rounded-full bg-primary"
                    aria-label="Live"
                  />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div
          role="radiogroup"
          aria-label="Scorecard view"
          className="inline-flex rounded-xl bg-background/50 p-1 text-xs"
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
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{inn.battingTeam}</span>
              {view === "bowling" && <> · {inn.bowlingTeam} bowling</>}
            </p>
            <p className="font-mono text-sm tabular-nums text-muted-foreground">
              <span className="text-lg font-bold text-foreground">
                {inn.runs}/{inn.wickets}
              </span>{" "}
              ({inn.overs} ov · RR {inn.runRate.toFixed(2)})
            </p>
          </div>

          <div className="-mx-2 overflow-x-auto">
            {view === "batting" ? (
              <BattingTable inn={inn} />
            ) : (
              <BowlingTable bowlers={inn.bowlers} />
            )}
          </div>

          <FallOfWickets wickets={inn.fallOfWickets} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function BattingTable({ inn }: { inn: InningsScorecard }) {
  const { extras } = inn;
  return (
    <table className="w-full min-w-[34rem] border-collapse text-sm">
      <caption className="sr-only">Batting scorecard for {inn.battingTeam}</caption>
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className={cn(th, "text-left")}>
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
          <th scope="col" className={th}>
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
          <th scope="row" className="px-2 py-2.5 text-left text-xs font-medium">
            Extras{" "}
            <span className="font-mono font-normal tabular-nums">
              (b {extras.byes}, lb {extras.legByes}, w {extras.wides}, nb {extras.noBalls}
              {extras.penalty ? `, p ${extras.penalty}` : ""})
            </span>
          </th>
          <td className={cn(td, "font-semibold text-foreground")}>{extras.total}</td>
          <td colSpan={4} />
        </tr>
        {inn.yetToBat.length > 0 && (
          <tr>
            <td colSpan={6} className="px-2 pt-1 pb-2 text-xs">
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
      <th scope="row" className="max-w-0 px-2 py-2.5 text-left font-normal sm:max-w-none">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate font-semibold",
              b.isBatting ? "text-primary" : "text-foreground",
            )}
          >
            {b.name}
          </span>
          {b.isCaptain && <span className="text-[10px] text-muted-foreground">(c)</span>}
          {b.isKeeper && <span className="text-[10px] text-muted-foreground">(wk)</span>}
          {b.isBatting && (
            <span className="text-primary" aria-label="Batting">
              *
            </span>
          )}
        </div>
        <p
          className={cn("truncate text-xs", b.isOut ? "text-muted-foreground" : "text-primary/80")}
        >
          {b.dismissal}
        </p>
      </th>
      <td className={cn(td, "font-bold text-foreground")}>{b.runs}</td>
      <td className={cn(td, "text-muted-foreground")}>{b.balls}</td>
      <td className={cn(td, "text-muted-foreground")}>{b.fours}</td>
      <td className={cn(td, "text-muted-foreground")}>{b.sixes}</td>
      <td className={cn(td, "text-foreground")}>{b.strikeRate.toFixed(2)}</td>
    </tr>
  );
}

function BowlingTable({ bowlers }: { bowlers: BowlerRow[] }) {
  return (
    <table className="w-full min-w-[30rem] border-collapse text-sm">
      <caption className="sr-only">Bowling figures</caption>
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className={cn(th, "text-left")}>
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
          <th scope="col" className={th}>
            Econ
          </th>
        </tr>
      </thead>
      <tbody>
        {bowlers.map((b) => (
          <tr key={b.id} className="border-b border-border/60 last:border-0">
            <th scope="row" className="px-2 py-2.5 text-left font-semibold text-foreground">
              {b.name}
            </th>
            <td className={cn(td, "text-foreground")}>{b.overs}</td>
            <td className={cn(td, "text-muted-foreground")}>{b.maidens}</td>
            <td className={cn(td, "text-muted-foreground")}>{b.runs}</td>
            <td className={cn(td, "font-bold", b.wickets > 0 ? "text-accent" : "text-foreground")}>
              {b.wickets}
            </td>
            <td className={cn(td, "text-foreground")}>{b.economy.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
