// Pure logic for offline scanning — deliberately separated from
// src/lib/offlineTicketStore.ts's IndexedDB I/O so it can be unit tested
// in a plain Node/jsdom environment (which has no indexedDB implementation
// by default, and adding a fake-indexeddb dependency just for this felt
// like more than this feature needed — see requirement in the task about
// not introducing unnecessary dependencies).
//
// "Conflict resolution" here means: once a ticket has been scanned once
// (whether that scan is confirmed by the server or only recorded locally
// so far), every subsequent local lookup of that same ticket must report
// it as already used — even before the device has had a chance to sync
// and hear back from the server. Getting this wrong is how a scanner with
// two staff members standing at two entrances, both offline, both
// checking the same ticket in "successfully" on their own devices, ends
// up with two people getting let in on one ticket.

import type {
  GamingTicketMeta,
  OfflineManifest,
  OfflineManifestEntry,
  ScanResult,
  TicketStatus,
  TicketType,
} from "@/domains/tickets/dtos/ticket.dto";

export interface QueuedScan {
  clientScanId: string;
  eventId: string;
  qrToken: string;
  deviceId?: string;
  gate?: string;
  scannedAt: string;
  synced: boolean;
  /** Set once a sync attempt gets a definitive answer from the server —
   * lets the UI show "this offline scan turned out to be a duplicate"
   * after the fact, without blocking the original scan from completing
   * locally when it happened. */
  syncedResult?: ScanResult;
}

export interface LocalScanOutcome {
  result: ScanResult;
  entry?: OfflineManifestEntry;
  participantName?: string;
  teamName?: string | null;
  ticketType?: TicketType;
  gamingMeta?: GamingTicketMeta | null;
  /** True if this ticket was already marked USED by an earlier scan on
   * THIS device's local cache (as opposed to being USED server-side
   * before the manifest was even downloaded). Both cases render as
   * "already checked in" to the volunteer — the distinction only matters
   * for debugging. */
  locallyDuplicate?: boolean;
}

/** Finds a manifest entry by QR token (the normal camera-scan path) or by
 * ticket code (manual entry fallback) — case-insensitive on the code
 * since a human might type it in any case. */
export function findManifestEntry(
  manifest: OfflineManifest | null,
  qrTokenOrCode: string,
): OfflineManifestEntry | undefined {
  if (!manifest || !qrTokenOrCode) return undefined;
  const needle = qrTokenOrCode.trim();
  const needleUpper = needle.toUpperCase();
  return manifest.tickets.find(
    (t) => t.qrToken === needle || t.ticketCode.toUpperCase() === needleUpper,
  );
}

/** Evaluates a scan against the locally cached manifest — this is what
 * runs while offline (and, optionally, as an instant local pre-check
 * before the online request even completes, for a snappier UI). */
export function evaluateLocalScan(
  manifest: OfflineManifest | null,
  qrTokenOrCode: string,
): LocalScanOutcome {
  const entry = findManifestEntry(manifest, qrTokenOrCode);

  if (!entry) {
    return { result: "INVALID" };
  }
  if (entry.status === "CANCELLED") {
    return { result: "CANCELLED", entry };
  }
  if (entry.status === "USED") {
    return {
      result: "DUPLICATE",
      entry,
      participantName: entry.participantName,
      teamName: entry.teamName,
      locallyDuplicate: true,
    };
  }

  return {
    result: "VALID",
    entry,
    participantName: entry.participantName,
    teamName: entry.teamName,
    ticketType: entry.ticketType,
    gamingMeta: entry.gamingMeta,
  };
}

/** Returns a new manifest with the given ticket optimistically marked
 * USED — called immediately after a successful local VALID scan so the
 * very next scan of the same ticket (by this device or, once merged, any
 * device) is correctly caught as a duplicate rather than re-validating
 * against stale cached data. Pure/immutable — callers persist the result. */
export function applyOptimisticCheckIn(
  manifest: OfflineManifest,
  qrToken: string,
): OfflineManifest {
  return {
    ...manifest,
    tickets: manifest.tickets.map((t) =>
      t.qrToken === qrToken ? { ...t, status: "USED" as TicketStatus } : t,
    ),
  };
}

/** Merges the server's authoritative manifest with any status changes
 * implied by scans still sitting in the local unsynced queue — used when
 * re-downloading a fresh manifest (e.g. periodic refresh while online)
 * without discarding the optimistic state of scans that haven't
 * round-tripped to the server yet. Server data wins for anything NOT in
 * the pending queue; for tickets that ARE in the pending queue, the local
 * USED state is preserved until that scan is confirmed synced, so a
 * refresh doesn't transiently "unmark" a ticket the device already
 * scanned. */
export function mergeManifestWithPendingQueue(
  freshManifest: OfflineManifest,
  pendingQueue: QueuedScan[],
): OfflineManifest {
  const pendingTokens = new Set(pendingQueue.filter((s) => !s.synced).map((s) => s.qrToken));
  if (pendingTokens.size === 0) return freshManifest;

  return {
    ...freshManifest,
    tickets: freshManifest.tickets.map((t) =>
      pendingTokens.has(t.qrToken) && t.status !== "CANCELLED"
        ? { ...t, status: "USED" as TicketStatus }
        : t,
    ),
  };
}
