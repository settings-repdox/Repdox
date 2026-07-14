import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { IEventRepository } from "../interfaces/IEventRepository";
import type { EventDTO } from "../dtos/event.dto";

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
        dto as Partial<Database["public"]["Tables"]["events"]["Insert"]>,
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
}
