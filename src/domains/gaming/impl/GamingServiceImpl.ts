// Lazily import Supabase client to avoid throwing during tests without env vars
import type {
  TournamentRecord,
  TournamentTeamRecord,
  TournamentMatchRecord,
  TournamentMapRecord,
  MatchCentreData,
  TournamentStatus,
  TournamentType,
  MatchStatus,
} from "@/lib/tournamentService";
import type { IGamingService } from "../interfaces/IGamingService";

// Implementation largely ported from legacy src/lib/tournamentService.ts

const tournamentsTable = "esports_tournaments";
const teamsTable = "esports_tournament_teams";
const matchesTable = "esports_tournament_matches";
const mapsTable = "esports_tournament_maps";

export class GamingServiceImpl implements IGamingService {
  private async getSupabase(): Promise<any> {
    try {
      const mod = await import("@/integrations/supabase/client");
      return (mod as any).supabase;
    } catch (e) {
      // Re-throw to let callers handle missing client in non-browser contexts
      throw e;
    }
  }
  isGamingEvent(event: any) {
    if (!event) return false;
    const candidates = [
      event.category,
      ...(Array.isArray(event.type) ? event.type : [event.type]),
      event.slug,
      event.title,
      ...(Array.isArray(event.tags) ? event.tags : []),
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    return candidates.some(
      (value) =>
        value.includes("gaming") ||
        value.includes("esports") ||
        value.includes("valorant") ||
        value.includes("tournament") ||
        value.includes("match") ||
        value.includes("cs2"),
    );
  }

  async getTournamentByEventId(eventId: string) {
    const supabase = await this.getSupabase();
    const { data, error } = await (supabase as any)
      .from(tournamentsTable)
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) throw error;
    return data as TournamentRecord | null;
  }

  async ensureTournamentForEvent(
    eventId: string,
    payload?: Partial<TournamentRecord>,
  ) {
    const existing = await this.getTournamentByEventId(eventId);
    if (existing) return existing;

    const supabase = await this.getSupabase();
    const { data, error } = await (supabase as any)
      .from(tournamentsTable)
      .insert({
        event_id: eventId,
        game_name: payload?.game_name ?? "Valorant",
        current_teams: 0,
        status: "registration_open",
      })
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return data as TournamentRecord;
  }

  async listTournamentTeams(tournamentId: string) {
    const supabase = await this.getSupabase();
    const { data, error } = await (supabase as any)
      .from(teamsTable)
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("team_seed", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []) as TournamentTeamRecord[];
  }

  async listTournamentMatches(tournamentId: string) {
    const supabase = await this.getSupabase();
    const { data, error } = await (supabase as any)
      .from(matchesTable)
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("round_number", { ascending: true })
      .order("match_number", { ascending: true });

    if (error) throw error;
    return (data || []) as TournamentMatchRecord[];
  }

  async createTournamentTeam(payload: any) {
    const supabase = await this.getSupabase();
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

  async updateTournamentTeam(
    teamId: string,
    updates: Partial<TournamentTeamRecord>,
  ) {
    const supabase = await this.getSupabase();
    const { data, error } = await (supabase as any)
      .from(teamsTable)
      .update(updates)
      .eq("id", teamId)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return data as TournamentTeamRecord;
  }

  async deleteTournamentTeam(teamId: string) {
    const supabase = await this.getSupabase();
    const { error } = await (supabase as any)
      .from(teamsTable)
      .delete()
      .eq("id", teamId);
    if (error) throw error;
  }

  async updateTournamentStatus(tournamentId: string, status: TournamentStatus) {
    const supabase = await this.getSupabase();
    const { data, error } = await (supabase as any)
      .from(tournamentsTable)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", tournamentId)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return data as TournamentRecord;
  }

  async generateTournamentBracket(tournamentId: string) {
    const supabase = await this.getSupabase();
    const [tournamentRes, teams] = await Promise.all([
      (supabase as any)
        .from(tournamentsTable)
        .select("*")
        .eq("id", tournamentId)
        .maybeSingle(),
      this.listTournamentTeams(tournamentId),
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

    const existingMatches = await this.listTournamentMatches(tournamentId);
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

  async updateTournamentMatch(
    matchId: string,
    updates: Partial<TournamentMatchRecord>,
  ) {
    const supabase = await this.getSupabase();
    const { data, error } = await (supabase as any)
      .from(matchesTable)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", matchId)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return data as TournamentMatchRecord;
  }

  async updateMatchMap(mapId: string, updates: Partial<TournamentMapRecord>) {
    const supabase = await this.getSupabase();
    const { data, error } = await (supabase as any)
      .from(mapsTable)
      .update(updates)
      .eq("id", mapId)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return data as TournamentMapRecord;
  }

  async upsertPlayerMatchStats(payload: any) {
    const supabase = await this.getSupabase();
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

  async getMatchCentreData(matchId: string) {
    const supabase = await this.getSupabase();

    const getSingle = async <T>(
      query: Promise<{ data: T | null; error: unknown }>,
    ) => {
      try {
        const result = await query;
        if (result.error)
          return { data: null as T | null, error: result.error };
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
      playersA: ((playersARes.data as any) || []) as any[],
      playersB: ((playersBRes.data as any) || []) as any[],
      stats: ((statsRes.data as any) || []) as any[],
    };
  }

  async updateTournamentMatch_and_logic(matchId: string, payload: any) {
    // kept for internal usage
    return this.updateTournamentMatch(matchId, payload);
  }

  async submitMatchResult(
    matchId: string,
    payload: { teamAScore: number; teamBScore: number },
  ) {
    const supabase = await this.getSupabase();
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
    const nextMatch = await this.findNextMatchForTournament(
      match.tournament_id,
      match.round_number,
      match.match_number,
    );

    const updatedMatch = await this.updateTournamentMatch(matchId, {
      team_a_score: payload.teamAScore,
      team_b_score: payload.teamBScore,
      winner_id: winnerId,
      match_status: isDraw ? "disputed" : "completed",
    });

    if (nextMatch && winnerId) {
      const targetField =
        match.match_number % 2 === 1 ? "team_a_id" : "team_b_id";
      const updatePayload: Record<string, unknown> = {
        [targetField]: winnerId,
      };

      if (nextMatch.team_a_id && nextMatch.team_b_id) {
        updatePayload.match_status = "upcoming";
      }

      const supabase2 = await this.getSupabase();
      await (supabase2 as any)
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
              Math.log2(
                await this.countMatchesForTournament(match.tournament_id),
              ),
            ),
        )
    ) {
      await this.updateTournamentStatus(match.tournament_id, "completed");
    } else if (tournamentData?.status === "bracket_generated") {
      await this.updateTournamentStatus(match.tournament_id, "live");
    }

    return updatedMatch;
  }

  async findNextMatchForTournament(
    tournamentId: string,
    roundNumber: number,
    matchNumber: number,
  ) {
    const supabase = await this.getSupabase();
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

  async countMatchesForTournament(tournamentId: string) {
    const supabase = await this.getSupabase();
    const { count, error } = await (supabase as any)
      .from(matchesTable)
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);

    if (error) throw error;
    return count ?? 0;
  }

  async getLiveMatchOverlayData(tournamentId: string) {
    const supabase = await this.getSupabase();
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

  subscribeToTournamentUpdates(tournamentId: string, callback: () => void) {
    let channelRef: any = null;
    (async () => {
      try {
        const sup = await this.getSupabase();
        channelRef = (sup as any).channel(`tournament-${tournamentId}`);

        channelRef
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
      } catch (e) {
        // Supabase unavailable (e.g., in tests). Swallow to avoid crashing.
        console.warn("Supabase channel subscribe failed:", e);
      }
    })();

    return () => {
      (async () => {
        try {
          const sup = await this.getSupabase();
          if (channelRef) (sup as any).removeChannel(channelRef);
        } catch (e) {
          // ignore
        }
      })();
    };
  }

  // Public wrapper to maintain original function name
  // (submitMatchResult implemented above)
}
