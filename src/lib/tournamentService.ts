import { supabase } from "@/integrations/supabase/client";

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
  game_name: string;
  tournament_type: TournamentType;
  max_teams: number | null;
  current_teams: number | null;
  status: TournamentStatus;
  created_at?: string;
  updated_at?: string;
}

export interface TournamentTeamRecord {
  id: string;
  tournament_id: string;
  team_name: string;
  team_logo?: string | null;
  captain_id?: string | null;
  player_1?: string | null;
  player_2?: string | null;
  player_3?: string | null;
  player_4?: string | null;
  player_5?: string | null;
  substitute_players?: string | null;
  riot_ids?: string | null;
  team_seed?: number | null;
  checked_in?: boolean | null;
  created_at?: string;
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
  match_status: MatchStatus;
  scheduled_time?: string | null;
  streamed_match?: boolean | null;
  vod_link?: string | null;
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
  created_at?: string;
  updated_at?: string;
}

export interface TournamentMapRecord {
  id: string;
  match_id: string;
  map_name?: string | null;
  team_a_score?: number | null;
  team_b_score?: number | null;
  winner?: string | null;
  map_order?: number | null;
  map_status?: string | null;
}

export interface MatchCentreData {
  match: TournamentMatchRecord;
  tournament: TournamentRecord | null;
  teamA: TournamentTeamRecord | null;
  teamB: TournamentTeamRecord | null;
  maps: TournamentMapRecord[];
  playersA: Array<{
    id: string;
    player_name: string;
    role?: string | null;
    riot_id?: string | null;
  }>;
  playersB: Array<{
    id: string;
    player_name: string;
    role?: string | null;
    riot_id?: string | null;
  }>;
  stats: Array<{
    id: string;
    player_name?: string | null;
    role?: string | null;
    acs?: number | null;
    kills?: number | null;
    deaths?: number | null;
    assists?: number | null;
    adr?: number | null;
    hs_percentage?: number | null;
  }>;
}

export function isGamingEvent(
  event:
    | { type?: string | string[] | null; category?: string | null }
    | null
    | undefined,
) {
  if (!event) return false;
  const candidates = [
    event.category,
    ...(Array.isArray(event.type) ? event.type : [event.type]),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return candidates.some(
    (value) =>
      value.includes("gaming") ||
      value.includes("esports") ||
      value.includes("valorant"),
  );
}

const tournamentsTable = "esports_tournaments";
const teamsTable = "esports_tournament_teams";
const matchesTable = "esports_tournament_matches";
const mapsTable = "esports_tournament_maps";

export async function getTournamentByEventId(eventId: string) {
  const { data, error } = await (supabase as any)
    .from(tournamentsTable)
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) throw error;
  return data as TournamentRecord | null;
}

export async function ensureTournamentForEvent(
  eventId: string,
  payload?: Partial<TournamentRecord>,
) {
  const existing = await getTournamentByEventId(eventId);
  if (existing) return existing;

  const { data, error } = await (supabase as any)
    .from(tournamentsTable)
    .insert({
      event_id: eventId,
      game_name: payload?.game_name ?? "Valorant",
      tournament_type: payload?.tournament_type ?? "Single Elimination",
      max_teams: payload?.max_teams ?? 16,
      current_teams: 0,
      status: "registration_open",
    })
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data as TournamentRecord;
}

export async function listTournamentTeams(tournamentId: string) {
  const { data, error } = await (supabase as any)
    .from(teamsTable)
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("team_seed", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []) as TournamentTeamRecord[];
}

export async function listTournamentMatches(tournamentId: string) {
  const { data, error } = await (supabase as any)
    .from(matchesTable)
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("round_number", { ascending: true })
    .order("match_number", { ascending: true });

  if (error) throw error;
  return (data || []) as TournamentMatchRecord[];
}

export async function createTournamentTeam(payload: {
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
}) {
  const { data, error } = await (supabase as any)
    .from(teamsTable)
    .insert({
      tournament_id: payload.tournamentId,
      team_name: payload.teamName,
      captain_id: payload.captainId ?? null,
      team_logo: payload.teamLogo ?? null,
      player_1: payload.player1 ?? null,
      player_2: payload.player2 ?? null,
      player_3: payload.player3 ?? null,
      player_4: payload.player4 ?? null,
      player_5: payload.player5 ?? null,
      substitute_players: payload.substitutePlayers ?? null,
      riot_ids: payload.riotIds ?? null,
      checked_in: payload.checkedIn ?? false,
      team_seed: 999,
    })
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data as TournamentTeamRecord;
}

export async function updateTournamentTeam(
  teamId: string,
  updates: Partial<TournamentTeamRecord>,
) {
  const { data, error } = await (supabase as any)
    .from(teamsTable)
    .update(updates)
    .eq("id", teamId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data as TournamentTeamRecord;
}

export async function deleteTournamentTeam(teamId: string) {
  const { error } = await (supabase as any)
    .from(teamsTable)
    .delete()
    .eq("id", teamId);
  if (error) throw error;
}

export async function updateTournamentStatus(
  tournamentId: string,
  status: TournamentStatus,
) {
  const { data, error } = await (supabase as any)
    .from(tournamentsTable)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", tournamentId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data as TournamentRecord;
}

export async function generateTournamentBracket(tournamentId: string) {
  const [tournament, teams] = await Promise.all([
    (supabase as any)
      .from(tournamentsTable)
      .select("*")
      .eq("id", tournamentId)
      .maybeSingle(),
    listTournamentTeams(tournamentId),
  ]);

  const checkedInTeams = teams.filter((team) => team.checked_in);
  if (!checkedInTeams.length)
    throw new Error("No checked-in teams available for the bracket.");

  const teamCount = checkedInTeams.length;
  const nextPower = Math.pow(2, Math.ceil(Math.log2(teamCount)));
  const seededTeams = [...checkedInTeams].sort(
    (a, b) =>
      (a.team_seed ?? 999) - (b.team_seed ?? 999) ||
      (a.created_at || "").localeCompare(b.created_at || ""),
  );

  const bracketSlots = Array.from({ length: nextPower }, (_, index) => {
    const team = seededTeams[index];
    return team ? team.id : null;
  });

  const roundCount = Math.log2(nextPower);
  const pairs: Array<{ teamA: string | null; teamB: string | null }> = [];
  for (let i = 0; i < nextPower / 2; i++) {
    const teamA = bracketSlots[i];
    const teamB = bracketSlots[nextPower - 1 - i];
    pairs.push({ teamA, teamB });
  }

  const existingMatches = await listTournamentMatches(tournamentId);
  if (existingMatches.length) {
    await (supabase as any)
      .from(matchesTable)
      .delete()
      .eq("tournament_id", tournamentId);
  }

  const matchesToInsert: Array<Record<string, unknown>> = [];
  for (let round = 1; round <= roundCount; round++) {
    const matchCount = nextPower / Math.pow(2, round);
    for (let index = 0; index < matchCount; index++) {
      let teamAId: string | null = null;
      let teamBId: string | null = null;
      let status: MatchStatus = "upcoming";
      let winnerId: string | null = null;

      if (round === 1) {
        const pair = pairs[index];
        teamAId = pair?.teamA ?? null;
        teamBId = pair?.teamB ?? null;
        if (!teamAId || !teamBId) {
          status = "completed";
          winnerId = teamAId || teamBId || null;
        }
      }

      matchesToInsert.push({
        tournament_id: tournamentId,
        round_number: round,
        match_number: index + 1,
        team_a_id: teamAId,
        team_b_id: teamBId,
        team_a_score: null,
        team_b_score: null,
        winner_id: winnerId,
        match_status: status,
        scheduled_time: null,
        streamed_match: false,
        vod_link: null,
      });
    }
  }

  const { error } = await (supabase as any)
    .from(matchesTable)
    .insert(matchesToInsert);
  if (error) throw error;

  const { data: updatedTournament, error: updateError } = await (
    supabase as any
  )
    .from(tournamentsTable)
    .update({
      current_teams: checkedInTeams.length,
      status: "bracket_generated",
      updated_at: new Date().toISOString(),
    })
    .eq("id", tournamentId)
    .select("*")
    .maybeSingle();

  if (updateError) throw updateError;
  return {
    tournament: updatedTournament as TournamentRecord,
    matches: matchesToInsert,
  };
}

export async function updateTournamentMatch(
  matchId: string,
  updates: Partial<TournamentMatchRecord>,
) {
  const { data, error } = await (supabase as any)
    .from(matchesTable)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", matchId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data as TournamentMatchRecord;
}

export async function updateMatchMap(
  mapId: string,
  updates: Partial<TournamentMapRecord>,
) {
  const { data, error } = await (supabase as any)
    .from(mapsTable)
    .update(updates)
    .eq("id", mapId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data as TournamentMapRecord;
}

export async function upsertPlayerMatchStats(payload: {
  matchId: string;
  playerId?: string | null;
  mapId?: string | null;
  kills?: number;
  deaths?: number;
  assists?: number;
  acs?: number;
  adr?: number;
  hsPercentage?: number;
  plants?: number;
  defuses?: number;
}) {
  const { data, error } = await (supabase as any)
    .from("esports_player_match_stats")
    .upsert({
      match_id: payload.matchId,
      player_id: payload.playerId ?? null,
      map_id: payload.mapId ?? null,
      kills: payload.kills ?? 0,
      deaths: payload.deaths ?? 0,
      assists: payload.assists ?? 0,
      acs: payload.acs ?? 0,
      adr: payload.adr ?? 0,
      hs_percentage: payload.hsPercentage ?? 0,
      plants: payload.plants ?? 0,
      defuses: payload.defuses ?? 0,
    })
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getMatchCentreData(matchId: string) {
  const getSingle = async <T>(
    query: Promise<{ data: T | null; error: unknown }>,
  ) => {
    try {
      const result = await query;
      if (result.error) return { data: null as T | null, error: result.error };
      return { data: result.data as T | null, error: null };
    } catch (error) {
      return { data: null as T | null, error };
    }
  };

  const [matchRes, tournamentRes, teamARes, teamBRes] = await Promise.all([
    getSingle(
      (supabase as any)
        .from(matchesTable)
        .select("*")
        .eq("id", matchId)
        .maybeSingle(),
    ),
    getSingle(
      (supabase as any).from(tournamentsTable).select("*").maybeSingle(),
    ),
    getSingle((supabase as any).from(teamsTable).select("*").maybeSingle()),
    getSingle((supabase as any).from(teamsTable).select("*").maybeSingle()),
  ]);

  const match = (matchRes.data as TournamentMatchRecord | null) ?? null;
  const tournament = (tournamentRes.data as TournamentRecord | null) ?? null;
  const teamA = (teamARes.data as TournamentTeamRecord | null) ?? null;
  const teamB = (teamBRes.data as TournamentTeamRecord | null) ?? null;

  if (!match) return null;

  const [mapsRes, playersARes, playersBRes, statsRes] = await Promise.all([
    getSingle(
      (supabase as any)
        .from(mapsTable)
        .select("*")
        .eq("match_id", matchId)
        .order("map_order", { ascending: true }),
    ),
    getSingle(
      (supabase as any)
        .from("esports_players")
        .select("*")
        .eq("team_id", match.team_a_id)
        .order("player_name", { ascending: true }),
    ),
    getSingle(
      (supabase as any)
        .from("esports_players")
        .select("*")
        .eq("team_id", match.team_b_id)
        .order("player_name", { ascending: true }),
    ),
    getSingle(
      (supabase as any)
        .from("esports_player_match_stats")
        .select("*")
        .eq("match_id", matchId),
    ),
  ]);

  return {
    match,
    tournament,
    teamA,
    teamB,
    maps: ((mapsRes.data as TournamentMapRecord[]) ||
      []) as TournamentMapRecord[],
    playersA: ((playersARes.data as Array<{
      id: string;
      player_name: string;
      role?: string | null;
      riot_id?: string | null;
    }> | null) || []) as Array<{
      id: string;
      player_name: string;
      role?: string | null;
      riot_id?: string | null;
    }>,
    playersB: ((playersBRes.data as Array<{
      id: string;
      player_name: string;
      role?: string | null;
      riot_id?: string | null;
    }> | null) || []) as Array<{
      id: string;
      player_name: string;
      role?: string | null;
      riot_id?: string | null;
    }>,
    stats: ((statsRes.data as Array<{
      id: string;
      player_name?: string | null;
      role?: string | null;
      acs?: number | null;
      kills?: number | null;
      deaths?: number | null;
      assists?: number | null;
      adr?: number | null;
      hs_percentage?: number | null;
    }> | null) || []) as Array<{
      id: string;
      player_name?: string | null;
      role?: string | null;
      acs?: number | null;
      kills?: number | null;
      deaths?: number | null;
      assists?: number | null;
      adr?: number | null;
      hs_percentage?: number | null;
    }>,
  };
}

export async function submitMatchResult(
  matchId: string,
  payload: { teamAScore: number; teamBScore: number },
) {
  const { data: match, error: matchError } = await (supabase as any)
    .from(matchesTable)
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError) throw matchError;
  if (!match) throw new Error("Match not found");

  const winnerId =
    payload.teamAScore > payload.teamBScore
      ? match.team_a_id
      : payload.teamBScore > payload.teamAScore
        ? match.team_b_id
        : null;
  const isDraw = payload.teamAScore === payload.teamBScore;
  const nextMatch = await findNextMatchForTournament(
    match.tournament_id,
    match.round_number,
    match.match_number,
  );

  const updatedMatch = await updateTournamentMatch(matchId, {
    team_a_score: payload.teamAScore,
    team_b_score: payload.teamBScore,
    winner_id: winnerId,
    match_status: isDraw ? "disputed" : "completed",
  });

  if (nextMatch && winnerId) {
    const targetField =
      match.match_number % 2 === 1 ? "team_a_id" : "team_b_id";
    const updatePayload: Record<string, unknown> = { [targetField]: winnerId };

    if (nextMatch.team_a_id && nextMatch.team_b_id) {
      updatePayload.match_status = "upcoming";
    }

    await (supabase as any)
      .from(matchesTable)
      .update(updatePayload)
      .eq("id", nextMatch.id);
  }

  const { data: tournamentData } = await (supabase as any)
    .from(tournamentsTable)
    .select("*")
    .eq("id", match.tournament_id)
    .maybeSingle();

  if (
    tournamentData?.status !== "completed" &&
    match.round_number ===
      Math.log2(
        2 **
          Math.round(
            Math.log2(await countMatchesForTournament(match.tournament_id)),
          ),
      )
  ) {
    await updateTournamentStatus(match.tournament_id, "completed");
  } else if (tournamentData?.status === "bracket_generated") {
    await updateTournamentStatus(match.tournament_id, "live");
  }

  return updatedMatch;
}

export async function findNextMatchForTournament(
  tournamentId: string,
  roundNumber: number,
  matchNumber: number,
) {
  const { data, error } = await (supabase as any)
    .from(matchesTable)
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("round_number", roundNumber + 1)
    .eq("match_number", Math.ceil(matchNumber / 2))
    .maybeSingle();

  if (error) throw error;
  return data as TournamentMatchRecord | null;
}

async function countMatchesForTournament(tournamentId: string) {
  const { count, error } = await (supabase as any)
    .from(matchesTable)
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (error) throw error;
  return count ?? 0;
}

export async function getLiveMatchOverlayData(tournamentId: string) {
  const { data, error } = await (supabase as any)
    .from(matchesTable)
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("streamed_match", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as TournamentMatchRecord | null;
}

export async function subscribeToTournamentUpdates(
  tournamentId: string,
  callback: () => void,
) {
  const channel = (supabase as any).channel(`tournament-${tournamentId}`);

  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "esports_tournament_matches",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      callback,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "esports_tournament_teams",
        filter: `tournament_id=eq.${tournamentId}`,
      },
      callback,
    )
    .subscribe();

  return () => {
    (supabase as any).removeChannel(channel);
  };
}
