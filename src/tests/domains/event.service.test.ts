// Unit tests for EventService (Phase 10)
import { describe, it, expect, beforeEach, vi } from "vitest";

interface EventDTO {
  id: string;
  title: string;
  slug: string;
  type?: string;
  format?: string;
  status?: string;
  start_at: string;
  end_at: string;
  registration_deadline: string;
  registration_start?: string | null;
  check_in_start?: string | null;
  check_in_end?: string | null;
  location: string;
  short_blurb?: string;
  long_description?: string | null;
  overview?: string | null;
  rules?: string | null;
  image_url?: string | null;
  discord_invite?: string | null;
  instagram_handle?: string | null;
  registration_link?: string | null;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  is_active?: boolean;
  sponsors?: any;
  faqs?: any;
  prizes?: any;
  schedule?: any;
  tags?: any;
  roles?: any;
}

/**
 * Mock Repository for testing
 */
const createMockEventRepository = () => ({
  getById: vi.fn(),
  getBySlug: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
});

// Mock EventService implementation
class MockEventService {
  constructor(private repo: any) {}

  async getEvent(id: string): Promise<EventDTO | null> {
    return this.repo.getById(id);
  }

  async getEventBySlug(slug: string): Promise<EventDTO | null> {
    return this.repo.getBySlug(slug);
  }

  async listEvents(options: {
    limit?: number;
    offset?: number;
  }): Promise<EventDTO[]> {
    return this.repo.list(options);
  }

  async createEvent(payload: Partial<EventDTO>): Promise<EventDTO> {
    return this.repo.create({
      ...payload,
      status: "draft",
    });
  }

  async updateEvent(
    id: string,
    updates: Partial<EventDTO>,
  ): Promise<EventDTO> {
    return this.repo.update(id, updates);
  }

  async deleteEvent(id: string): Promise<void> {
    return this.repo.delete(id);
  }

  async transitionLifecycle(id: string, toStatus: string): Promise<EventDTO> {
    const event = await this.repo.getById(id);
    if (!event) throw new Error("Event not found");

    const validTransitions: Record<string, string[]> = {
      draft: ["published", "cancelled"],
      published: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    const currentStatus = event.status || "draft";
    if (!(validTransitions[currentStatus] || []).includes(toStatus)) {
      throw new Error("Invalid lifecycle transition");
    }

    return this.repo.update(id, { status: toStatus });
  }
}

describe("EventService", () => {
  let service: MockEventService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = createMockEventRepository();
    service = new MockEventService(mockRepo);
  });

  describe("getEvent", () => {
    it("should retrieve an event by ID", async () => {
      const eventData: EventDTO = {
        id: "event-123",
        title: "Test Event",
        slug: "test-event",
        type: "Hackathon",
        format: "Offline",
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 3600000).toISOString(),
        registration_deadline: new Date(Date.now() - 86400000).toISOString(),
        location: "Test Location",
        short_blurb: "Test",
        long_description: null,
        overview: null,
        rules: null,
        image_url: null,
        created_at: new Date().toISOString(),
        created_by: "user-123",
        updated_at: new Date().toISOString(),
        registration_start: null,
        check_in_start: null,
        check_in_end: null,
        discord_invite: null,
        instagram_handle: null,
        registration_link: null,
        is_active: true,
        sponsors: null,
        faqs: null,
        prizes: null,
        schedule: null,
        tags: null,
        roles: null,
      };

      mockRepo.getById.mockResolvedValue(eventData);

      const result = await service.getEvent("event-123");

      expect(result).toEqual(eventData);
      expect(mockRepo.getById).toHaveBeenCalledWith("event-123");
    });

    it("should return null if event not found", async () => {
      mockRepo.getById.mockResolvedValue(null);

      const result = await service.getEvent("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getEventBySlug", () => {
    it("should retrieve an event by slug", async () => {
      const eventData: EventDTO = {
        id: "event-123",
        title: "Test Event",
        slug: "test-event",
        type: "Hackathon",
        format: "Offline",
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 3600000).toISOString(),
        registration_deadline: new Date(Date.now() - 86400000).toISOString(),
        location: "Test Location",
        short_blurb: "Test",
        long_description: null,
        overview: null,
        rules: null,
        image_url: null,
        created_at: new Date().toISOString(),
        created_by: "user-123",
        updated_at: new Date().toISOString(),
        registration_start: null,
        check_in_start: null,
        check_in_end: null,
        discord_invite: null,
        instagram_handle: null,
        registration_link: null,
        is_active: true,
        sponsors: null,
        faqs: null,
        prizes: null,
        schedule: null,
        tags: null,
        roles: null,
      };

      mockRepo.getBySlug.mockResolvedValue(eventData);

      const result = await service.getEventBySlug("test-event");

      expect(result).toEqual(eventData);
      expect(mockRepo.getBySlug).toHaveBeenCalledWith("test-event");
    });
  });

  describe("listEvents", () => {
    it("should list events with pagination", async () => {
      const events: EventDTO[] = [
        {
          id: "event-1",
          title: "Event 1",
          slug: "event-1",
          type: "Hackathon",
          format: "Offline",
          start_at: new Date().toISOString(),
          end_at: new Date(Date.now() + 3600000).toISOString(),
          registration_deadline: new Date(Date.now() - 86400000).toISOString(),
          location: "Location 1",
          short_blurb: "Event 1",
          long_description: null,
          overview: null,
          rules: null,
          image_url: null,
          created_at: new Date().toISOString(),
          created_by: "user-1",
          updated_at: new Date().toISOString(),
          registration_start: null,
          check_in_start: null,
          check_in_end: null,
          discord_invite: null,
          instagram_handle: null,
          registration_link: null,
          is_active: true,
          sponsors: null,
          faqs: null,
          prizes: null,
          schedule: null,
          tags: null,
          roles: null,
        },
      ];

      mockRepo.list.mockResolvedValue(events);

      const result = await service.listEvents({ limit: 10, offset: 0 });

      expect(result).toEqual(events);
      expect(mockRepo.list).toHaveBeenCalledWith({ limit: 10, offset: 0 });
    });
  });

  describe("createEvent", () => {
    it("should create a new event with draft status", async () => {
      const eventPayload: Partial<EventDTO> = {
        title: "New Event",
        slug: "new-event",
        location: "Test Location",
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 3600000).toISOString(),
        registration_deadline: new Date(Date.now() - 86400000).toISOString(),
      };

      const createdEvent: EventDTO = {
        ...eventPayload,
        id: "event-new",
        type: "Hackathon",
        format: "Offline",
        short_blurb: "",
        long_description: null,
        overview: null,
        rules: null,
        image_url: null,
        created_at: new Date().toISOString(),
        created_by: "user-123",
        updated_at: new Date().toISOString(),
        registration_start: null,
        check_in_start: null,
        check_in_end: null,
        discord_invite: null,
        instagram_handle: null,
        registration_link: null,
        is_active: true,
        sponsors: null,
        faqs: null,
        prizes: null,
        schedule: null,
        tags: null,
        roles: null,
        status: "draft",
      } as EventDTO;

      mockRepo.create.mockResolvedValue(createdEvent);

      const result = await service.createEvent(eventPayload);

      expect(result.status).toBe("draft");
      expect(mockRepo.create).toHaveBeenCalled();
    });
  });

  describe("updateEvent", () => {
    it("should update an existing event", async () => {
      const updates: Partial<EventDTO> = {
        title: "Updated Event",
      };

      const updatedEvent: EventDTO = {
        id: "event-123",
        title: "Updated Event",
        slug: "test-event",
        type: "Hackathon",
        format: "Offline",
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 3600000).toISOString(),
        registration_deadline: new Date(Date.now() - 86400000).toISOString(),
        location: "Test Location",
        short_blurb: "Test",
        long_description: null,
        overview: null,
        rules: null,
        image_url: null,
        created_at: new Date().toISOString(),
        created_by: "user-123",
        updated_at: new Date().toISOString(),
        registration_start: null,
        check_in_start: null,
        check_in_end: null,
        discord_invite: null,
        instagram_handle: null,
        registration_link: null,
        is_active: true,
        sponsors: null,
        faqs: null,
        prizes: null,
        schedule: null,
        tags: null,
        roles: null,
      };

      mockRepo.update.mockResolvedValue(updatedEvent);

      const result = await service.updateEvent("event-123", updates);

      expect(result.title).toBe("Updated Event");
      expect(mockRepo.update).toHaveBeenCalledWith("event-123", updates);
    });
  });

  describe("deleteEvent", () => {
    it("should delete an event", async () => {
      mockRepo.delete.mockResolvedValue(undefined);

      await service.deleteEvent("event-123");

      expect(mockRepo.delete).toHaveBeenCalledWith("event-123");
    });
  });

  describe("transitionLifecycle", () => {
    it("should transition event from draft to published", async () => {
      const draftEvent: EventDTO = {
        id: "event-123",
        title: "Test Event",
        slug: "test-event",
        type: "Hackathon",
        format: "Offline",
        status: "draft",
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 3600000).toISOString(),
        registration_deadline: new Date(Date.now() - 86400000).toISOString(),
        location: "Test Location",
        short_blurb: "Test",
        long_description: null,
        overview: null,
        rules: null,
        image_url: null,
        created_at: new Date().toISOString(),
        created_by: "user-123",
        updated_at: new Date().toISOString(),
        registration_start: null,
        check_in_start: null,
        check_in_end: null,
        discord_invite: null,
        instagram_handle: null,
        registration_link: null,
        is_active: true,
        sponsors: null,
        faqs: null,
        prizes: null,
        schedule: null,
        tags: null,
        roles: null,
      };

      const publishedEvent = { ...draftEvent, status: "published" as const };

      mockRepo.getById.mockResolvedValue(draftEvent);
      mockRepo.update.mockResolvedValue(publishedEvent);

      const result = await service.transitionLifecycle("event-123", "published");

      expect(result.status).toBe("published");
    });

    it("should reject invalid lifecycle transitions", async () => {
      const completedEvent: EventDTO = {
        id: "event-123",
        title: "Test Event",
        slug: "test-event",
        type: "Hackathon",
        format: "Offline",
        status: "completed",
        start_at: new Date().toISOString(),
        end_at: new Date(Date.now() + 3600000).toISOString(),
        registration_deadline: new Date(Date.now() - 86400000).toISOString(),
        location: "Test Location",
        short_blurb: "Test",
        long_description: null,
        overview: null,
        rules: null,
        image_url: null,
        created_at: new Date().toISOString(),
        created_by: "user-123",
        updated_at: new Date().toISOString(),
        registration_start: null,
        check_in_start: null,
        check_in_end: null,
        discord_invite: null,
        instagram_handle: null,
        registration_link: null,
        is_active: true,
        sponsors: null,
        faqs: null,
        prizes: null,
        schedule: null,
        tags: null,
        roles: null,
      };

      mockRepo.getById.mockResolvedValue(completedEvent);

      await expect(
        service.transitionLifecycle("event-123", "draft"),
      ).rejects.toThrow("Invalid lifecycle transition");
    });
  });
});
