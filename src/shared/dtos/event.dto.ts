// DTOs for events (Phase 2 foundation)

export interface EventDTO {
  id: string;
  title: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  venue?: string;
}
