/**
 * API Route: POST /api/tickets/sync
 * Batch-uploads a queue of scans the scanner recorded while offline
 * (requirement 6). Each scan is processed through the exact same
 * check_in_ticket() RPC as a live online scan — offline scanning doesn't
 * get a separate, weaker validation path.
 *
 * Security: same authorization as /api/tickets/checkin. Rate limiting is
 * intentionally skipped here — a device that was offline for an hour of
 * a busy event may have accumulated a legitimate backlog of dozens of
 * scans to flush in one batch, which the per-request quota isn't sized
 * for. Each individual scan is still fully authorized and atomic.
 *
 * Request body:
 * { event_id: uuid, scans: Array<{ qr_token, client_scan_id, device_id?, gate?, scanned_at }> }
 *
 * Response:
 * { results: Array<{ client_scan_id, result, error? }> }
 * Always 200 — a per-scan failure is reported inside `results`, not as an
 * HTTP error, so the client can distinguish "this one scan's token was
 * garbage" from "the whole sync request failed and should be retried."
 */
import { getSupabaseAdmin, requireAuth } from "../_utils.js";
import { isAuthorizedTicketStaff } from "./_utils.js";

const supabase = getSupabaseAdmin();
const MAX_BATCH_SIZE = 500;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = await requireAuth(req.headers);
    if (!userId) {
      return res.status(401).json({ error: "Missing or invalid authorization" });
    }

    const { event_id, scans } = req.body ?? {};
    if (!event_id || typeof event_id !== "string") {
      return res.status(400).json({ error: "event_id is required", code: "invalid_input" });
    }
    if (!Array.isArray(scans) || scans.length === 0) {
      return res.status(400).json({ error: "scans must be a non-empty array", code: "invalid_input" });
    }
    if (scans.length > MAX_BATCH_SIZE) {
      return res.status(400).json({
        error: `Batch too large — split into batches of ${MAX_BATCH_SIZE} or fewer`,
        code: "batch_too_large",
      });
    }

    const authorized = await isAuthorizedTicketStaff(supabase, userId, event_id);
    if (!authorized) {
      return res.status(403).json({ error: "Not authorized to scan tickets for this event", code: "forbidden" });
    }

    const results: Array<{ client_scan_id: string; result?: string; error?: string }> = [];

    // Sequential, not Promise.all: these hit the same handful of ticket
    // rows a live event's scans cluster around, and running them
    // concurrently would mean piling up on the same Postgres row locks at
    // once for no real speed benefit — a sync batch isn't latency-
    // sensitive the way a live scan is.
    for (const scan of scans) {
      const { qr_token, client_scan_id, device_id, gate, scanned_at } = scan ?? {};
      if (!qr_token || !client_scan_id) {
        results.push({
          client_scan_id: client_scan_id ?? "unknown",
          error: "missing qr_token or client_scan_id",
        });
        continue;
      }

      try {
        const { data, error } = await supabase.rpc("check_in_ticket", {
          p_qr_token: qr_token,
          p_event_id: event_id,
          p_scanned_by: userId,
          p_client_scan_id: client_scan_id,
          p_device_id: device_id ?? null,
          p_gate: gate ?? null,
          p_offline: true,
          p_scanned_at: scanned_at ?? new Date().toISOString(),
        });
        if (error) {
          results.push({ client_scan_id, error: error.message });
        } else {
          results.push({ client_scan_id, result: (data as any)?.result });
        }
      } catch (err: any) {
        results.push({ client_scan_id, error: err?.message ?? "unknown error" });
      }
    }

    return res.status(200).json({ results });
  } catch (err: any) {
    console.error("Sync error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
