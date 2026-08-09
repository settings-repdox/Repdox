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
  // Unlike this file's other recently-added fields, no migration in
  // supabase/migrations/ confirms a `title` column exists on
  // esports_tournaments (only game_name is there) — this is typed
  // optional to match MatchCentre.tsx's existing `?? "Tournament"`
  // fallback, not because its existence is confirmed. If it turns out
  // not to be a real column, this field will just always be undefined
  // at runtime, same as before this fix — no behavior change either way.
  title?: string | null;
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
  // Same caveat as TournamentRecord.title above — no migration confirms
  // esports_tournament_teams has a `region` column; typed optional to
  // match MatchCentre.tsx's existing `|| "Region TBD"` fallback.
  region?: string | null;
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
  // Broadcast/match-centre metadata — added by
  // supabase/migrations/202607120002_expand_esports_match_centre_schema.sql
  // but never added here until this DTO's fields fell out of sync with the
  // real schema (see docs/architecture/PHASE11_COMPLIANCE_REPORT.md's
  // typecheck addendum).
  stream_platform?: string | null;
  stream_url?: string | null;
  embed_url?: string | null;
  creator_name?: string | null;
  creator_logo?: string | null;
  stream_link?: string | null;
  platform?: string | null;
  stage_label?: string | null;
  match_format?: string | null;
  timeline?: string | null;
  veto_details?: string | null;
  map_veto?: string | null;
  [key: string]: unknown;
}

export interface TournamentMapRecord {
  id: string;
  match_id: string;
  map_name?: string;
  map_order?: number;
  team_a_score?: number | null;
  team_b_score?: number | null;
  winner?: string | null;
  // Added by supabase/migrations/202607120002_expand_esports_match_centre_schema.sql
  map_status?: string | null;
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
