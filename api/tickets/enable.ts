/**
 * API Route: POST /api/tickets/enable
 * Turns ticketing on (or off) for an event (requirement 1), and — when
 * turning it on — backfills tickets for every existing confirmed
 * registration (since the database trigger that auto-generates tickets
 * only fires for registrations created/confirmed AFTER ticketing_enabled
 * is already true).
 *
 * Security: event owner or global admin only (not the broader event_staff
 * allowlist — enabling ticketing is an event-configuration change, not a
 * scanning duty, so it stays with ownership-level access).
 *
 * Request body: { event_id: uuid, enabled: boolean, gates?: string[] }
 * Response: { event_id, ticketing_enabled, backfilled_count }
 */
import { getSupabaseAdmin, requireAuth } from "../_utils.js";
import { isGlobalAdmin } from "./_utils.js";

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

    const { event_id, enabled, gates } = req.body ?? {};
    if (!event_id || typeof enabled !== "boolean") {
      return res.status(400).json({ error: "event_id and enabled are required", code: "invalid_input" });
    }

    const { data: event } = await supabase
      .from("events")
      .select("id, created_by")
      .eq("id", event_id)
      .maybeSingle();
    if (!event) {
      return res.status(404).json({ error: "Event not found", code: "not_found" });
    }

    const isOwner = event.created_by === userId;
    if (!isOwner && !(await isGlobalAdmin(supabase, userId))) {
      return res.status(403).json({ error: "Only the event owner can change ticketing settings", code: "forbidden" });
    }

    const updatePayload: Record<string, unknown> = { ticketing_enabled: enabled };
    if (Array.isArray(gates)) {
      updatePayload.ticket_gates = gates.filter((g: unknown) => typeof g === "string" && g.trim());
    }

    const { error: updateError } = await supabase.from("events").update(updatePayload).eq("id", event_id);
    if (updateError) {
      return res.status(500).json({ error: "Failed to update event" });
    }

    let backfilledCount = 0;
    if (enabled) {
      const { data: registrations } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", event_id)
        .in("status", ["confirmed", "registered"]);

      for (const registration of registrations ?? []) {
        const { error: genError } = await supabase.rpc("generate_ticket_for_registration", {
          p_registration_id: registration.id,
        });
        if (!genError) backfilledCount += 1;
      }
    }

    return res.status(200).json({
      event_id,
      ticketing_enabled: enabled,
      backfilled_count: backfilledCount,
    });
  } catch (err: any) {
    console.error("Enable ticketing error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
