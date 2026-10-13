import { ImageResponse } from "@cf-wasm/og";
import { loadHome } from "@/lib/cricket.functions";
import type { Innings, TeamScore } from "@/types/cricket";

const WIDTH = 1200;
const HEIGHT = 630;

function latestInnings(score?: TeamScore): Innings | undefined {
  return score?.inngs2 ?? score?.inngs1;
}

function scoreText(inn?: Innings) {
  if (!inn) return "Yet to bat";
  const overs = inn.overs !== undefined ? ` (${inn.overs})` : "";
  return `${inn.runs}/${inn.wickets ?? 0}${overs}`;
}

interface CardProps {
  series: string;
  desc: string;
  status: string;
  live: boolean;
  teams: { name: string; score: string }[];
}

function Card({ series, desc, status, live, teams }: CardProps) {
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: "#0b1410",
        color: "#f4f7f5",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 28, color: "#7dd3a8" }}>
          {live ? (
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                background: "#ef4444",
                marginRight: 14,
              }}
            />
          ) : null}
          <span>{live ? "LIVE" : "CRICKET LIVE"}</span>
        </div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 30, color: "#9fb3a9" }}>
          {`${desc} · ${series}`.slice(0, 90)}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {teams.map((t) => (
          <div
            key={t.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: 12,
            }}
          >
            <div style={{ fontSize: 64, fontWeight: 700 }}>{t.name}</div>
            <div style={{ fontSize: 56, color: "#7dd3a8" }}>{t.score}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", fontSize: 34, color: "#d5e2db" }}>{status.slice(0, 80)}</div>
    </div>
  );
}

export async function renderMatchImage(matchIdParam: string): Promise<Response> {
  const matchId = Number(matchIdParam);
  const home = Number.isInteger(matchId) ? await loadHome().catch(() => null) : null;
  const entry = home?.matches.find((m) => m.match.matchInfo.matchId === matchId);

  let card: CardProps = {
    series: "Real-time scores",
    desc: "Cricket Live",
    status: "Live scores, scorecards and commentary",
    live: false,
    teams: [{ name: "Cricket Live", score: "" }],
  };

  if (entry) {
    const info = entry.match.matchInfo;
    const score = entry.match.matchScore;
    card = {
      series: info.seriesName,
      desc: info.matchDesc,
      status: info.status,
      live: info.state === "In Progress",
      teams: [
        { name: info.team1.teamName, score: scoreText(latestInnings(score?.team1Score)) },
        { name: info.team2.teamName, score: scoreText(latestInnings(score?.team2Score)) },
      ],
    };
  }

  return ImageResponse.async(<Card {...card} />, {
    width: WIDTH,
    height: HEIGHT,
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
