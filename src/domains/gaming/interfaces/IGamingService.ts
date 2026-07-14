import type {
  TournamentRecord,
  TournamentTeamRecord,
  TournamentMatchRecord,
  TournamentMapRecord,
  MatchCentreData,
  TournamentStatus,
  TournamentType,
  MatchStatus,
} from "../dtos/tournament.dto";

export interface IGamingService {
  isGamingEvent(event: any): boolean;
  getTournamentByEventId(eventId: string): Promise<TournamentRecord | null>;
  ensureTournamentForEvent(
    eventId: string,
    payload?: Partial<TournamentRecord>,
  ): Promise<TournamentRecord>;
  listTournamentTeams(tournamentId: string): Promise<TournamentTeamRecord[]>;
  listTournamentMatches(tournamentId: string): Promise<TournamentMatchRecord[]>;
  createTournamentTeam(payload: {
    tournamentId: string;
    teamName: string;
    captainId?: string | null;
    teamLogo?: string | null;
    player1?: string | null;
    player2?: string | null;
    player3?: string | null;
    player4?: string | null;
    player5?: string | null;
    substitutePlayers?: string | null;
    riotIds?: string | null;
    checkedIn?: boolean;
  }): Promise<TournamentTeamRecord>;
  updateTournamentTeam(
    teamId: string,
    updates: Partial<TournamentTeamRecord>,
  ): Promise<TournamentTeamRecord>;
  deleteTournamentTeam(teamId: string): Promise<void>;
  updateTournamentStatus(
    tournamentId: string,
    status: TournamentStatus,
  ): Promise<TournamentRecord>;
  generateTournamentBracket(tournamentId: string): Promise<any>;
  updateTournamentMatch(
    matchId: string,
    updates: Partial<TournamentMatchRecord>,
  ): Promise<TournamentMatchRecord>;
  updateMatchMap(
    mapId: string,
    updates: Partial<TournamentMapRecord>,
  ): Promise<TournamentMapRecord>;
  upsertPlayerMatchStats(payload: any): Promise<any>;
  getMatchCentreData(matchId: string): Promise<MatchCentreData | null>;
  submitMatchResult(
    matchId: string,
    payload: { teamAScore: number; teamBScore: number },
  ): Promise<any>;
  findNextMatchForTournament(
    tournamentId: string,
    roundNumber: number,
    matchNumber: number,
  ): Promise<TournamentMatchRecord | null>;
  getLiveMatchOverlayData(
    tournamentId: string,
  ): Promise<TournamentMatchRecord | null>;
  subscribeToTournamentUpdates(
    tournamentId: string,
    callback: () => void,
  ): () => void;
}
