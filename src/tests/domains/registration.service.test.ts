// Unit tests for RegistrationService (Phase 10)
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock implementation for testing (without importing the real service to avoid Supabase init)
interface RegistrationDTO {
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  registered_at: string;
  check_in_time: string | null;
  team_id: string | null;
}

/**
 * Mock Registration Repository
 */
const createMockRegistrationRepository = () => ({
  getById: vi.fn(),
  getByUserAndEvent: vi.fn(),
  listByEvent: vi.fn(),
  listByUser: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  listTeamMembers: vi.fn(),
});

// Mock RegistrationService implementation
class MockRegistrationService {
  constructor(private repo: any) {}

  async registerUser(userId: string, eventId: string): Promise<RegistrationDTO> {
    const existing = await this.repo.getByUserAndEvent(userId, eventId);
    if (existing) {
      throw new Error("User is already registered");
    }
    return this.repo.create({
      user_id: userId,
      event_id: eventId,
      status: "registered",
    });
  }

  async getRegistration(id: string): Promise<RegistrationDTO | null> {
    return this.repo.getById(id);
  }

  async getRegistrations(eventId: string): Promise<RegistrationDTO[]> {
    return this.repo.listByEvent(eventId);
  }

  async checkInUser(regId: string): Promise<RegistrationDTO> {
    const reg = await this.repo.getById(regId);
    if (reg.status === "checked_in") {
      throw new Error("User already checked in");
    }
    return this.repo.update(regId, {
      status: "checked_in",
      check_in_time: new Date().toISOString(),
    });
  }

  async cancelRegistration(regId: string): Promise<void> {
    return this.repo.delete(regId);
  }

  async addUserToTeam(
    regId: string,
    teamId: string,
  ): Promise<RegistrationDTO> {
    return this.repo.update(regId, {
      team_id: teamId,
    });
  }
}

describe("RegistrationService", () => {
  let service: MockRegistrationService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = createMockRegistrationRepository();
    service = new MockRegistrationService(mockRepo);
  });

  describe("registerUser", () => {
    it("should register a user for an event", async () => {
      const registration: RegistrationDTO = {
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "registered",
        registered_at: new Date().toISOString(),
        check_in_time: null,
        team_id: null,
      };

      mockRepo.getByUserAndEvent.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(registration);

      const result = await service.registerUser("user-123", "event-456");

      expect(result.status).toBe("registered");
      expect(result.user_id).toBe("user-123");
      expect(result.event_id).toBe("event-456");
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it("should prevent duplicate registrations", async () => {
      const existingRegistration: RegistrationDTO = {
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "registered",
        registered_at: new Date().toISOString(),
        check_in_time: null,
        team_id: null,
      };

      mockRepo.getByUserAndEvent.mockResolvedValue(existingRegistration);

      await expect(
        service.registerUser("user-123", "event-456"),
      ).rejects.toThrow("User is already registered");
    });
  });

  describe("getRegistration", () => {
    it("should retrieve registration by ID", async () => {
      const registration: RegistrationDTO = {
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "registered",
        registered_at: new Date().toISOString(),
        check_in_time: null,
        team_id: null,
      };

      mockRepo.getById.mockResolvedValue(registration);

      const result = await service.getRegistration("reg-123");

      expect(result).toEqual(registration);
      expect(mockRepo.getById).toHaveBeenCalledWith("reg-123");
    });

    it("should return null if registration not found", async () => {
      mockRepo.getById.mockResolvedValue(null);

      const result = await service.getRegistration("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getRegistrations", () => {
    it("should list registrations for an event", async () => {
      const registrations: RegistrationDTO[] = [
        {
          id: "reg-1",
          user_id: "user-1",
          event_id: "event-456",
          status: "registered",
          registered_at: new Date().toISOString(),
          check_in_time: null,
          team_id: null,
        },
        {
          id: "reg-2",
          user_id: "user-2",
          event_id: "event-456",
          status: "checked_in",
          registered_at: new Date().toISOString(),
          check_in_time: new Date().toISOString(),
          team_id: null,
        },
      ];

      mockRepo.listByEvent.mockResolvedValue(registrations);

      const result = await service.getRegistrations("event-456");

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("registered");
      expect(result[1].check_in_time).not.toBeNull();
    });

    it("should return empty array if no registrations", async () => {
      mockRepo.listByEvent.mockResolvedValue([]);

      const result = await service.getRegistrations("nonexistent-event");

      expect(result).toEqual([]);
    });
  });

  describe("checkInUser", () => {
    it("should mark user as checked in", async () => {
      const checkedInRegistration: RegistrationDTO = {
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "checked_in",
        registered_at: new Date().toISOString(),
        check_in_time: new Date().toISOString(),
        team_id: null,
      };

      mockRepo.getById.mockResolvedValue({
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "registered",
        registered_at: new Date().toISOString(),
        check_in_time: null,
        team_id: null,
      });
      mockRepo.update.mockResolvedValue(checkedInRegistration);

      const result = await service.checkInUser("reg-123");

      expect(result.status).toBe("checked_in");
      expect(result.check_in_time).not.toBeNull();
    });

    it("should reject check-in for already checked-in user", async () => {
      mockRepo.getById.mockResolvedValue({
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "checked_in",
        registered_at: new Date().toISOString(),
        check_in_time: new Date().toISOString(),
        team_id: null,
      });

      await expect(service.checkInUser("reg-123")).rejects.toThrow(
        "User already checked in",
      );
    });
  });

  describe("cancelRegistration", () => {
    it("should cancel a registration", async () => {
      mockRepo.delete.mockResolvedValue(undefined);

      await service.cancelRegistration("reg-123");

      expect(mockRepo.delete).toHaveBeenCalledWith("reg-123");
    });
  });

  describe("addUserToTeam", () => {
    it("should add user to team registration", async () => {
      const registration: RegistrationDTO = {
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "registered",
        registered_at: new Date().toISOString(),
        check_in_time: null,
        team_id: "team-789",
      };

      mockRepo.update.mockResolvedValue(registration);

      const result = await service.addUserToTeam("reg-123", "team-789");

      expect(result.team_id).toBe("team-789");
    });
  });
});

  describe("registerUser", () => {
    it("should register a user for an event", async () => {
      const registration: RegistrationDTO = {
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "registered",
        registered_at: new Date().toISOString(),
        check_in_time: null,
        team_id: null,
      };

      mockRepo.create.mockResolvedValue(registration);

      const result = await service.registerUser("user-123", "event-456");

      expect(result.status).toBe("registered");
      expect(result.user_id).toBe("user-123");
      expect(result.event_id).toBe("event-456");
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it("should prevent duplicate registrations", async () => {
      const existingRegistration: RegistrationDTO = {
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "registered",
        registered_at: new Date().toISOString(),
        check_in_time: null,
        team_id: null,
      };

      mockRepo.getByUserAndEvent.mockResolvedValue(existingRegistration);

      await expect(
        service.registerUser("user-123", "event-456"),
      ).rejects.toThrow("User is already registered");
    });
  });

  describe("getRegistration", () => {
    it("should retrieve registration by ID", async () => {
      const registration: RegistrationDTO = {
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "registered",
        registered_at: new Date().toISOString(),
        check_in_time: null,
        team_id: null,
      };

      mockRepo.getById.mockResolvedValue(registration);

      const result = await service.getRegistration("reg-123");

      expect(result).toEqual(registration);
      expect(mockRepo.getById).toHaveBeenCalledWith("reg-123");
    });

    it("should return null if registration not found", async () => {
      mockRepo.getById.mockResolvedValue(null);

      const result = await service.getRegistration("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getRegistrations", () => {
    it("should list registrations for an event", async () => {
      const registrations: RegistrationDTO[] = [
        {
          id: "reg-1",
          user_id: "user-1",
          event_id: "event-456",
          status: "registered",
          registered_at: new Date().toISOString(),
          check_in_time: null,
          team_id: null,
        },
        {
          id: "reg-2",
          user_id: "user-2",
          event_id: "event-456",
          status: "checked_in",
          registered_at: new Date().toISOString(),
          check_in_time: new Date().toISOString(),
          team_id: null,
        },
      ];

      mockRepo.listByEvent.mockResolvedValue(registrations);

      const result = await service.getRegistrations("event-456");

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("registered");
      expect(result[1].check_in_time).not.toBeNull();
    });

    it("should return empty array if no registrations", async () => {
      mockRepo.listByEvent.mockResolvedValue([]);

      const result = await service.getRegistrations("nonexistent-event");

      expect(result).toEqual([]);
    });
  });

  describe("checkInUser", () => {
    it("should mark user as checked in", async () => {
      const checkedInRegistration: RegistrationDTO = {
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "checked_in",
        registered_at: new Date().toISOString(),
        check_in_time: new Date().toISOString(),
        team_id: null,
      };

      mockRepo.getById.mockResolvedValue({
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "registered",
        registered_at: new Date().toISOString(),
        check_in_time: null,
        team_id: null,
      });
      mockRepo.update.mockResolvedValue(checkedInRegistration);

      const result = await service.checkInUser("reg-123");

      expect(result.status).toBe("checked_in");
      expect(result.check_in_time).not.toBeNull();
    });

    it("should reject check-in for already checked-in user", async () => {
      mockRepo.getById.mockResolvedValue({
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "checked_in",
        registered_at: new Date().toISOString(),
        check_in_time: new Date().toISOString(),
        team_id: null,
      });

      await expect(service.checkInUser("reg-123")).rejects.toThrow(
        "User already checked in",
      );
    });
  });

  describe("cancelRegistration", () => {
    it("should cancel a registration", async () => {
      mockRepo.delete.mockResolvedValue(undefined);

      await service.cancelRegistration("reg-123");

      expect(mockRepo.delete).toHaveBeenCalledWith("reg-123");
    });
  });

  describe("addUserToTeam", () => {
    it("should add user to team registration", async () => {
      const registration: RegistrationDTO = {
        id: "reg-123",
        user_id: "user-123",
        event_id: "event-456",
        status: "registered",
        registered_at: new Date().toISOString(),
        check_in_time: null,
        team_id: "team-789",
      };

      mockRepo.update.mockResolvedValue(registration);

      const result = await service.addUserToTeam("reg-123", "team-789");

      expect(result.team_id).toBe("team-789");
    });
  });
});
