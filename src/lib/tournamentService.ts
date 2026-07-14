import { registerDefaults } from "@/core/services/registerDefaults";
import { resolveService } from "@/core/services/di";
import type { IGamingService } from "@/domains/gaming/interfaces/IGamingService";

// Re-export types from domain DTO (Phase 9: consolidation)
// DEPRECATED: import directly from @/domains/gaming/dtos/tournament.dto instead
export type {
  TournamentStatus,
  TournamentType,
  MatchStatus,
  TournamentRecord,
  TournamentTeamRecord,
  TournamentMatchRecord,
  TournamentMapRecord,
  MatchCentreData,
} from "@/domains/gaming/dtos/tournament.dto";

const svc = () => resolveService<IGamingService>("GamingService");

export const isGamingEvent = (event: any) => svc().isGamingEvent(event);
export const getTournamentByEventId = (eventId: string) =>
  svc().getTournamentByEventId(eventId);
export const ensureTournamentForEvent = (
  eventId: string,
  payload?: Partial<TournamentRecord>,
) => svc().ensureTournamentForEvent(eventId, payload);
export const listTournamentTeams = (tournamentId: string) =>
  svc().listTournamentTeams(tournamentId);
export const listTournamentMatches = (tournamentId: string) =>
  svc().listTournamentMatches(tournamentId);
export const createTournamentTeam = (payload: any) =>
  svc().createTournamentTeam(payload);
export const updateTournamentTeam = (teamId: string, updates: any) =>
  svc().updateTournamentTeam(teamId, updates);
export const deleteTournamentTeam = (teamId: string) =>
  svc().deleteTournamentTeam(teamId);
export const updateTournamentStatus = (
  tournamentId: string,
  status: TournamentStatus,
) => svc().updateTournamentStatus(tournamentId, status);
export const generateTournamentBracket = (tournamentId: string) =>
  svc().generateTournamentBracket(tournamentId);
export const updateTournamentMatch = (matchId: string, updates: any) =>
  svc().updateTournamentMatch(matchId, updates);
export const updateMatchMap = (mapId: string, updates: any) =>
  svc().updateMatchMap(mapId, updates);
export const upsertPlayerMatchStats = (payload: any) =>
  svc().upsertPlayerMatchStats(payload);
export const getMatchCentreData = (matchId: string) =>
  svc().getMatchCentreData(matchId);
export const submitMatchResult = (
  matchId: string,
  payload: { teamAScore: number; teamBScore: number },
) => svc().submitMatchResult(matchId, payload);
export const findNextMatchForTournament = (
  tournamentId: string,
  roundNumber: number,
  matchNumber: number,
) => svc().findNextMatchForTournament(tournamentId, roundNumber, matchNumber);
export const getLiveMatchOverlayData = (tournamentId: string) =>
  svc().getLiveMatchOverlayData(tournamentId);
export const subscribeToTournamentUpdates = (
  tournamentId: string,
  callback: () => void,
) => svc().subscribeToTournamentUpdates(tournamentId, callback);
