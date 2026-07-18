/**
 * API Route: GET /api/tickets/my
 * Lists every active ticket belonging to the authenticated user, across
 * all events — powers the "access tickets from Repdox dashboard"
 * requirement.
 *
 * Security: requires authentication; only ever returns the caller's own
 * tickets (matched via event_registrations.user_id, never a client-
 * supplied user id).
 *
 * Response: { tickets: TicketWithContext[] }
 */
import { getSupabaseAdmin, requireAuth } from "../_utils.js";

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

    const { data: registrations, error: regError } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("user_id", userId);

    if (regError) {
      return res.status(500).json({ error: "Failed to load registrations" });
    }

    const registrationIds = (registrations ?? []).map((r) => r.id);
    if (registrationIds.length === 0) {
      return res.status(200).json({ tickets: [] });
    }

    const { data, error } = await supabase
      .from("tickets")
      .select(
        "*, events(title, start_at, location, image_url, format), event_registrations(name, team_id)",
      )
      .in("registration_id", registrationIds)
      .neq("status", "CANCELLED")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: "Failed to load tickets" });
    }

    const tickets = (data ?? []).map((row: any) => ({
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
      event_start_at: row.events?.start_at ?? "",
      event_location: row.events?.location ?? "",
      event_image_url: row.events?.image_url ?? null,
      participant_name: row.event_registrations?.name ?? "",
      team_name: row.event_registrations?.team_id ?? null,
    }));

    return res.status(200).json({ tickets });
  } catch (err: any) {
    console.error("List my tickets error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
