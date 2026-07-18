/**
 * API Route: POST /api/tickets/reissue
 * Cancels the existing ticket and issues a brand-new one (new code/token)
 * for the same registration — requirement 8's "Reissue tickets" (e.g. a
 * participant lost their original ticket email/link).
 *
 * Security: staff-only.
 *
 * Request body: { ticket_id: uuid }
 * Response: { ticket: TicketDTO }  (the NEW ticket)
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

    const { ticket_id } = req.body ?? {};
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

    const { data, error } = await supabase.rpc("reissue_ticket", {
      p_ticket_id: ticket_id,
      p_reissued_by: userId,
    });

    if (error) {
      return res.status(400).json({ error: error.message, code: "reissue_failed" });
    }

    return res.status(200).json({ ticket: data });
  } catch (err: any) {
    console.error("Reissue ticket error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
