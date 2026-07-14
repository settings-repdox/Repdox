// Integration tests for DI container and cross-domain interactions (Phase 10)
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerService,
  resolveService,
  replaceService,
  clearServices,
} from "@/core/services/di";

// Mock interfaces
interface IEventService {
  getEvent: (id: string) => Promise<any>;
  getEventBySlug: (slug: string) => Promise<any>;
  listEvents: (opts: any) => Promise<any[]>;
  createEvent: (payload: any) => Promise<any>;
  updateEvent: (id: string, updates: any) => Promise<any>;
  deleteEvent: (id: string) => Promise<void>;
  transitionLifecycle: (id: string, status: string) => Promise<any>;
}

interface IRegistrationService {
  registerUser: (userId: string, eventId: string) => Promise<any>;
  getRegistration: (id: string) => Promise<any>;
  getRegistrations: (eventId: string) => Promise<any[]>;
  checkInUser: (regId: string) => Promise<any>;
  cancelRegistration: (regId: string) => Promise<void>;
  addUserToTeam: (regId: string, teamId: string) => Promise<any>;
}

interface IGamingService {
  isGamingEvent: (type: string) => boolean;
  getTournamentByEventId: (eventId: string) => Promise<any>;
  ensureTournamentForEvent: (eventId: string) => Promise<any>;
  listTournamentTeams: (tournamentId: string) => Promise<any[]>;
  listTournamentMatches: (tournamentId: string) => Promise<any[]>;
  generateTournamentBracket: (tournamentId: string) => Promise<any>;
  submitMatchResult: (matchId: string, result: any) => Promise<any>;
}

// Mock implementations for testing
const createMockEventService = (): IEventService => ({
  getEvent: vi.fn().mockResolvedValue(null),
  getEventBySlug: vi.fn().mockResolvedValue(null),
  listEvents: vi.fn().mockResolvedValue([]),
  createEvent: vi.fn().mockResolvedValue({}),
  updateEvent: vi.fn().mockResolvedValue({}),
  deleteEvent: vi.fn().mockResolvedValue(undefined),
  transitionLifecycle: vi.fn().mockResolvedValue({}),
});

const createMockRegistrationService = (): IRegistrationService => ({
  registerUser: vi.fn().mockResolvedValue({}),
  getRegistration: vi.fn().mockResolvedValue(null),
  getRegistrations: vi.fn().mockResolvedValue([]),
  checkInUser: vi.fn().mockResolvedValue({}),
  cancelRegistration: vi.fn().mockResolvedValue(undefined),
  addUserToTeam: vi.fn().mockResolvedValue({}),
});

const createMockGamingService = (): IGamingService => ({
  isGamingEvent: vi.fn().mockReturnValue(true),
  getTournamentByEventId: vi.fn().mockResolvedValue(null),
  ensureTournamentForEvent: vi.fn().mockResolvedValue({}),
  listTournamentTeams: vi.fn().mockResolvedValue([]),
  listTournamentMatches: vi.fn().mockResolvedValue([]),
  generateTournamentBracket: vi.fn().mockResolvedValue({}),
  submitMatchResult: vi.fn().mockResolvedValue({}),
});

describe("DI Container Integration", () => {
  beforeEach(() => {
    clearServices();
  });

  describe("Service Registration", () => {
    it("should register a service", () => {
      const eventService = createMockEventService();
      registerService("EventService", eventService);

      const resolved = resolveService<IEventService>("EventService");
      expect(resolved).toBe(eventService);
    });

    it("should throw error when resolving unregistered service", () => {
      expect(() => resolveService("UnregisteredService")).toThrow(
        "Service not registered: UnregisteredService",
      );
    });

    it("should allow multiple services to be registered", () => {
      const eventService = createMockEventService();
      const registrationService = createMockRegistrationService();

      registerService("EventService", eventService);
      registerService("RegistrationService", registrationService);

      expect(resolveService("EventService")).toBe(eventService);
      expect(resolveService("RegistrationService")).toBe(registrationService);
    });

    it("should throw error when re-registering service", () => {
      const service1 = createMockEventService();
      const service2 = createMockEventService();

      registerService("EventService", service1);

      // registerService should throw on duplicate
      expect(() => registerService("EventService", service2)).toThrow(
        "Service already registered: EventService",
      );
    });

    it("should allow service replacement", () => {
      const service1 = createMockEventService();
      const service2 = createMockEventService();

      registerService("EventService", service1);
      replaceService("EventService", service2);

      expect(resolveService("EventService")).toBe(service2);
    });
  });

  describe("Cross-Domain Service Interactions", () => {
    beforeEach(() => {
      const eventService = createMockEventService();
      const registrationService = createMockRegistrationService();
      const gamingService = createMockGamingService();

      registerService("EventService", eventService);
      registerService("RegistrationService", registrationService);
      registerService("GamingService", gamingService);
    });

    it("should allow resolution of all domain services", () => {
      const eventService = resolveService<IEventService>("EventService");
      const registrationService = resolveService<IRegistrationService>(
        "RegistrationService",
      );
      const gamingService = resolveService<IGamingService>("GamingService");

      expect(eventService).toBeDefined();
      expect(registrationService).toBeDefined();
      expect(gamingService).toBeDefined();
    });

    it("should maintain service independence", () => {
      const eventService = resolveService<IEventService>("EventService");
      const gamingService = resolveService<IGamingService>("GamingService");

      // Services should be independent and operate on their own state
      expect(eventService).not.toBe(gamingService);
    });
  });

  describe("Lazy Service Resolution", () => {
    it("should support lazy service resolution pattern", () => {
      const eventService = createMockEventService();
      registerService("EventService", eventService);

      // Simulate lazy resolution pattern used in pages
      const lazyResolve = () => resolveService<IEventService>("EventService");

      const resolved1 = lazyResolve();
      const resolved2 = lazyResolve();

      // Both calls should resolve to same instance
      expect(resolved1).toBe(resolved2);
      expect(resolved1).toBe(eventService);
    });
  });

  describe("Service Lifecycle", () => {
    it("should maintain service state across resolutions", () => {
      const eventService = createMockEventService();
      registerService("EventService", eventService);

      const resolved1 = resolveService<IEventService>("EventService");
      const resolved2 = resolveService<IEventService>("EventService");

      expect(resolved1).toBe(resolved2);
    });

    it("should clear all services", () => {
      registerService("EventService", createMockEventService());
      registerService("RegistrationService", createMockRegistrationService());

      clearServices();

      expect(() => resolveService("EventService")).toThrow();
      expect(() => resolveService("RegistrationService")).toThrow();
    });
  });
});
