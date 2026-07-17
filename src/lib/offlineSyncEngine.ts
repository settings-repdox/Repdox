// Ties src/lib/offlineTicketStore.ts's persisted queue to
// POST /api/tickets/sync — this is what "once internet returns,
// automatically synchronise all pending scans" (requirement 6) actually
// runs. Call scheduleSync() after every offline scan and on the browser's
// "online" event; it no-ops safely if called while still offline or if
// nothing is queued.

import { getQueuedScans, markScanSynced } from "./offlineTicketStore";

export interface SyncOutcome {
  attempted: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

let syncInFlight: Promise<SyncOutcome> | null = null;

/** De-duplicates concurrent sync calls (e.g. an 'online' event firing at
 * the same moment a scan just queued triggers its own sync) into a single
 * in-flight request rather than racing two batches against each other. */
export async function syncPendingScans(
  eventId: string,
  getAuthToken: () => Promise<string | null>,
): Promise<SyncOutcome> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const outcome: SyncOutcome = { attempted: 0, succeeded: 0, failed: 0, errors: [] };

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return outcome;
    }

    const pending = await getQueuedScans(eventId);
    if (pending.length === 0) return outcome;

    const token = await getAuthToken();
    if (!token) {
      outcome.errors.push("Not authenticated — sign in again to sync pending scans.");
      return outcome;
    }

    outcome.attempted = pending.length;

    // /api/tickets/sync caps a single request at 500 scans — chunk larger
    // backlogs rather than failing the whole sync outright.
    const CHUNK_SIZE = 500;
    for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
      const chunk = pending.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetch("/api/tickets/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            event_id: eventId,
            scans: chunk.map((s) => ({
              qr_token: s.qrToken,
              client_scan_id: s.clientScanId,
              device_id: s.deviceId,
              gate: s.gate,
              scanned_at: s.scannedAt,
            })),
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          outcome.failed += chunk.length;
          outcome.errors.push(body.error ?? `Sync request failed (${res.status})`);
          continue;
        }

        const body = await res.json();
        for (const result of body.results ?? []) {
          if (result.error) {
            outcome.failed += 1;
            outcome.errors.push(`${result.client_scan_id}: ${result.error}`);
          } else {
            outcome.succeeded += 1;
            await markScanSynced(result.client_scan_id, result.result);
          }
        }
      } catch (err: unknown) {
        outcome.failed += chunk.length;
        outcome.errors.push(err instanceof Error ? err.message : "Network error during sync");
      }
    }

    return outcome;
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}
