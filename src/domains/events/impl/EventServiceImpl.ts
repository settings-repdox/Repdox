import type { IEventService } from "../interfaces/IEventService";
import type {
  EventDTO,
  EventLifecycle,
  EventScheduleDTO,
  EventTeamDTO,
} from "../dtos/event.dto";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["published", "cancelled"],
  published: ["registration_open", "in_progress", "cancelled"],
  registration_open: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export class EventServiceImpl implements IEventService {
  private repo?: any;

  constructor(repo?: any) {
    // Accept injected repo for testing; otherwise lazily import Supabase repository
    if (repo) this.repo = repo;
  }

  private async getRepo(): Promise<any> {
    if (!this.repo) {
      const mod = await import("./SupabaseEventRepository");
      this.repo = new mod.SupabaseEventRepository();
    }
    return this.repo;
  }

  async getEvent(id: string): Promise<EventDTO | null> {
    const repo = await this.getRepo();
    return repo.getById(id);
  }

  async getEventBySlug(slug: string): Promise<EventDTO | null> {
    const repo = await this.getRepo();
    return repo.getBySlug(slug);
  }

  async listEvents(opts?: {
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
    createdBy?: string;
  }): Promise<EventDTO[]> {
    const repo = await this.getRepo();
    return repo.list(opts);
  }

  async createEvent(payload: Partial<EventDTO>): Promise<EventDTO> {
    const toInsert: Partial<EventDTO> = {
      ...payload,
      status: payload.status || "draft",
    };
    const repo = await this.getRepo();
    return repo.create(toInsert);
  }

  async updateEvent(id: string, payload: Partial<EventDTO>): Promise<EventDTO> {
    const repo = await this.getRepo();
    return repo.update(id, payload);
  }

  async deleteEvent(id: string): Promise<void> {
    const repo = await this.getRepo();
    return repo.delete(id);
  }

  async transitionLifecycle(id: string, to: EventLifecycle): Promise<EventDTO> {
    const repo = await this.getRepo();
    const current = await repo.getById(id);
    if (!current) throw new Error("Event not found");
    const from = (current.status as string) || "draft";
    const allowed = ALLOWED_TRANSITIONS[from] || [];
    if (!allowed.includes(to) && from !== to) {
      throw new Error(`Invalid lifecycle transition from ${from} to ${to}`);
    }
    return repo.update(id, { status: to } as Partial<EventDTO>);
  }

  async listSchedules(eventId: string): Promise<EventScheduleDTO[]> {
    const repo = await this.getRepo();
    return repo.listSchedulesByEventId(eventId);
  }

  async listTeams(eventId: string): Promise<EventTeamDTO[]> {
    const repo = await this.getRepo();
    return repo.listTeamsByEventId(eventId);
  }

  async findTeamByName(
    eventId: string,
    name: string,
  ): Promise<EventTeamDTO | null> {
    const repo = await this.getRepo();
    return repo.findTeamByName(eventId, name);
  }

  async getTeamById(teamId: string): Promise<EventTeamDTO | null> {
    const repo = await this.getRepo();
    return repo.getTeamById(teamId);
  }

  async createTeam(payload: {
    eventId: string;
    name: string;
    maxMembers?: number | null;
  }): Promise<EventTeamDTO> {
    const repo = await this.getRepo();
    return repo.createTeam(payload);
  }

  async deleteTeam(teamId: string): Promise<void> {
    const repo = await this.getRepo();
    return repo.deleteTeam(teamId);
  }
}
