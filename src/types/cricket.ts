export interface Team {
  teamId: number;
  teamName: string;
  teamSName: string;
  imageId?: number;
}

export interface Innings {
  inningsId: number;
  runs: number;
  wickets?: number;
  overs?: number;
}

export interface TeamScore {
  inngs1?: Innings;
  inngs2?: Innings;
}

export interface MatchInfo {
  matchId: number;
  seriesId: number;
  seriesName: string;
  matchDesc: string;
  matchFormat: string;
  startDate: number;
  endDate: number;
  state: string;
  status: string;
  team1: Team;
  team2: Team;
  venueInfo?: { ground: string; city: string };
  stateTitle?: string;
  shortStatus?: string;
}

export interface MatchScore {
  team1Score?: TeamScore;
  team2Score?: TeamScore;
}

export interface MatchEntry {
  match: {
    matchInfo: MatchInfo;
    matchScore?: MatchScore;
  };
}
