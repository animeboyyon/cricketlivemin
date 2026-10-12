import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCricketHome } from "@/lib/cricket.functions";
import { TeamLogo } from "@/components/TeamLogo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { MatchEntry, Team } from "@/types/cricket";

type Outcome = "win" | "loss" | "neutral";

function outcomeFor(team: Team, status: string): Outcome {
  const text = status.toLowerCase();
  if (!text.includes(" won")) return "neutral";
  const names = [team.teamName, team.teamSName].map((n) => n.toLowerCase());
  return names.some((n) => text.startsWith(`${n} won`) || text.includes(`${n} won`))
    ? "win"
    : "loss";
}

const OUTCOME_STYLE: Record<Outcome, { dot: string; letter: string }> = {
  win: { dot: "bg-primary text-primary-foreground", letter: "W" },
  loss: { dot: "bg-destructive/80 text-destructive-foreground", letter: "L" },
  neutral: { dot: "bg-muted text-muted-foreground", letter: "–" },
};

function recentResults(matches: MatchEntry[], team: Team, excludeMatchId?: number) {
  return matches
    .filter((m) => {
      const info = m.match.matchInfo;
      return (
        info.state === "Complete" &&
        info.matchId !== excludeMatchId &&
        (info.team1.teamId === team.teamId || info.team2.teamId === team.teamId)
      );
    })
    .sort((a, b) => b.match.matchInfo.startDate - a.match.matchInfo.startDate)
    .slice(0, 6);
}

interface TeamSheetProps {
  team: Team;
  currentMatchId?: number;
  size?: "sm" | "md";
}

export function TeamSheet({ team, currentMatchId, size = "md" }: TeamSheetProps) {
  const { data } = useQuery({
    queryKey: ["cricket-home"],
    queryFn: () => getCricketHome(),
  });

  const results = recentResults(data?.matches ?? [], team, currentMatchId);

  return (
    <Sheet>
      <SheetTrigger
        aria-label={`${team.teamName} recent results`}
        className="rounded-xl transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <TeamLogo name={team.teamName} short={team.teamSName} imageId={team.imageId} size={size} />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[80vh] max-w-xl overflow-y-auto rounded-t-2xl"
      >
        <SheetHeader className="pr-8">
          <div className="flex items-center gap-3">
            <TeamLogo
              name={team.teamName}
              short={team.teamSName}
              imageId={team.imageId}
              size="sm"
            />
            <div className="text-left">
              <SheetTitle>{team.teamName}</SheetTitle>
              <SheetDescription>Recent results in the live feed</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {results.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No other completed matches for {team.teamSName} in the feed right now.
          </p>
        ) : (
          <ul className="mt-5 space-y-2">
            {results.map((entry) => {
              const info = entry.match.matchInfo;
              const opponent = info.team1.teamId === team.teamId ? info.team2 : info.team1;
              const outcome = outcomeFor(team, info.status);
              const style = OUTCOME_STYLE[outcome];
              return (
                <li key={info.matchId}>
                  <Link
                    to="/match/$matchId"
                    params={{ matchId: String(info.matchId) }}
                    className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-3 transition hover:bg-muted/70"
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style.dot}`}
                      aria-label={outcome}
                    >
                      {style.letter}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        vs {opponent.teamName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {info.status}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {info.matchFormat}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
