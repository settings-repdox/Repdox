/**
 * API Route: POST /api/tickets/staff — grant scanner access
 * API Route: DELETE /api/tickets/staff — revoke scanner access
 * Lets an organiser hand check-in duty to volunteers (requirement 5's
 * "Only authorised staff may access it") without making them a co-owner
 * of the event.
 *
 * Security: event owner or global admin only.
 *
 * POST body: { event_id: uuid, user_id: uuid, role?: 'organizer'|'volunteer'|'staff' }
 * DELETE body: { event_id: uuid, user_id: uuid }
 */
import { getSupabaseAdmin, requireAuth } from "../_utils.js";
import { isGlobalAdmin } from "./_utils.js";

const supabase = getSupabaseAdmin();

export default async function handler(req: any, res: any) {
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = await requireAuth(req.headers);
    if (!userId) {
      return res.status(401).json({ error: "Missing or invalid authorization" });
    }

    const { event_id, user_id, role } = req.body ?? {};
    if (!event_id || !user_id) {
      return res.status(400).json({ error: "event_id and user_id are required", code: "invalid_input" });
    }

    const { data: event } = await supabase
      .from("events")
      .select("created_by")
      .eq("id", event_id)
      .maybeSingle();
    if (!event) {
      return res.status(404).json({ error: "Event not found", code: "not_found" });
    }

    const isOwner = event.created_by === userId;
    if (!isOwner && !(await isGlobalAdmin(supabase, userId))) {
      return res.status(403).json({ error: "Only the event owner can manage scanner staff", code: "forbidden" });
    }

    if (req.method === "DELETE") {
      const { error } = await supabase
        .from("event_staff")
        .delete()
        .eq("event_id", event_id)
        .eq("user_id", user_id);
      if (error) return res.status(500).json({ error: "Failed to revoke access" });
      return res.status(200).json({ revoked: true });
    }

    const grantRole = ["organizer", "volunteer", "staff"].includes(role) ? role : "volunteer";
    const { data, error } = await supabase
      .from("event_staff")
      .upsert(
        { event_id, user_id, role: grantRole, granted_by: userId },
        { onConflict: "event_id,user_id" },
      )
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: "Failed to grant access" });
    }

    return res.status(200).json({ grant: data });
  } catch (err: any) {
    console.error("Staff access error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
