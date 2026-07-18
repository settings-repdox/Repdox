/**
 * API Route: GET /api/tickets/validate?token=<qr_token>&event_id=<uuid>
 * A read-only check of what a token *would* resolve to — same result
 * shape as check-in (VALID/DUPLICATE/CANCELLED/INVALID/WRONG_EVENT) but
 * never mutates ticket state or writes a scan log row. Intended for a
 * "peek" UI (e.g. showing ticket details before a volunteer commits to
 * checking someone in) — the scanner's main flow calls
 * POST /api/tickets/checkin directly rather than validate-then-checkin,
 * since that would be two round-trips for one physical scan.
 *
 * Security: staff-only.
 *
 * Response: same shape as /api/tickets/checkin's response, minus any scan
 * log side effect.
 */
import { getSupabaseAdmin, requireAuth } from "../_utils.js";
import { isAuthorizedTicketStaff } from "./_utils.js";

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

    const token = typeof req.query.token === "string" ? req.query.token : "";
    const eventId = typeof req.query.event_id === "string" ? req.query.event_id : "";
    if (!token || !eventId) {
      return res.status(400).json({ error: "token and event_id are required", code: "invalid_input" });
    }

    const authorized = await isAuthorizedTicketStaff(supabase, userId, eventId);
    if (!authorized) {
      return res.status(403).json({ error: "Not authorized for this event", code: "forbidden" });
    }

    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("*, event_registrations(name, team_id)")
      .eq("qr_token", token)
      .maybeSingle();

    if (error || !ticket) {
      return res.status(200).json({ result: "INVALID" });
    }

    if (ticket.event_id !== eventId) {
      return res.status(200).json({ result: "WRONG_EVENT", ticket });
    }
    if (ticket.status === "CANCELLED") {
      return res.status(200).json({ result: "CANCELLED", ticket });
    }
    if (ticket.status === "USED") {
      return res.status(200).json({
        result: "DUPLICATE",
        ticket,
        previous_check_in_at: ticket.checked_in_at,
      });
    }

    return res.status(200).json({
      result: "VALID",
      ticket,
      participant_name: ticket.event_registrations?.name ?? "",
      team_name: ticket.event_registrations?.team_id ?? null,
    });
  } catch (err: any) {
    console.error("Validate ticket error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
