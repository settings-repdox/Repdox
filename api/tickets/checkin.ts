/**
 * API Route: POST /api/tickets/checkin
 * The scanner's core endpoint — validates and checks in a scanned QR
 * token, or records the sync of an offline scan after connectivity
 * returns (requirement 6).
 *
 * Security:
 * - Requires authentication as an authorized staff member for the event
 *   (event owner, global admin, or an event_staff grant).
 * - Rate-limited via the same check_and_increment_quota RPC used by
 *   api/events/register.ts and api/events/create.ts, under the
 *   "ticket_checkin" action key. Note: that RPC's default per-day limit
 *   was tuned for once-a-day actions like creating an event, not for a
 *   volunteer scanning hundreds of tickets in a single event day — if
 *   scanning starts getting rate-limited during a real event, the fix is
 *   raising the "ticket_checkin" action's limit server-side (see
 *   docs/api/README.md), not removing this check.
 * - The actual check-in mutation happens inside check_in_ticket(), a
 *   SECURITY DEFINER Postgres function that row-locks the ticket for the
 *   duration of the transaction — see
 *   supabase/migrations/202607160002_ticketing_rpc_functions.sql for why
 *   this can't safely be a read-then-write from application code.
 * - client_scan_id (required) makes retries of the same scan idempotent —
 *   the scanner PWA generates this once per scan and reuses it across
 *   sync retries, never generating a new one for the same physical scan
 *   event. This is what prevents a flaky connection from turning one scan
 *   into two check-ins.
 *
 * Request body:
 * {
 *   qr_token: string,
 *   event_id: uuid,
 *   client_scan_id: uuid,
 *   device_id?: string,
 *   gate?: string,
 *   offline?: boolean,       // true if this scan happened while offline
 *   scanned_at?: ISO date,   // required (and meaningful) for offline scans
 * }
 *
 * Response:
 * { result: 'VALID'|'DUPLICATE'|'INVALID'|'CANCELLED'|'WRONG_EVENT', ticket?, ... }
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

    const {
      qr_token,
      event_id,
      client_scan_id,
      device_id,
      gate,
      offline,
      scanned_at,
    } = req.body ?? {};

    if (!qr_token || typeof qr_token !== "string") {
      return res.status(400).json({ error: "qr_token is required", code: "invalid_input" });
    }
    if (!event_id || typeof event_id !== "string") {
      return res.status(400).json({ error: "event_id is required", code: "invalid_input" });
    }
    if (!client_scan_id || typeof client_scan_id !== "string") {
      return res.status(400).json({ error: "client_scan_id is required", code: "invalid_input" });
    }

    const authorized = await isAuthorizedTicketStaff(supabase, userId, event_id);
    if (!authorized) {
      return res.status(403).json({ error: "Not authorized to scan tickets for this event", code: "forbidden" });
    }

    const { data: quotaCheck, error: quotaError } = await supabase.rpc("check_and_increment_quota", {
      p_user_id: userId,
      p_ip: null,
      p_action: "ticket_checkin",
    });
    if (quotaError) {
      // Fail open rather than closed for the quota check specifically —
      // blocking check-ins entirely because the quota RPC itself errored
      // would be a worse outcome during a live event than skipping the
      // rate limit for that one request. The check-in itself is still
      // fully validated and atomic regardless of this check's outcome.
      console.error("Quota check error (failing open):", quotaError);
    } else if (quotaCheck?.[0]?.allowed === false) {
      return res.status(429).json({
        error: "Scan rate limit reached — contact an organiser to raise it for this event",
        code: "quota_exceeded",
      });
    }

    const { data, error } = await supabase.rpc("check_in_ticket", {
      p_qr_token: qr_token,
      p_event_id: event_id,
      p_scanned_by: userId,
      p_client_scan_id: client_scan_id,
      p_device_id: device_id ?? null,
      p_gate: gate ?? null,
      p_offline: !!offline,
      p_scanned_at: scanned_at ?? new Date().toISOString(),
    });

    if (error) {
      console.error("Check-in RPC error:", error);
      return res.status(500).json({ error: "Check-in failed", code: "checkin_failed" });
    }

    return res.status(200).json(data);
  } catch (err: any) {
    console.error("Check-in error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
