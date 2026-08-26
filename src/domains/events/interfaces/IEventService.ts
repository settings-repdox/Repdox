import type {
  EventDTO,
  EventLifecycle,
  EventScheduleDTO,
  EventTeamDTO,
} from "../dtos/event.dto";

export interface IEventService {
  getEventBySlug(slug: string): Promise<EventDTO | null>;
  getEvent(id: string): Promise<EventDTO | null>;
  listEvents(opts?: {
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
    createdBy?: string;
  }): Promise<EventDTO[]>;
  createEvent(payload: Partial<EventDTO>): Promise<EventDTO>;
  updateEvent(id: string, payload: Partial<EventDTO>): Promise<EventDTO>;
  deleteEvent(id: string): Promise<void>;
  transitionLifecycle(id: string, to: EventLifecycle): Promise<EventDTO>;
  listSchedules(eventId: string): Promise<EventScheduleDTO[]>;
  listTeams(eventId: string): Promise<EventTeamDTO[]>;
  getTeamById(teamId: string): Promise<EventTeamDTO | null>;
  findTeamByName(eventId: string, name: string): Promise<EventTeamDTO | null>;
  createTeam(payload: {
    eventId: string;
    name: string;
    maxMembers?: number | null;
  }): Promise<EventTeamDTO>;
  deleteTeam(teamId: string): Promise<void>;
}
