import { describe, it, expect, vi, beforeEach } from "vitest";

// GamingServiceImpl takes no repository via constructor injection (unlike
// TicketServiceImpl/EventServiceImpl) - it lazily does
// `await import("@/integrations/supabase/client")` inside a private
// getSupabase() method on every call. There's no constructor seam to
// inject a fake repository into, so this test mocks the Supabase client
// module itself with vi.mock() and drives the REAL GamingServiceImpl
// against a small fake query-builder that mimics
// .from().select().eq().order().maybeSingle() etc.
//
// This replaces the previous version of this file, which tested a
// hand-written `MockGamingService` class that reimplemented a simplified
// version of the real logic (and never imported GamingServiceImpl at
// all) - it could not have caught a real regression in this file.

// ---- Fake Supabase query builder -----------------------------------

interface TableState {
  rows: any[];
}

function createFakeSupabase(tables: Record<string, any[]> = {}) {
  const state: Record<string, TableState> = {};
  for (const [table, rows] of Object.entries(tables)) {
    state[table] = { rows: [...rows] };
  }

  function ensureTable(table: string): TableState {
    if (!state[table]) state[table] = { rows: [] };
    return state[table];
  }

  function from(table: string) {
    const filters: Array<(row: any) => boolean> = [];
    let orderKey: string | null = null;
    let limitCount: number | null = null;
    let pendingInsert: any[] | null = null;
    let pendingUpdate: Record<string, unknown> | null = null;
    let pendingUpsert: any | null = null;
    let pendingDelete = false;
    let selectCount = false;

    const applyFiltersAndOrder = () => {
      let rows = ensureTable(table).rows.filter((row) =>
        filters.every((f) => f(row)),
      );
      if (orderKey) {
        rows = [...rows].sort((a, b) =>
          (a[orderKey as string] ?? "") > (b[orderKey as string] ?? "")
            ? 1
            : -1,
        );
      }
      if (limitCount != null) rows = rows.slice(0, limitCount);
      return rows;
    };

    const builder: any = {
      select(_cols?: string, opts?: { count?: string; head?: boolean }) {
        if (opts?.count) selectCount = true;
        return builder;
      },
      eq(key: string, value: unknown) {
        filters.push((row) => row[key] === value);
        return builder;
      },
      order(key: string) {
        orderKey = key;
        return builder;
      },
      limit(n: number) {
        limitCount = n;
        return builder;
      },
      insert(rowsToInsert: any) {
        pendingInsert = Array.isArray(rowsToInsert)
          ? rowsToInsert
          : [rowsToInsert];
        return builder;
      },
      update(patch: Record<string, unknown>) {
        pendingUpdate = patch;
        return builder;
      },
      upsert(row: any) {
        pendingUpsert = row;
        return builder;
      },
      delete() {
        pendingDelete = true;
        return builder;
      },
      then(resolve: (v: any) => void, reject?: (e: any) => void) {
        // Allow `await builder` directly (some call sites don't call a
        // terminal method before awaiting, e.g. delete().eq(...))
        return Promise.resolve(this.__exec()).then(resolve, reject);
      },
      __exec() {
        const t = ensureTable(table);

        if (pendingDelete) {
          const before = t.rows.length;
          t.rows = t.rows.filter((row) => !filters.every((f) => f(row)));
          return { data: null, error: null, count: before - t.rows.length };
        }

        if (pendingInsert) {
          const inserted = pendingInsert.map((row, i) => ({
            id: row.id ?? `generated-${table}-${t.rows.length + i}`,
            created_at: row.created_at ?? new Date().toISOString(),
            ...row,
          }));
          t.rows.push(...inserted);
          return {
            data: inserted.length === 1 ? inserted[0] : inserted,
            error: null,
          };
        }

        if (pendingUpdate) {
          const matched = t.rows.filter((row) =>
            filters.every((f) => f(row)),
          );
          matched.forEach((row) => Object.assign(row, pendingUpdate));
          return {
            data: matched.length === 1 ? matched[0] : matched,
            error: null,
          };
        }

        if (pendingUpsert) {
          const row = pendingUpsert;
          const existingIdx = t.rows.findIndex(
            (r) => r.id != null && r.id === row.id,
          );
          if (existingIdx >= 0) {
            Object.assign(t.rows[existingIdx], row);
            return { data: t.rows[existingIdx], error: null };
          }
          const created = {
            id: row.id ?? `generated-${table}-${t.rows.length}`,
            ...row,
          };
          t.rows.push(created);
          return { data: created, error: null };
        }

        const rows = applyFiltersAndOrder();
        if (selectCount) {
          return { data: null, error: null, count: rows.length };
        }
        return { data: rows, error: null };
      },
      // Terminal helper used directly by GamingServiceImpl in most places
      maybeSingle() {
        return (async () => {
          const result = builder.__exec();
          const rows = Array.isArray(result.data)
            ? result.data
            : result.data
              ? [result.data]
              : [];
          return {
            data:
              rows[0] ?? (Array.isArray(result.data) ? null : result.data),
            error: result.error,
          };
        })();
      },
    };

    return builder;
  }

  const channelMock = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };

  return {
    from,
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
    __state: state,
  };
}

// ---- Mock the module GamingServiceImpl dynamically imports ----------

let fakeSupabase = createFakeSupabase();

vi.mock("@/integrations/supabase/client", () => ({
  get supabase() {
    return fakeSupabase;
  },
}));

// Import AFTER the mock is registered.
const { GamingServiceImpl } = await import(
  "@/domains/gaming/impl/GamingServiceImpl"
);

describe("GamingServiceImpl", () => {
  let service: InstanceType<typeof GamingServiceImpl>;

  beforeEach(() => {
    fakeSupabase = createFakeSupabase({
      esports_tournaments: [],
      esports_tournament_teams: [],
      esports_tournament_matches: [],
      esports_tournament_maps: [],
      esports_players: [],
      esports_player_match_stats: [],
    });
    service = new GamingServiceImpl();
  });

  describe("isGamingEvent", () => {
    it("matches on type field (case-insensitive)", () => {
      expect(service.isGamingEvent({ type: "Gaming" })).toBe(true);
      expect(service.isGamingEvent({ type: "gaming" })).toBe(true);
    });

    it("matches on category, slug, title, or tags as fallbacks", () => {
      expect(service.isGamingEvent({ category: "Esports Night" })).toBe(true);
      expect(service.isGamingEvent({ slug: "valorant-showdown" })).toBe(true);
      expect(service.isGamingEvent({ title: "CS2 Tournament" })).toBe(true);
      expect(
        service.isGamingEvent({ tags: ["community", "match-play"] }),
      ).toBe(true);
    });

    it("returns false for non-gaming events", () => {
      expect(service.isGamingEvent({ type: "Hackathon" })).toBe(false);
      expect(
        service.isGamingEvent({ type: "Workshop", title: "React 101" }),
      ).toBe(false);
    });

    it("returns false for null/undefined event", () => {
      expect(service.isGamingEvent(null)).toBe(false);
      expect(service.isGamingEvent(undefined)).toBe(false);
    });
  });

  describe("getTournamentByEventId / ensureTournamentForEvent", () => {
    it("returns null when no tournament exists for the event", async () => {
      const result = await service.getTournamentByEventId("event-1");
      expect(result).toBeNull();
    });

    it("creates a tournament when none exists", async () => {
      const created = await service.ensureTournamentForEvent("event-1");
      expect(created.event_id).toBe("event-1");
      expect(created.status).toBe("registration_open");
      expect(created.game_name).toBe("Valorant");
    });

    it("returns the existing tournament instead of creating a duplicate", async () => {
      const first = await service.ensureTournamentForEvent("event-1");
      const second = await service.ensureTournamentForEvent("event-1");
      expect(second.id).toBe(first.id);

      const all = fakeSupabase.__state["esports_tournaments"].rows;
      expect(all.filter((t) => t.event_id === "event-1")).toHaveLength(1);
    });

    it("honors a custom game_name on creation", async () => {
      const created = await service.ensureTournamentForEvent("event-2", {
        game_name: "CS2",
      });
      expect(created.game_name).toBe("CS2");
    });
  });

  describe("createTournamentTeam / listTournamentTeams", () => {
    it("creates a team and lists it back for the tournament", async () => {
      const team = await service.createTournamentTeam({
        tournamentId: "t-1",
        teamName: "Team Alpha",
      });
      expect(team.team_name).toBe("Team Alpha");
      expect(team.checked_in).toBe(false);

      const teams = await service.listTournamentTeams("t-1");
      expect(teams).toHaveLength(1);
      expect(teams[0].team_name).toBe("Team Alpha");
    });

    it("does not return teams belonging to a different tournament", async () => {
      await service.createTournamentTeam({
        tournamentId: "t-1",
        teamName: "Team Alpha",
      });
      await service.createTournamentTeam({
        tournamentId: "t-2",
        teamName: "Team Beta",
      });

      const teams = await service.listTournamentTeams("t-1");
      expect(teams).toHaveLength(1);
      expect(teams[0].team_name).toBe("Team Alpha");
    });
  });

  describe("updateTournamentTeam / deleteTournamentTeam", () => {
    it("updates a team's fields", async () => {
      const team = await service.createTournamentTeam({
        tournamentId: "t-1",
        teamName: "Team Alpha",
      });
      const updated = await service.updateTournamentTeam(team.id, {
        checked_in: true,
      });
      expect(updated.checked_in).toBe(true);
    });

    it("removes a team", async () => {
      const team = await service.createTournamentTeam({
        tournamentId: "t-1",
        teamName: "Team Alpha",
      });
      await service.deleteTournamentTeam(team.id);
      const teams = await service.listTournamentTeams("t-1");
      expect(teams).toHaveLength(0);
    });
  });

  describe("generateTournamentBracket", () => {
    it("throws when there are no checked-in teams", async () => {
      await service.createTournamentTeam({
        tournamentId: "t-1",
        teamName: "Team Alpha",
      });
      await expect(service.generateTournamentBracket("t-1")).rejects.toThrow(
        /checked-in/i,
      );
    });

    it("pairs checked-in teams and marks the tournament bracket_generated", async () => {
      fakeSupabase.__state["esports_tournaments"].rows.push({
        id: "t-1",
        event_id: "event-1",
        game_name: "Valorant",
        status: "registration_open",
        current_teams: 0,
        created_at: new Date().toISOString(),
      });
      for (const name of ["Alpha", "Beta", "Gamma", "Delta"]) {
        const team = await service.createTournamentTeam({
          tournamentId: "t-1",
          teamName: name,
        });
        await service.updateTournamentTeam(team.id, { checked_in: true });
      }

      const { tournament, matches } =
        await service.generateTournamentBracket("t-1");

      expect(tournament.status).toBe("bracket_generated");
      expect(tournament.current_teams).toBe(4);
      // 4 teams -> round 1 has 2 matches, round 2 (final) has 1 match
      expect(matches.filter((m: any) => m.round_number === 1)).toHaveLength(
        2,
      );
      expect(matches.filter((m: any) => m.round_number === 2)).toHaveLength(
        1,
      );
    });

    it("byes a lone unpaired team straight into completed status", async () => {
      for (const name of ["Alpha", "Beta", "Gamma"]) {
        const team = await service.createTournamentTeam({
          tournamentId: "t-1",
          teamName: name,
        });
        await service.updateTournamentTeam(team.id, { checked_in: true });
      }

      // 3 teams -> nextPower = 4, one bracket slot is empty -> one round-1
      // match is auto-completed with a bye winner.
      const { matches } = await service.generateTournamentBracket("t-1");
      const round1 = matches.filter((m: any) => m.round_number === 1);
      const byeMatch = round1.find(
        (m: any) => m.match_status === "completed",
      );
      expect(byeMatch).toBeDefined();
      expect(byeMatch.winner_id).toBeTruthy();
    });

    it("clears previously generated matches before regenerating", async () => {
      for (const name of ["Alpha", "Beta"]) {
        const team = await service.createTournamentTeam({
          tournamentId: "t-1",
          teamName: name,
        });
        await service.updateTournamentTeam(team.id, { checked_in: true });
      }
      await service.generateTournamentBracket("t-1");
      await service.generateTournamentBracket("t-1");

      const allMatches = await service.listTournamentMatches("t-1");
      // Regenerating should not leave duplicate matches from the first run.
      expect(allMatches).toHaveLength(1);
    });
  });

  describe("submitMatchResult", () => {
    async function seedTwoTeamBracket() {
      for (const name of ["Alpha", "Beta"]) {
        const team = await service.createTournamentTeam({
          tournamentId: "t-1",
          teamName: name,
        });
        await service.updateTournamentTeam(team.id, { checked_in: true });
      }
      await service.generateTournamentBracket("t-1");
      const [match] = await service.listTournamentMatches("t-1");
      return match;
    }

    it("throws if the match does not exist", async () => {
      await expect(
        service.submitMatchResult("missing-match", {
          teamAScore: 1,
          teamBScore: 0,
        }),
      ).rejects.toThrow(/not found/i);
    });

    it("records the winner based on the higher score", async () => {
      const match = await seedTwoTeamBracket();
      const updated = await service.submitMatchResult(match.id, {
        teamAScore: 13,
        teamBScore: 7,
      });
      expect(updated.winner_id).toBe(match.team_a_id);
      expect(updated.match_status).toBe("completed");
    });

    it("marks a tied score as disputed with no winner", async () => {
      const match = await seedTwoTeamBracket();
      const updated = await service.submitMatchResult(match.id, {
        teamAScore: 10,
        teamBScore: 10,
      });
      expect(updated.winner_id).toBeNull();
      expect(updated.match_status).toBe("disputed");
    });
  });

  describe("getMatchCentreData", () => {
    it("returns null when the match does not exist", async () => {
      const result = await service.getMatchCentreData("missing-match");
      expect(result).toBeNull();
    });

    it("resolves the tournament and both teams that actually belong to the match, not just any row in those tables", async () => {
      // Seed a decoy tournament and decoy teams first, so a test that
      // resolved the *wrong* row (the bug this test guards against)
      // would fail here instead of accidentally passing.
      const decoyTournament = await service.ensureTournamentForEvent(
        "decoy-event",
      );
      const decoyTeamA = await service.createTournamentTeam({
        tournamentId: decoyTournament.id,
        teamName: "Decoy Alpha",
      });
      const decoyTeamB = await service.createTournamentTeam({
        tournamentId: decoyTournament.id,
        teamName: "Decoy Beta",
      });

      const realTournament = await service.ensureTournamentForEvent(
        "real-event",
      );
      const realTeamA = await service.createTournamentTeam({
        tournamentId: realTournament.id,
        teamName: "Real Alpha",
      });
      const realTeamB = await service.createTournamentTeam({
        tournamentId: realTournament.id,
        teamName: "Real Beta",
      });
      await service.updateTournamentTeam(realTeamA.id, { checked_in: true });
      await service.updateTournamentTeam(realTeamB.id, { checked_in: true });

      fakeSupabase.__state["esports_tournament_matches"].rows = [
        {
          id: "match-1",
          tournament_id: realTournament.id,
          round_number: 1,
          match_number: 1,
          team_a_id: realTeamA.id,
          team_b_id: realTeamB.id,
          match_status: "upcoming",
        },
      ];

      const result = await service.getMatchCentreData("match-1");
      expect(result).not.toBeNull();
      expect(result!.match.id).toBe("match-1");
      expect(result!.tournament?.id).toBe(realTournament.id);
      expect(result!.tournament?.id).not.toBe(decoyTournament.id);
      expect(result!.teamA?.id).toBe(realTeamA.id);
      expect(result!.teamA?.id).not.toBe(decoyTeamA.id);
      expect(result!.teamB?.id).toBe(realTeamB.id);
      expect(result!.teamB?.id).not.toBe(decoyTeamB.id);
    });

    it("returns null teamB when the match has no team_b_id (e.g. a bye match)", async () => {
      const tournament = await service.ensureTournamentForEvent("event-1");
      const teamA = await service.createTournamentTeam({
        tournamentId: tournament.id,
        teamName: "Team Alpha",
      });
      fakeSupabase.__state["esports_tournament_matches"].rows = [
        {
          id: "match-1",
          tournament_id: tournament.id,
          round_number: 1,
          match_number: 1,
          team_a_id: teamA.id,
          team_b_id: null,
          match_status: "upcoming",
        },
      ];

      const result = await service.getMatchCentreData("match-1");
      expect(result).not.toBeNull();
      expect(result!.teamA?.id).toBe(teamA.id);
      expect(result!.teamB).toBeNull();
    });
  });

  describe("findNextMatchForTournament / getLiveMatchOverlayData", () => {
    it("finds the round-2 match that follows a round-1 match", async () => {
      for (const name of ["Alpha", "Beta", "Gamma", "Delta"]) {
        const team = await service.createTournamentTeam({
          tournamentId: "t-1",
          teamName: name,
        });
        await service.updateTournamentTeam(team.id, { checked_in: true });
      }
      await service.generateTournamentBracket("t-1");

      const next = await service.findNextMatchForTournament("t-1", 1, 1);
      expect(next).not.toBeNull();
      expect(next!.round_number).toBe(2);
    });

    it("returns null when there is no next match", async () => {
      const next = await service.findNextMatchForTournament(
        "nonexistent-tournament",
        1,
        1,
      );
      expect(next).toBeNull();
    });

    it("returns null live overlay data when no match is flagged as streamed", async () => {
      const result = await service.getLiveMatchOverlayData("t-1");
      expect(result).toBeNull();
    });
  });

  describe("subscribeToTournamentUpdates", () => {
    it("returns an unsubscribe function without throwing", () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribeToTournamentUpdates(
        "t-1",
        callback,
      );
      expect(typeof unsubscribe).toBe("function");
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});
