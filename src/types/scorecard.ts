export interface BatterRow {
  id: number;
  name: string;
  dismissal: string;
  isOut: boolean;
  isBatting: boolean;
  isCaptain: boolean;
  isKeeper: boolean;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
}

export interface BowlerRow {
  id: number;
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  batterName: string;
  runs: number;
  over: number;
  ball: number;
}

export interface InningsScorecard {
  inningsId: number;
  battingTeamId: number;
  battingTeam: string;
  battingTeamShort: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  runRate: number;
  extras: {
    total: number;
    byes: number;
    legByes: number;
    wides: number;
    noBalls: number;
    penalty: number;
  };
  powerplay?: { toOver: number; runs: number };
  batters: BatterRow[];
  yetToBat: string[];
  bowlers: BowlerRow[];
  fallOfWickets: FallOfWicket[];
}

export interface WinProbability {
  team1: number;
  team2: number;
  estimated?: boolean;
}

export interface LiveSituation {
  inningsId: number;
  currentRunRate: number | null;
  requiredRunRate: number | null;
  target: number | null;
  runsToWin: number | null;
  winProbability: WinProbability | null;
}

export interface MatchCenter {
  matchId: number;
  format: string;
  status: string;
  state: string;
  team1Id: number;
  team2Id: number;
  innings: InningsScorecard[];
  live: LiveSituation | null;
  error: string | null;
}
