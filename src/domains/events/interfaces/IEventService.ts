import type { EventDTO, EventLifecycle } from "../dtos/event.dto";

export interface IEventService {
  getEventBySlug(slug: string): Promise<EventDTO | null>;
  getEvent(id: string): Promise<EventDTO | null>;
  listEvents(opts?: { limit?: number; offset?: number }): Promise<EventDTO[]>;
  createEvent(payload: Partial<EventDTO>): Promise<EventDTO>;
  updateEvent(id: string, payload: Partial<EventDTO>): Promise<EventDTO>;
  deleteEvent(id: string): Promise<void>;
  transitionLifecycle(id: string, to: EventLifecycle): Promise<EventDTO>;
}
