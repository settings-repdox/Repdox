// Re-export from centralized shared DTO (Phase 9 consolidation)
export type {
  EventDTO,
  EventType,
  EventLifecycle,
} from "@/shared/dtos/event.dto";

export interface EventScheduleDTO {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  startAt: string | null;
}

export interface EventTeamDTO {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  contactEmail: string | null;
  maxMembers: number | null;
}
