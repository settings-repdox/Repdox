/**
 * API Route: GET /api/tickets/stats?event_id=<uuid>
 * Live attendance statistics for the admin dashboard (requirement 8):
 * registered / tickets issued / checked in / remaining / recent scans.
 *
 * Security: staff-only.
 *
 * Response: { stats: AttendanceStats }
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
    if (!eventId) {
      return res.status(400).json({ error: "event_id is required", code: "invalid_input" });
    }

    const authorized = await isAuthorizedTicketStaff(supabase, userId, eventId);
    if (!authorized) {
      return res.status(403).json({ error: "Not authorized for this event", code: "forbidden" });
    }

    const { data, error } = await supabase.rpc("get_attendance_stats", { p_event_id: eventId });
    if (error) {
      return res.status(500).json({ error: "Failed to load stats" });
    }

    return res.status(200).json({ stats: data });
  } catch (err: any) {
    console.error("Stats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
