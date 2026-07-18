/**
 * API Route: POST /api/tickets/generate
 * Manually generates a ticket for a single registration. Idempotent — if
 * an active ticket already exists for the registration, returns it rather
 * than erroring. Most tickets are generated automatically by a database
 * trigger when a registration is confirmed (see
 * supabase/migrations/202607160002_ticketing_rpc_functions.sql); this
 * endpoint exists for staff to generate one on demand (e.g. a
 * registration whose status was set outside the normal flow).
 *
 * For bulk backfill across an entire event, use POST /api/tickets/enable
 * instead — it's more efficient than calling this once per registration.
 *
 * Security: staff-only.
 *
 * Request body: { registration_id: uuid }
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

    const { registration_id } = req.body ?? {};
    if (!registration_id) {
      return res.status(400).json({ error: "registration_id is required", code: "invalid_input" });
    }

    const { data: registration } = await supabase
      .from("event_registrations")
      .select("event_id")
      .eq("id", registration_id)
      .maybeSingle();
    if (!registration) {
      return res.status(404).json({ error: "Registration not found", code: "not_found" });
    }

    const authorized = await isAuthorizedTicketStaff(supabase, userId, registration.event_id);
    if (!authorized) {
      return res.status(403).json({ error: "Not authorized for this event", code: "forbidden" });
    }

    const { data, error } = await supabase.rpc("generate_ticket_for_registration", {
      p_registration_id: registration_id,
    });

    if (error) {
      const code = error.message?.includes("ticketing_not_enabled")
        ? "ticketing_not_enabled"
        : "generate_failed";
      return res.status(400).json({ error: error.message, code });
    }

    return res.status(200).json({ ticket: data });
  } catch (err: any) {
    console.error("Generate ticket error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
