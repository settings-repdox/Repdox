import type { EventDTO, EventScheduleDTO, EventTeamDTO } from "../dtos/event.dto";

export interface IEventRepository {
  getById(id: string): Promise<EventDTO | null>;
  getBySlug(slug: string): Promise<EventDTO | null>;
  list(
    opts?:
      | {
          limit?: number;
          offset?: number;
          activeOnly?: boolean;
          createdBy?: string;
        }
      | undefined,
  ): Promise<EventDTO[]>;
  create(dto: Partial<EventDTO>): Promise<EventDTO>;
  update(id: string, dto: Partial<EventDTO>): Promise<EventDTO>;
  delete(id: string): Promise<void>;
  listSchedulesByEventId(eventId: string): Promise<EventScheduleDTO[]>;
  listTeamsByEventId(eventId: string): Promise<EventTeamDTO[]>;
  getTeamById(teamId: string): Promise<EventTeamDTO | null>;
  findTeamByName(
    eventId: string,
    name: string,
  ): Promise<EventTeamDTO | null>;
  createTeam(payload: {
    eventId: string;
    name: string;
    maxMembers?: number | null;
  }): Promise<EventTeamDTO>;
  deleteTeam(teamId: string): Promise<void>;
  existingEventIds(ids: string[]): Promise<string[]>;
  getTeamNamesByIds(teamIds: string[]): Promise<Record<string, string>>;
}
