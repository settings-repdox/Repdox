// Gaming/Tournament DTOs (Phase 9: centralized)

export type TournamentStatus =
  | "registration_open"
  | "registration_closed"
  | "bracket_generated"
  | "live"
  | "completed";

export type TournamentType =
  | "Single Elimination"
  | "Double Elimination"
  | "Round Robin";

export type MatchStatus = "upcoming" | "live" | "completed" | "disputed";

export interface TournamentRecord {
  id: string;
  event_id: string;
  game_name?: string;
  current_teams?: number;
  status?: TournamentStatus;
  tournament_type?: TournamentType;
  created_at?: string;
  updated_at?: string;
  bracket_url?: string | null;
  bracket_link?: string | null;
  [key: string]: unknown;
}

export interface TournamentTeamRecord {
  id: string;
  tournament_id: string;
  team_name: string;
  captain_id?: string | null;
  team_logo?: string | null;
  player_1?: string | null;
  player_2?: string | null;
  player_3?: string | null;
  player_4?: string | null;
  player_5?: string | null;
  substitute_players?: string | null;
  riot_ids?: string | null;
  checked_in?: boolean;
  team_seed?: number;
  created_at?: string;
  [key: string]: unknown;
}

export interface TournamentMatchRecord {
  id: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  team_a_id?: string | null;
  team_b_id?: string | null;
  team_a_score?: number | null;
  team_b_score?: number | null;
  winner_id?: string | null;
  match_status?: MatchStatus;
  scheduled_time?: string | null;
  streamed_match?: boolean;
  vod_link?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface TournamentMapRecord {
  id: string;
  match_id: string;
  map_name?: string;
  map_order?: number;
  [key: string]: unknown;
}

export interface MatchCentreData {
  match: TournamentMatchRecord | null;
  tournament: TournamentRecord | null;
  teamA: TournamentTeamRecord | null;
  teamB: TournamentTeamRecord | null;
  maps: TournamentMapRecord[];
  playersA: any[];
  playersB: any[];
  stats: any[];
}
