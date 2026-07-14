import type { EventDTO } from "../dtos/event.dto";

export interface IEventRepository {
  getById(id: string): Promise<EventDTO | null>;
  getBySlug(slug: string): Promise<EventDTO | null>;
  list(
    opts?: { limit?: number; offset?: number } | undefined,
  ): Promise<EventDTO[]>;
  create(dto: Partial<EventDTO>): Promise<EventDTO>;
  update(id: string, dto: Partial<EventDTO>): Promise<EventDTO>;
  delete(id: string): Promise<void>;
}
