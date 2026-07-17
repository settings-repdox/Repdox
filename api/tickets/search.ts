/**
 * API Route: GET /api/tickets/search?event_id=<uuid>&q=<query>&status=<status>
 * Powers the admin dashboard's participant/ticket-number search
 * (requirement 8).
 *
 * Security: staff-only.
 *
 * Response: { tickets: TicketWithContext[] }
 */
import { getSupabaseAdmin, requireAuth } from "../_utils";
import { isAuthorizedTicketStaff } from "./_utils";

const supabase = getSupabaseAdmin();

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = await requireAuth(req.headers);
    if (!userId) {
      return res.status(401).json({ error: "Missing or invalid authorization" });
    }

    const eventId = typeof req.query.event_id === "string" ? req.query.event_id : "";
    const searchTerm = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    if (!eventId) {
      return res.status(400).json({ error: "event_id is required", code: "invalid_input" });
    }

    const authorized = await isAuthorizedTicketStaff(supabase, userId, eventId);
    if (!authorized) {
      return res.status(403).json({ error: "Not authorized for this event", code: "forbidden" });
    }

    let query = supabase
      .from("tickets")
      .select(
        "*, events(title, start_at, location, image_url, format), event_registrations!inner(name, team_id)",
      )
      .eq("event_id", eventId)
      .limit(searchTerm ? 500 : 50);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: "Search failed" });
    }

    let tickets = (data ?? []).map((row: any) => ({
      id: row.id,
      event_id: row.event_id,
      registration_id: row.registration_id,
      ticket_code: row.ticket_code,
      qr_token: row.qr_token,
      status: row.status,
      ticket_type: row.ticket_type,
      gaming_meta: row.gaming_meta,
      checked_in_at: row.checked_in_at,
      created_at: row.created_at,
      event_title: row.events?.title ?? "",
      participant_name: row.event_registrations?.name ?? "",
      team_name: row.event_registrations?.team_id ?? null,
    }));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      tickets = tickets
        .filter(
          (t) =>
            t.ticket_code.toLowerCase().includes(term) ||
            t.participant_name?.toLowerCase().includes(term),
        )
        .slice(0, 50);
    }

    return res.status(200).json({ tickets });
  } catch (err: any) {
    console.error("Search tickets error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
