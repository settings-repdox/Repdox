import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { IEventRepository } from "../interfaces/IEventRepository";
import type { EventDTO, EventScheduleDTO, EventTeamDTO } from "../dtos/event.dto";

export class SupabaseEventRepository implements IEventRepository {
  async getById(id: string): Promise<EventDTO | null> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return data as EventDTO;
  }

  async getBySlug(slug: string): Promise<EventDTO | null> {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error || !data) return null;
    return data as EventDTO;
  }

  async list(
    opts?: { limit?: number; offset?: number } | undefined,
  ): Promise<EventDTO[]> {
    const q = supabase.from("events").select("*");
    if (opts?.limit) q.limit(opts.limit);
    if (opts?.offset)
      q.range(opts.offset, (opts.offset || 0) + (opts.limit || 100) - 1);
    const { data, error } = await q;
    if (error || !data) return [];
    return data as EventDTO[];
  }

  async create(dto: Partial<EventDTO>): Promise<EventDTO> {
    const { data, error } = await supabase
      .from("events")
      .insert([
        dto as unknown as Database["public"]["Tables"]["events"]["Insert"],
      ])
      .select()
      .single();
    if (error || !data) throw error || new Error("Insert failed");
    return data as EventDTO;
  }

  async update(id: string, dto: Partial<EventDTO>): Promise<EventDTO> {
    const { data, error } = await supabase
      .from("events")
      .update(dto as Partial<Database["public"]["Tables"]["events"]["Update"]>)
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw error || new Error("Update failed");
    return data as EventDTO;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw error;
  }

  async listSchedulesByEventId(eventId: string): Promise<EventScheduleDTO[]> {
    const { data, error } = await supabase
      .from("event_schedules")
      .select("*")
      .eq("event_id", eventId)
      .order("start_at", { ascending: true });
    if (error || !data) return [];
    return data.map((s) => ({
      id: s.id,
      eventId: s.event_id,
      title: s.title,
      description: s.description,
      startAt: s.start_at,
    }));
  }

  async listTeamsByEventId(eventId: string): Promise<EventTeamDTO[]> {
    const { data, error } = await supabase
      .from("event_teams")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data.map((t) => ({
      id: t.id,
      eventId: t.event_id,
      name: t.name,
      description: t.description,
      contactEmail: t.contact_email,
      maxMembers: t.max_members,
    }));
  }

  async findTeamByName(
    eventId: string,
    name: string,
  ): Promise<EventTeamDTO | null> {
    const { data, error } = await supabase
      .from("event_teams")
      .select("*")
      .eq("event_id", eventId)
      .ilike("name", name)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      eventId: data.event_id,
      name: data.name,
      description: data.description,
      contactEmail: data.contact_email,
      maxMembers: data.max_members,
    };
  }

  async getTeamById(teamId: string): Promise<EventTeamDTO | null> {
    const { data, error } = await supabase
      .from("event_teams")
      .select("*")
      .eq("id", teamId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      eventId: data.event_id,
      name: data.name,
      description: data.description,
      contactEmail: data.contact_email,
      maxMembers: data.max_members,
    };
  }

  async createTeam(payload: {
    eventId: string;
    name: string;
    maxMembers?: number | null;
  }): Promise<EventTeamDTO> {
    const { data, error } = await supabase
      .from("event_teams")
      .insert([
        {
          event_id: payload.eventId,
          name: payload.name,
          max_members: payload.maxMembers ?? null,
        },
      ])
      .select()
      .single();
    if (error || !data) throw error || new Error("Team creation failed");
    return {
      id: data.id,
      eventId: data.event_id,
      name: data.name,
      description: data.description,
      contactEmail: data.contact_email,
      maxMembers: data.max_members,
    };
  }

  async deleteTeam(teamId: string): Promise<void> {
    const { error } = await supabase
      .from("event_teams")
      .delete()
      .eq("id", teamId);
    if (error) throw error;
  }
}
