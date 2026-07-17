/**
 * API Route: GET /api/tickets/manifest?event_id=<uuid>
 * The scanner PWA downloads this before an event begins and caches it in
 * IndexedDB (requirement 6) — every ticket's token/code/status/participant
 * name, so scanning can be validated locally when offline. Deliberately
 * excludes anything beyond what's needed to identify a person at the door
 * (no email/phone/etc.) — a lost or stolen scanner device shouldn't leak
 * more than a printed attendee list would.
 *
 * Security: staff-only, same authorization as /api/tickets/checkin.
 *
 * Response: { manifest: OfflineManifest }
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

    const { data: event } = await supabase
      .from("events")
      .select("title, ticket_gates")
      .eq("id", eventId)
      .maybeSingle();

    const { data: tickets, error } = await supabase
      .from("tickets")
      .select("qr_token, ticket_code, status, ticket_type, gaming_meta, event_registrations(name, team_id)")
      .eq("event_id", eventId)
      .neq("status", "CANCELLED");

    if (error) {
      return res.status(500).json({ error: "Failed to build manifest" });
    }

    return res.status(200).json({
      manifest: {
        eventId,
        eventTitle: event?.title ?? "",
        generatedAt: new Date().toISOString(),
        gates: event?.ticket_gates ?? [],
        tickets: (tickets ?? []).map((t: any) => ({
          qrToken: t.qr_token,
          ticketCode: t.ticket_code,
          status: t.status,
          ticketType: t.ticket_type,
          participantName: t.event_registrations?.name ?? "",
          teamName: t.event_registrations?.team_id ?? null,
          gamingMeta: t.gaming_meta ?? null,
        })),
      },
    });
  } catch (err: any) {
    console.error("Manifest error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
