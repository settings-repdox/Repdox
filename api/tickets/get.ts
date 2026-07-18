/**
 * API Route: GET /api/tickets/get?token=<qr_token>
 * Resolves a ticket by its QR token — this is what the QR code and the
 * permanent /ticket/:token URL point at (requirement 2/3/4).
 *
 * Security:
 * - The token itself is long (256-bit) random and unguessable, so a valid
 *   token is treated as sufficient to view that one ticket — the same
 *   trust model as a boarding pass link or a calendar invite link. No
 *   personal information is ever embedded in the token itself (it's a
 *   random string, not derived from or encoding any PII) — see the schema
 *   migration's design notes.
 * - This route deliberately does NOT require authentication, so the
 *   ticket page works from a freshly-scanned QR code or an emailed link
 *   without forcing a login. A logged-in participant's own tickets are
 *   also reachable via GET /api/tickets/my (requires auth), for the
 *   "access from dashboard" requirement.
 *
 * Response:
 * { ticket: TicketWithContext } or { error: string, code: 'not_found' }
 */
import { getSupabaseAdmin } from "../_utils.js";

const supabase = getSupabaseAdmin();

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
    if (!token || token.length < 16) {
      return res.status(400).json({ error: "Missing or malformed token", code: "invalid_token" });
    }

    const { data, error } = await supabase
      .from("tickets")
      .select(
        "*, events(title, start_at, location, image_url, format), event_registrations(name, team_id, created_at)",
      )
      .eq("qr_token", token)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ error: "Ticket not found", code: "not_found" });
    }

    const event = (data as any).events ?? {};
    const registration = (data as any).event_registrations ?? {};

    return res.status(200).json({
      ticket: {
        id: data.id,
        event_id: data.event_id,
        registration_id: data.registration_id,
        ticket_code: data.ticket_code,
        qr_token: data.qr_token,
        status: data.status,
        ticket_type: data.ticket_type,
        gaming_meta: data.gaming_meta,
        checked_in_at: data.checked_in_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
        event_title: event.title ?? "",
        event_start_at: event.start_at ?? "",
        event_location: event.location ?? "",
        event_image_url: event.image_url ?? null,
        event_format: event.format ?? null,
        participant_name: registration.name ?? "",
        team_name: registration.team_id ?? null,
        registered_at: registration.created_at ?? data.created_at,
      },
    });
  } catch (err: any) {
    console.error("Get ticket error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
