/**
 * API Route: POST /api/tickets/cancel
 * Revokes a ticket (requirement 8's "Revoke tickets"). A cancelled ticket
 * can never be checked in — see check_in_ticket()'s CANCELLED branch.
 *
 * Security: staff-only.
 *
 * Request body: { ticket_id: uuid, reason?: string }
 * Response: { ticket: TicketDTO }
 */
import { getSupabaseAdmin, requireAuth } from "../_utils.js";
import { isAuthorizedTicketStaff } from "./_utils.js";

const supabase = getSupabaseAdmin();

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = await requireAuth(req.headers);
    if (!userId) {
      return res.status(401).json({ error: "Missing or invalid authorization" });
    }

    const { ticket_id, reason } = req.body ?? {};
    if (!ticket_id) {
      return res.status(400).json({ error: "ticket_id is required", code: "invalid_input" });
    }

    const { data: ticket } = await supabase.from("tickets").select("event_id").eq("id", ticket_id).maybeSingle();
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found", code: "not_found" });
    }

    const authorized = await isAuthorizedTicketStaff(supabase, userId, ticket.event_id);
    if (!authorized) {
      return res.status(403).json({ error: "Not authorized for this event", code: "forbidden" });
    }

    const { data, error } = await supabase.rpc("cancel_ticket", {
      p_ticket_id: ticket_id,
      p_cancelled_by: userId,
      p_reason: reason ?? null,
    });

    if (error) {
      return res.status(400).json({ error: error.message, code: "cancel_failed" });
    }

    return res.status(200).json({ ticket: data });
  } catch (err: any) {
    console.error("Cancel ticket error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
