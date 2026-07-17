import { supabase } from "@/integrations/supabase/client";
import type {
  TicketDTO,
  TicketWithContext,
  CheckInRequest,
  CheckInResult,
  AttendanceStats,
  TicketSearchQuery,
  OfflineManifestEntry,
  EventStaffGrant,
  EventStaffRole,
  ScanResult,
} from "../dtos/ticket.dto";
import type { ITicketRepository } from "../interfaces/ITicketRepository";

// Loose shapes for raw Supabase rows / RPC jsonb payloads — not full
// Database["public"]["Tables"] types because these come from joined
// selects (e.g. "*, events(...), event_registrations(...)") whose shape
// the generated types don't model, and because check_in_ticket()'s return
// is a hand-built jsonb object (see the migration) rather than a table
// row. `unknown`-typed fields plus optional chaining below still get real
// type-checking on everything this file actually accesses, without
// pretending to a precision the raw data doesn't have.
interface RawTicketRow {
  id: string;
  event_id: string;
  registration_id: string;
  ticket_code: string;
  qr_token: string;
  status: TicketDTO["status"];
  ticket_type: TicketDTO["ticket_type"];
  gaming_meta?: TicketDTO["gaming_meta"];
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_reason?: string | null;
  reissued_from?: string | null;
  created_at: string;
  updated_at: string;
  events?: { title?: string; start_at?: string; location?: string; image_url?: string | null; format?: string | null };
  event_registrations?: { name?: string; team_id?: string | null };
}

interface RawCheckInResponse {
  result?: string;
  ticket?: RawTicketRow;
  participant_name?: string;
  team_name?: string | null;
  previous_check_in_at?: string | null;
  previous_scanned_by_name?: string | null;
  replay?: boolean;
}

interface RawRecentScanRow {
  id: string;
  result: string;
  scanned_at: string;
  gate?: string | null;
  device_id?: string | null;
  ticket_code?: string | null;
  participant_name?: string | null;
}

interface RawStatsResponse {
  registered?: number;
  tickets_issued?: number;
  checked_in?: number;
  cancelled?: number;
  remaining?: number;
  recent_scans?: RawRecentScanRow[];
}

interface RawManifestRow {
  qr_token: string;
  ticket_code: string;
  status: TicketDTO["status"];
  ticket_type: TicketDTO["ticket_type"];
  gaming_meta?: TicketDTO["gaming_meta"];
  event_registrations?: { name?: string; team_id?: string | null };
}

interface RawEventStaffRow {
  id: string;
  event_id: string;
  user_id: string;
  role: EventStaffRole;
  granted_by: string | null;
  created_at: string;
}

// Maps the raw jsonb payload returned by check_in_ticket() (see
// supabase/migrations/202607160002_ticketing_rpc_functions.sql) into the
// domain's CheckInResult shape.
function mapCheckInResponse(raw: RawCheckInResponse): CheckInResult {
  const ticket = raw?.ticket ? mapTicketRow(raw.ticket) : null;
  return {
    result: raw?.result as ScanResult,
    ticket,
    participantName: raw?.participant_name ?? undefined,
    teamName: raw?.team_name ?? null,
    ticketType: ticket?.ticket_type,
    gamingMeta: ticket?.gaming_meta ?? null,
    previousCheckInAt: raw?.previous_check_in_at ?? null,
    previousScannedByName: raw?.previous_scanned_by_name ?? null,
    replay: raw?.replay === true,
  };
}

function mapTicketRow(row: RawTicketRow): TicketDTO {
  return {
    id: row.id,
    event_id: row.event_id,
    registration_id: row.registration_id,
    ticket_code: row.ticket_code,
    qr_token: row.qr_token,
    status: row.status,
    ticket_type: row.ticket_type,
    gaming_meta: row.gaming_meta ?? null,
    checked_in_at: row.checked_in_at ?? null,
    checked_in_by: row.checked_in_by ?? null,
    cancelled_at: row.cancelled_at ?? null,
    cancelled_by: row.cancelled_by ?? null,
    cancelled_reason: row.cancelled_reason ?? null,
    reissued_from: row.reissued_from ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class SupabaseTicketRepository implements ITicketRepository {
  async generateForRegistration(registrationId: string): Promise<TicketDTO> {
    const { data, error } = await supabase.rpc("generate_ticket_for_registration", {
      p_registration_id: registrationId,
    });
    if (error) throw error;
    return mapTicketRow(data);
  }

  async checkIn(request: CheckInRequest): Promise<CheckInResult> {
    const { data, error } = await supabase.rpc("check_in_ticket", {
      p_qr_token: request.qrToken,
      p_event_id: request.eventId,
      p_scanned_by: request.scannedBy,
      p_client_scan_id: request.clientScanId,
      p_device_id: request.deviceId ?? null,
      p_gate: request.gate ?? null,
      p_offline: request.offline ?? false,
      p_scanned_at: request.scannedAt ?? new Date().toISOString(),
    });
    if (error) throw error;
    return mapCheckInResponse(data);
  }

  async cancel(ticketId: string, cancelledBy: string, reason?: string): Promise<TicketDTO> {
    const { data, error } = await supabase.rpc("cancel_ticket", {
      p_ticket_id: ticketId,
      p_cancelled_by: cancelledBy,
      p_reason: reason ?? null,
    });
    if (error) throw error;
    return mapTicketRow(data);
  }

  async reissue(ticketId: string, reissuedBy: string): Promise<TicketDTO> {
    const { data, error } = await supabase.rpc("reissue_ticket", {
      p_ticket_id: ticketId,
      p_reissued_by: reissuedBy,
    });
    if (error) throw error;
    return mapTicketRow(data);
  }

  async getByToken(token: string): Promise<TicketWithContext | null> {
    const { data, error } = await supabase
      .from("tickets")
      .select(
        "*, events(title, start_at, location, image_url, format), event_registrations(name, team_id)",
      )
      .eq("qr_token", token)
      .maybeSingle();
    if (error || !data) return null;
    return this.mapWithContext(data);
  }

  async getById(id: string): Promise<TicketDTO | null> {
    const { data, error } = await supabase.from("tickets").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return mapTicketRow(data);
  }

  async getByRegistrationId(registrationId: string): Promise<TicketDTO | null> {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("registration_id", registrationId)
      .neq("status", "CANCELLED")
      .maybeSingle();
    if (error || !data) return null;
    return mapTicketRow(data);
  }

  async listActiveByEvent(eventId: string): Promise<TicketDTO[]> {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .eq("event_id", eventId)
      .neq("status", "CANCELLED");
    if (error || !data) return [];
    return data.map(mapTicketRow);
  }

  async search(query: TicketSearchQuery): Promise<TicketWithContext[]> {
    const resultLimit = query.limit ?? 50;
    // When filtering by a free-text query, name/code matching happens
    // client-side below (PostgREST can't cleanly OR-match across a joined
    // relation), so fetch a wider page before filtering rather than
    // limiting at the database and then filtering down to fewer results.
    const fetchLimit = query.query && query.query.trim() ? Math.max(resultLimit * 10, 500) : resultLimit;

    let q = supabase
      .from("tickets")
      .select(
        "*, events(title, start_at, location, image_url, format), event_registrations!inner(name, team_id)",
      )
      .eq("event_id", query.eventId)
      .limit(fetchLimit);

    if (query.status) {
      q = q.eq("status", query.status);
    }

    const { data, error } = await q;
    if (error || !data) return [];

    let results = data.map((row: RawTicketRow) => this.mapWithContext(row));

    if (query.query && query.query.trim()) {
      const term = query.query.trim().toLowerCase();
      results = results.filter(
        (t) =>
          t.ticket_code.toLowerCase().includes(term) ||
          t.participant_name?.toLowerCase().includes(term),
      );
    }

    return results.slice(0, resultLimit);
  }

  async getStats(eventId: string): Promise<AttendanceStats> {
    const { data, error } = await supabase.rpc("get_attendance_stats", { p_event_id: eventId });
    if (error) throw error;
    const raw = data as RawStatsResponse;
    return {
      registered: raw?.registered ?? 0,
      ticketsIssued: raw?.tickets_issued ?? 0,
      checkedIn: raw?.checked_in ?? 0,
      cancelled: raw?.cancelled ?? 0,
      remaining: raw?.remaining ?? 0,
      recentScans: (raw?.recent_scans ?? []).map((s: RawRecentScanRow) => ({
        id: s.id,
        result: s.result,
        scannedAt: s.scanned_at,
        gate: s.gate ?? null,
        deviceId: s.device_id ?? null,
        ticketCode: s.ticket_code ?? null,
        participantName: s.participant_name ?? null,
      })),
    };
  }

  async getOfflineManifestEntries(eventId: string): Promise<OfflineManifestEntry[]> {
    const { data, error } = await supabase
      .from("tickets")
      .select("qr_token, ticket_code, status, ticket_type, gaming_meta, event_registrations(name, team_id)")
      .eq("event_id", eventId)
      .neq("status", "CANCELLED");
    if (error || !data) return [];
    return data.map((row: RawManifestRow) => ({
      qrToken: row.qr_token,
      ticketCode: row.ticket_code,
      status: row.status,
      ticketType: row.ticket_type,
      participantName: row.event_registrations?.name ?? "",
      teamName: row.event_registrations?.team_id ?? null,
      gamingMeta: row.gaming_meta ?? null,
    }));
  }

  async getEvent(
    eventId: string,
  ): Promise<{ id: string; createdBy: string | null; title: string; gates: string[] } | null> {
    const { data, error } = await supabase
      .from("events")
      .select("id, created_by, title, ticket_gates")
      .eq("id", eventId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      createdBy: data.created_by,
      title: data.title,
      gates: data.ticket_gates ?? [],
    };
  }

  async listConfirmedRegistrationIds(eventId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", eventId)
      .in("status", ["confirmed", "registered"]);
    if (error || !data) return [];
    return data.map((r: { id: string }) => r.id);
  }

  async isEventOwner(userId: string, eventId: string): Promise<boolean> {
    const event = await this.getEvent(eventId);
    return !!event && event.createdBy === userId;
  }

  async listEventStaff(eventId: string): Promise<EventStaffGrant[]> {
    const { data, error } = await supabase.from("event_staff").select("*").eq("event_id", eventId);
    if (error || !data) return [];
    return data.map((r: RawEventStaffRow) => ({
      id: r.id,
      eventId: r.event_id,
      userId: r.user_id,
      role: r.role,
      grantedBy: r.granted_by,
      createdAt: r.created_at,
    }));
  }

  async isEventStaff(userId: string, eventId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("event_staff")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle();
    return !error && !!data;
  }

  async grantStaffAccess(
    eventId: string,
    userId: string,
    role: EventStaffRole,
    grantedBy: string,
  ): Promise<EventStaffGrant> {
    const { data, error } = await supabase
      .from("event_staff")
      .upsert(
        { event_id: eventId, user_id: userId, role, granted_by: grantedBy },
        { onConflict: "event_id,user_id" },
      )
      .select()
      .single();
    if (error || !data) throw error || new Error("Failed to grant staff access");
    return {
      id: data.id,
      eventId: data.event_id,
      userId: data.user_id,
      role: data.role,
      grantedBy: data.granted_by,
      createdAt: data.created_at,
    };
  }

  async revokeStaffAccess(eventId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("event_staff")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  private mapWithContext(row: RawTicketRow): TicketWithContext {
    const base = mapTicketRow(row);
    const event = row.events ?? {};
    const registration = row.event_registrations ?? {};
    return {
      ...base,
      event_title: event.title ?? "",
      event_start_at: event.start_at ?? "",
      event_location: event.location ?? "",
      event_image_url: event.image_url ?? null,
      event_format: event.format ?? null,
      participant_name: registration.name ?? "",
      team_name: registration.team_id ?? null,
    };
  }
}
