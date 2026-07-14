import type { EventDTO } from "../../../shared/dtos/event.dto";
import type { PaginatedResponse } from "../../../shared/interfaces/api";

export interface IEventService {
  getEventDetails(eventId: string): Promise<EventDTO | null>;
  listEvents(
    page?: number,
    perPage?: number,
  ): Promise<PaginatedResponse<EventDTO>>;
}
