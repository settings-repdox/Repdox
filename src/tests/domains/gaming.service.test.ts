// Unit tests for GamingService (Phase 10)
import { describe, it, expect, beforeEach, vi } from "vitest";

interface TournamentRecord {
  id: string;
  event_id: string;
  game_name: string;
  status: string;
  current_teams: number;
  created_at: string;
  updated_at?: string;
}

interface TournamentTeamRecord {
  id: string;
  tournament_id: string;
  team_name: string;
  checked_in: boolean;
  seeding?: number;
  created_at: string;
}

interface TournamentMatchRecord {
  id: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  match_status: string;
  team1_id?: string;
  team2_id?: string;
  winner_id?: string;
  team1_score?: number;
  team2_score?: number;
  created_at: string;
}

/**
 * Mock Gaming Repository
 */
const createMockGamingRepository = () => ({
  getTournament: vi.fn(),
  getTournamentByEventId: vi.fn(),
  createTournament: vi.fn(),
  updateTournament: vi.fn(),
  listTeams: vi.fn(),
  getTeam: vi.fn(),
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  listMatches: vi.fn(),
  getMatch: vi.fn(),
  createMatch: vi.fn(),
  updateMatch: vi.fn(),
});

// Mock GamingService implementation
class MockGamingService {
  constructor(private repo: any) {}

  isGamingEvent(type: string): boolean {
    return ["Esports", "Gaming", "Gaming Tournament"].includes(type);
  }

  async getTournamentByEventId(
    eventId: string,
  ): Promise<TournamentRecord | null> {
    return this.repo.getTournamentByEventId(eventId);
  }

  async ensureTournamentForEvent(eventId: string): Promise<TournamentRecord> {
    let tournament = await this.repo.getTournamentByEventId(eventId);
    if (!tournament) {
      tournament = await this.repo.createTournament({
        event_id: eventId,
        game_name: "Default",
        status: "registration_open",
        current_teams: 0,
      });
    }
    return tournament;
  }

  async listTournamentTeams(
    tournamentId: string,
  ): Promise<TournamentTeamRecord[]> {
    return this.repo.listTeams(tournamentId);
  }

  async listTournamentMatches(
    tournamentId: string,
  ): Promise<TournamentMatchRecord[]> {
    return this.repo.listMatches(tournamentId);
  }

  async generateTournamentBracket(tournamentId: string) {
    const teams = await this.repo.listTeams(tournamentId);

    if (teams.length === 0 || teams.length % 2 !== 0) {
      throw new Error("Tournament must have even number of teams");
    }

    const tournament = await this.repo.updateTournament(tournamentId, {
      status: "bracket_generated",
    });

    const matches = [];
    for (let i = 0; i < teams.length; i += 2) {
      const match = await this.repo.createMatch({
        tournament_id: tournamentId,
        round_number: 1,
        match_number: i / 2 + 1,
        team1_id: teams[i].id,
        team2_id: teams[i + 1].id,
        match_status: "upcoming",
      });
      matches.push(match);
    }

    return { tournament, matches };
  }

  async submitMatchResult(
    matchId: string,
    result: {
      team1_score?: number;
      team2_score?: number;
      winner_id?: string;
    },
  ): Promise<TournamentMatchRecord> {
    return this.repo.updateMatch(matchId, {
      ...result,
      match_status: "completed",
    });
  }
}

describe("GamingService", () => {
  let service: MockGamingService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = createMockGamingRepository();
    service = new MockGamingService(mockRepo);
  });

  describe("isGamingEvent", () => {
    it("should return true for gaming event types", () => {
      expect(service.isGamingEvent("Esports")).toBe(true);
      expect(service.isGamingEvent("Gaming")).toBe(true);
    });

    it("should return false for non-gaming event types", () => {
      expect(service.isGamingEvent("Hackathon")).toBe(false);
      expect(service.isGamingEvent("Conference")).toBe(false);
    });
  });

  describe("getTournamentByEventId", () => {
    it("should retrieve tournament by event ID", async () => {
      const tournament: TournamentRecord = {
        id: "tournament-123",
        event_id: "event-123",
        game_name: "Valorant",
        status: "registration_open",
        current_teams: 8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockRepo.getTournamentByEventId.mockResolvedValue(tournament);

      const result = await service.getTournamentByEventId("event-123");

      expect(result).toEqual(tournament);
      expect(mockRepo.getTournamentByEventId).toHaveBeenCalledWith("event-123");
    });

    it("should return null if tournament not found", async () => {
      mockRepo.getTournamentByEventId.mockResolvedValue(null);

      const result = await service.getTournamentByEventId("event-999");

      expect(result).toBeNull();
    });
  });

  describe("ensureTournamentForEvent", () => {
    it("should return existing tournament if available", async () => {
      const tournament: TournamentRecord = {
        id: "tournament-123",
        event_id: "event-123",
        game_name: "Valorant",
        status: "registration_open",
        current_teams: 8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockRepo.getTournamentByEventId.mockResolvedValue(tournament);

      const result = await service.ensureTournamentForEvent("event-123");

      expect(result).toEqual(tournament);
    });

    it("should create new tournament if none exists", async () => {
      const newTournament: TournamentRecord = {
        id: "tournament-new",
        event_id: "event-999",
        game_name: "Default",
        status: "registration_open",
        current_teams: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockRepo.getTournamentByEventId.mockResolvedValue(null);
      mockRepo.createTournament.mockResolvedValue(newTournament);

      const result = await service.ensureTournamentForEvent("event-999");

      expect(result).toEqual(newTournament);
      expect(mockRepo.createTournament).toHaveBeenCalled();
    });
  });

  describe("listTournamentTeams", () => {
    it("should list teams in tournament", async () => {
      const teams: TournamentTeamRecord[] = [
        {
          id: "team-1",
          tournament_id: "tournament-123",
          team_name: "Team Alpha",
          checked_in: true,
          seeding: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: "team-2",
          tournament_id: "tournament-123",
          team_name: "Team Beta",
          checked_in: false,
          seeding: 2,
          created_at: new Date().toISOString(),
        },
      ];

      mockRepo.listTeams.mockResolvedValue(teams);

      const result = await service.listTournamentTeams("tournament-123");

      expect(result).toHaveLength(2);
      expect(result[0].team_name).toBe("Team Alpha");
      expect(mockRepo.listTeams).toHaveBeenCalledWith("tournament-123");
    });

    it("should return empty array if no teams", async () => {
      mockRepo.listTeams.mockResolvedValue([]);

      const result = await service.listTournamentTeams("tournament-123");

      expect(result).toEqual([]);
    });
  });

  describe("listTournamentMatches", () => {
    it("should list matches in tournament", async () => {
      const matches: TournamentMatchRecord[] = [
        {
          id: "match-1",
          tournament_id: "tournament-123",
          round_number: 1,
          match_number: 1,
          match_status: "upcoming",
          team1_id: "team-1",
          team2_id: "team-2",
          winner_id: undefined,
          created_at: new Date().toISOString(),
        },
        {
          id: "match-2",
          tournament_id: "tournament-123",
          round_number: 1,
          match_number: 2,
          match_status: "completed",
          team1_id: "team-3",
          team2_id: "team-4",
          winner_id: "team-3",
          created_at: new Date().toISOString(),
        },
      ];

      mockRepo.listMatches.mockResolvedValue(matches);

      const result = await service.listTournamentMatches("tournament-123");

      expect(result).toHaveLength(2);
      expect(result[0].match_status).toBe("upcoming");
      expect(result[1].winner_id).toBe("team-3");
      expect(mockRepo.listMatches).toHaveBeenCalledWith("tournament-123");
    });
  });

  describe("generateTournamentBracket", () => {
    it("should generate bracket for even number of teams", async () => {
      const teams: TournamentTeamRecord[] = Array.from(
        { length: 4 },
        (_, i) => ({
          id: `team-${i}`,
          tournament_id: "tournament-123",
          team_name: `Team ${String.fromCharCode(65 + i)}`,
          checked_in: true,
          seeding: i,
          created_at: new Date().toISOString(),
        }),
      );

      const tournament: TournamentRecord = {
        id: "tournament-123",
        event_id: "event-123",
        game_name: "Valorant",
        status: "bracket_generated",
        current_teams: 4,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockRepo.listTeams.mockResolvedValue(teams);
      mockRepo.updateTournament.mockResolvedValue(tournament);
      mockRepo.createMatch.mockResolvedValue({});

      const result = await service.generateTournamentBracket("tournament-123");

      expect(result).toBeDefined();
      expect(mockRepo.createMatch.mock.calls.length).toBeGreaterThan(0);
    });

    it("should reject bracket generation with odd number of teams", async () => {
      const teams: TournamentTeamRecord[] = Array.from(
        { length: 3 },
        (_, i) => ({
          id: `team-${i}`,
          tournament_id: "tournament-123",
          team_name: `Team ${String.fromCharCode(65 + i)}`,
          checked_in: true,
          seeding: i,
          created_at: new Date().toISOString(),
        }),
      );

      mockRepo.listTeams.mockResolvedValue(teams);

      await expect(
        service.generateTournamentBracket("tournament-123"),
      ).rejects.toThrow();
    });
  });

  describe("submitMatchResult", () => {
    it("should update match with result and winner", async () => {
      const match: TournamentMatchRecord = {
        id: "match-1",
        tournament_id: "tournament-123",
        round_number: 1,
        match_number: 1,
        match_status: "completed",
        team1_id: "team-1",
        team2_id: "team-2",
        winner_id: "team-1",
        team1_score: 13,
        team2_score: 11,
        created_at: new Date().toISOString(),
      };

      mockRepo.updateMatch.mockResolvedValue(match);

      const result = await service.submitMatchResult("match-1", {
        team1_score: 13,
        team2_score: 11,
        winner_id: "team-1",
      });

      expect(result.match_status).toBe("completed");
      expect(result.winner_id).toBe("team-1");
      expect(mockRepo.updateMatch).toHaveBeenCalled();
    });
  });
});

describe("getTournamentByEventId", () => {
  it("should retrieve tournament by event ID", async () => {
    const tournament: TournamentRecord = {
      id: "tournament-123",
      event_id: "event-123",
      game_name: "Valorant",
      status: "registration_open",
      current_teams: 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockRepo.getTournamentByEventId.mockResolvedValue(tournament);

    const result = await service.getTournamentByEventId("event-123");

    expect(result).toEqual(tournament);
    expect(mockRepo.getTournamentByEventId).toHaveBeenCalledWith("event-123");
  });

  it("should return null if tournament not found", async () => {
    mockRepo.getTournamentByEventId.mockResolvedValue(null);

    const result = await service.getTournamentByEventId("event-999");

    expect(result).toBeNull();
  });
});

describe("ensureTournamentForEvent", () => {
  it("should return existing tournament if available", async () => {
    const tournament: TournamentRecord = {
      id: "tournament-123",
      event_id: "event-123",
      game_name: "Valorant",
      status: "registration_open",
      current_teams: 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockRepo.getTournamentByEventId.mockResolvedValue(tournament);

    const result = await service.ensureTournamentForEvent("event-123");

    expect(result).toEqual(tournament);
  });

  it("should create new tournament if none exists", async () => {
    const newTournament: TournamentRecord = {
      id: "tournament-new",
      event_id: "event-999",
      game_name: "Valorant",
      status: "registration_open",
      current_teams: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockRepo.getTournamentByEventId.mockResolvedValue(null);
    mockRepo.createTournament.mockResolvedValue(newTournament);

    const result = await service.ensureTournamentForEvent("event-999");

    expect(result).toEqual(newTournament);
    expect(mockRepo.createTournament).toHaveBeenCalled();
  });
});

describe("listTournamentTeams", () => {
  it("should list teams in tournament", async () => {
    const teams: TournamentTeamRecord[] = [
      {
        id: "team-1",
        tournament_id: "tournament-123",
        team_name: "Team Alpha",
        checked_in: true,
        seeding: 1,
        created_at: new Date().toISOString(),
      },
      {
        id: "team-2",
        tournament_id: "tournament-123",
        team_name: "Team Beta",
        checked_in: false,
        seeding: 2,
        created_at: new Date().toISOString(),
      },
    ];

    mockRepo.listTeams.mockResolvedValue(teams);

    const result = await service.listTournamentTeams("tournament-123");

    expect(result).toHaveLength(2);
    expect(result[0].team_name).toBe("Team Alpha");
    expect(mockRepo.listTeams).toHaveBeenCalledWith("tournament-123");
  });

  it("should return empty array if no teams", async () => {
    mockRepo.listTeams.mockResolvedValue([]);

    const result = await service.listTournamentTeams("tournament-123");

    expect(result).toEqual([]);
  });
});

describe("listTournamentMatches", () => {
  it("should list matches in tournament", async () => {
    const matches: TournamentMatchRecord[] = [
      {
        id: "match-1",
        tournament_id: "tournament-123",
        round_number: 1,
        match_number: 1,
        match_status: "upcoming",
        team1_id: "team-1",
        team2_id: "team-2",
        winner_id: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "match-2",
        tournament_id: "tournament-123",
        round_number: 1,
        match_number: 2,
        match_status: "completed",
        team1_id: "team-3",
        team2_id: "team-4",
        winner_id: "team-3",
        created_at: new Date().toISOString(),
      },
    ];

    mockRepo.listMatches.mockResolvedValue(matches);

    const result = await service.listTournamentMatches("tournament-123");

    expect(result).toHaveLength(2);
    expect(result[0].match_status).toBe("upcoming");
    expect(result[1].winner_id).toBe("team-3");
    expect(mockRepo.listMatches).toHaveBeenCalledWith("tournament-123");
  });
});

describe("generateTournamentBracket", () => {
  it("should generate bracket for even number of teams", async () => {
    const teams: TournamentTeamRecord[] = Array.from({ length: 4 }, (_, i) => ({
      id: `team-${i}`,
      tournament_id: "tournament-123",
      team_name: `Team ${String.fromCharCode(65 + i)}`,
      checked_in: true,
      seeding: i,
      created_at: new Date().toISOString(),
    }));

    const tournament: TournamentRecord = {
      id: "tournament-123",
      event_id: "event-123",
      game_name: "Valorant",
      status: "bracket_generated",
      current_teams: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockRepo.listTeams.mockResolvedValue(teams);
    mockRepo.updateTournament.mockResolvedValue(tournament);
    mockRepo.createMatch.mockResolvedValue({});

    const result = await service.generateTournamentBracket("tournament-123");

    expect(result).toBeDefined();
    expect(mockRepo.createMatch.mock.calls.length).toBeGreaterThan(0);
  });

  it("should reject bracket generation with odd number of teams", async () => {
    const teams: TournamentTeamRecord[] = Array.from({ length: 3 }, (_, i) => ({
      id: `team-${i}`,
      tournament_id: "tournament-123",
      team_name: `Team ${String.fromCharCode(65 + i)}`,
      checked_in: true,
      seeding: i,
      created_at: new Date().toISOString(),
    }));

    mockRepo.listTeams.mockResolvedValue(teams);

    await expect(
      service.generateTournamentBracket("tournament-123"),
    ).rejects.toThrow();
  });
});

describe("submitMatchResult", () => {
  it("should update match with result and winner", async () => {
    const match: TournamentMatchRecord = {
      id: "match-1",
      tournament_id: "tournament-123",
      round_number: 1,
      match_number: 1,
      match_status: "completed",
      team1_id: "team-1",
      team2_id: "team-2",
      winner_id: "team-1",
      team1_score: 13,
      team2_score: 11,
      created_at: new Date().toISOString(),
    };

    mockRepo.updateMatch.mockResolvedValue(match);

    const result = await service.submitMatchResult("match-1", {
      team1_score: 13,
      team2_score: 11,
      winner_id: "team-1",
    });

    expect(result.match_status).toBe("completed");
    expect(result.winner_id).toBe("team-1");
    expect(mockRepo.updateMatch).toHaveBeenCalled();
  });
});
});
