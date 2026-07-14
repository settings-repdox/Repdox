// Phase 10: Test Utilities and Mocking Infrastructure
import { vi } from "vitest";

/**
 * Mock Supabase Client for tests
 */
export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "test-user-123",
            email: "test@example.com",
            email_confirmed_at: new Date().toISOString(),
          },
        },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
          order: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        order: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "new-id" },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: "test-path" },
          error: null,
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: "http://test-url" },
        }),
      }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnValue({
          subscribe: vi.fn().mockResolvedValue({ status: "SUBSCRIBED" }),
        }),
        subscribe: vi.fn().mockResolvedValue({ status: "SUBSCRIBED" }),
      }),
    }),
    removeChannel: vi.fn(),
  };
}

/**
 * Mock Service Container
 */
export function createMockServiceContainer() {
  const services: Record<string, any> = {};

  return {
    register: (key: string, service: any) => {
      services[key] = service;
    },
    resolve: (key: string) => {
      if (!services[key]) {
        throw new Error(`Service not registered: ${key}`);
      }
      return services[key];
    },
    services,
  };
}

/**
 * Mock EventService
 */
export function createMockEventService() {
  return {
    getEvent: vi.fn().mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      slug: "test-event",
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 3600000).toISOString(),
      registration_deadline: new Date(Date.now() - 86400000).toISOString(),
      location: "Test Location",
      created_by: "test-user-123",
    }),
    getEventBySlug: vi.fn().mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      slug: "test-event",
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 3600000).toISOString(),
      registration_deadline: new Date(Date.now() - 86400000).toISOString(),
      location: "Test Location",
      created_by: "test-user-123",
    }),
    listEvents: vi.fn().mockResolvedValue([
      {
        id: "event-123",
        title: "Test Event",
        slug: "test-event",
        location: "Test Location",
      },
    ]),
    createEvent: vi.fn().mockResolvedValue({
      id: "event-new",
      title: "New Event",
      slug: "new-event",
    }),
    updateEvent: vi.fn().mockResolvedValue({
      id: "event-123",
      title: "Updated Event",
      slug: "test-event",
    }),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
    transitionLifecycle: vi.fn().mockResolvedValue({
      id: "event-123",
      status: "published",
    }),
  };
}

/**
 * Mock RegistrationService
 */
export function createMockRegistrationService() {
  return {
    registerUser: vi.fn().mockResolvedValue({
      id: "registration-123",
      user_id: "user-123",
      event_id: "event-123",
      status: "registered",
    }),
    getRegistration: vi.fn().mockResolvedValue(null),
    getRegistrations: vi.fn().mockResolvedValue([
      {
        id: "registration-123",
        user_id: "user-123",
        event_id: "event-123",
        status: "registered",
      },
    ]),
    checkInUser: vi.fn().mockResolvedValue({
      id: "registration-123",
      status: "checked_in",
    }),
    cancelRegistration: vi.fn().mockResolvedValue(undefined),
    addUserToTeam: vi.fn().mockResolvedValue({
      id: "registration-123",
      team_id: "team-123",
    }),
  };
}

/**
 * Mock GamingService
 */
export function createMockGamingService() {
  return {
    isGamingEvent: vi.fn().mockReturnValue(true),
    getTournamentByEventId: vi.fn().mockResolvedValue({
      id: "tournament-123",
      event_id: "event-123",
      game_name: "Valorant",
      status: "registration_open",
    }),
    ensureTournamentForEvent: vi.fn().mockResolvedValue({
      id: "tournament-123",
      event_id: "event-123",
      game_name: "Valorant",
      status: "registration_open",
    }),
    listTournamentTeams: vi.fn().mockResolvedValue([
      {
        id: "team-123",
        tournament_id: "tournament-123",
        team_name: "Team Alpha",
        checked_in: true,
      },
    ]),
    listTournamentMatches: vi.fn().mockResolvedValue([
      {
        id: "match-123",
        tournament_id: "tournament-123",
        round_number: 1,
        match_number: 1,
        match_status: "upcoming",
      },
    ]),
    generateTournamentBracket: vi
      .fn()
      .mockResolvedValue({ tournament: {}, matches: [] }),
    submitMatchResult: vi.fn().mockResolvedValue({
      id: "match-123",
      match_status: "completed",
    }),
  };
}

/**
 * Mock Auth Service
 */
export function createMockAuthService() {
  return {
    getCurrentUser: vi.fn().mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      email_confirmed_at: new Date().toISOString(),
    }),
    signIn: vi.fn().mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
    }),
    signUp: vi.fn().mockResolvedValue({
      user: { id: "user-new", email: "new@example.com" },
    }),
    signOut: vi.fn().mockResolvedValue(undefined),
    verifyEmail: vi.fn().mockResolvedValue(true),
  };
}

/**
 * Test Data Builders
 */
export const testDataBuilder = {
  event: (overrides = {}) => ({
    id: "event-123",
    title: "Test Event",
    slug: "test-event",
    type: "Hackathon",
    format: "Offline",
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 3600000).toISOString(),
    registration_start: new Date().toISOString(),
    registration_deadline: new Date(Date.now() - 86400000).toISOString(),
    location: "Test Venue",
    short_blurb: "A test event",
    long_description: "This is a test event description",
    created_by: "user-123",
    is_active: true,
    tags: ["test", "event"],
    ...overrides,
  }),

  registration: (overrides = {}) => ({
    id: "reg-123",
    user_id: "user-123",
    event_id: "event-123",
    status: "registered",
    registered_at: new Date().toISOString(),
    ...overrides,
  }),

  tournament: (overrides = {}) => ({
    id: "tournament-123",
    event_id: "event-123",
    game_name: "Valorant",
    status: "registration_open",
    current_teams: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  user: (overrides = {}) => ({
    id: "user-123",
    email: "test@example.com",
    full_name: "Test User",
    avatar_url: null,
    bio: "Test bio",
    created_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    ...overrides,
  }),
};

/**
 * Mock Service Container
 */
export function createMockServiceContainer() {
  const services: Record<string, any> = {};

  return {
    register: (key: string, service: any) => {
      services[key] = service;
    },
    resolve: (key: string) => {
      if (!services[key]) {
        throw new Error(`Service not registered: ${key}`);
      }
      return services[key];
    },
    services,
  };
}

/**
 * Mock EventService
 */
export function createMockEventService() {
  return {
    getEvent: vi.fn().mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      slug: "test-event",
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 3600000).toISOString(),
      registration_deadline: new Date(Date.now() - 86400000).toISOString(),
      location: "Test Location",
      created_by: "test-user-123",
    }),
    getEventBySlug: vi.fn().mockResolvedValue({
      id: "event-123",
      title: "Test Event",
      slug: "test-event",
      start_at: new Date().toISOString(),
      end_at: new Date(Date.now() + 3600000).toISOString(),
      registration_deadline: new Date(Date.now() - 86400000).toISOString(),
      location: "Test Location",
      created_by: "test-user-123",
    }),
    listEvents: vi.fn().mockResolvedValue([
      {
        id: "event-123",
        title: "Test Event",
        slug: "test-event",
        location: "Test Location",
      },
    ]),
    createEvent: vi.fn().mockResolvedValue({
      id: "event-new",
      title: "New Event",
      slug: "new-event",
    }),
    updateEvent: vi.fn().mockResolvedValue({
      id: "event-123",
      title: "Updated Event",
      slug: "test-event",
    }),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
    transitionLifecycle: vi.fn().mockResolvedValue({
      id: "event-123",
      status: "published",
    }),
  };
}

/**
 * Mock RegistrationService
 */
export function createMockRegistrationService() {
  return {
    registerUser: vi.fn().mockResolvedValue({
      id: "registration-123",
      user_id: "user-123",
      event_id: "event-123",
      status: "registered",
    }),
    getRegistrations: vi.fn().mockResolvedValue([
      {
        id: "registration-123",
        user_id: "user-123",
        event_id: "event-123",
        status: "registered",
      },
    ]),
    updateRegistration: vi.fn().mockResolvedValue({
      id: "registration-123",
      status: "checked_in",
    }),
    cancelRegistration: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Mock GamingService
 */
export function createMockGamingService() {
  return {
    isGamingEvent: vi.fn().mockReturnValue(true),
    getTournamentByEventId: vi.fn().mockResolvedValue({
      id: "tournament-123",
      event_id: "event-123",
      game_name: "Valorant",
      status: "registration_open",
    }),
    ensureTournamentForEvent: vi.fn().mockResolvedValue({
      id: "tournament-123",
      event_id: "event-123",
      game_name: "Valorant",
      status: "registration_open",
    }),
    listTournamentTeams: vi.fn().mockResolvedValue([
      {
        id: "team-123",
        tournament_id: "tournament-123",
        team_name: "Team Alpha",
        checked_in: true,
      },
    ]),
    listTournamentMatches: vi.fn().mockResolvedValue([
      {
        id: "match-123",
        tournament_id: "tournament-123",
        round_number: 1,
        match_number: 1,
        match_status: "upcoming",
      },
    ]),
    generateTournamentBracket: vi
      .fn()
      .mockResolvedValue({ tournament: {}, matches: [] }),
    submitMatchResult: vi.fn().mockResolvedValue({
      id: "match-123",
      match_status: "completed",
    }),
  };
}

/**
 * Mock Auth Service
 */
export function createMockAuthService() {
  return {
    getCurrentUser: vi.fn().mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      email_confirmed_at: new Date().toISOString(),
    }),
    signIn: vi.fn().mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
    }),
    signUp: vi.fn().mockResolvedValue({
      user: { id: "user-new", email: "new@example.com" },
    }),
    signOut: vi.fn().mockResolvedValue(undefined),
    verifyEmail: vi.fn().mockResolvedValue(true),
  };
}

/**
 * Test Data Builders
 */
export const testDataBuilder = {
  event: (overrides = {}) => ({
    id: "event-123",
    title: "Test Event",
    slug: "test-event",
    type: "Hackathon",
    format: "Offline",
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 3600000).toISOString(),
    registration_start: new Date().toISOString(),
    registration_deadline: new Date(Date.now() - 86400000).toISOString(),
    location: "Test Venue",
    short_blurb: "A test event",
    long_description: "This is a test event description",
    created_by: "user-123",
    is_active: true,
    tags: ["test", "event"],
    ...overrides,
  }),

  registration: (overrides = {}) => ({
    id: "reg-123",
    user_id: "user-123",
    event_id: "event-123",
    status: "registered",
    registered_at: new Date().toISOString(),
    ...overrides,
  }),

  tournament: (overrides = {}) => ({
    id: "tournament-123",
    event_id: "event-123",
    game_name: "Valorant",
    status: "registration_open",
    current_teams: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  user: (overrides = {}) => ({
    id: "user-123",
    email: "test@example.com",
    full_name: "Test User",
    avatar_url: null,
    bio: "Test bio",
    created_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    ...overrides,
  }),
};
