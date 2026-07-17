import { describe, it, expect } from "vitest";
import {
  findManifestEntry,
  evaluateLocalScan,
  applyOptimisticCheckIn,
  mergeManifestWithPendingQueue,
} from "@/lib/offlineScanLogic";
import type { OfflineManifest } from "@/domains/tickets/dtos/ticket.dto";
import type { QueuedScan } from "@/lib/offlineScanLogic";

// This module holds the highest-risk logic in the whole ticketing system:
// getting it wrong is how two offline scanners at two gates both let the
// same ticket in. It's deliberately pure (no IndexedDB, no network) so it
// can be exhaustively tested without a browser — see the module's own
// header comment for why.

function makeManifest(overrides: Partial<OfflineManifest> = {}): OfflineManifest {
  return {
    eventId: "event-1",
    eventTitle: "HackSprint 2026",
    generatedAt: "2026-07-15T00:00:00Z",
    gates: ["Main"],
    tickets: [
      {
        qrToken: "token-valid",
        ticketCode: "RPDX-AAAA-1111",
        status: "VALID",
        ticketType: "participant",
        participantName: "Jordan",
        teamName: "Team Rocket",
      },
      {
        qrToken: "token-used",
        ticketCode: "RPDX-BBBB-2222",
        status: "USED",
        ticketType: "participant",
        participantName: "Sam",
      },
      {
        qrToken: "token-cancelled",
        ticketCode: "RPDX-CCCC-3333",
        status: "CANCELLED",
        ticketType: "participant",
        participantName: "Casey",
      },
    ],
    ...overrides,
  };
}

describe("findManifestEntry", () => {
  const manifest = makeManifest();

  it("finds an entry by exact QR token", () => {
    const entry = findManifestEntry(manifest, "token-valid");
    expect(entry?.participantName).toBe("Jordan");
  });

  it("finds an entry by ticket code, case-insensitively", () => {
    const entry = findManifestEntry(manifest, "rpdx-aaaa-1111");
    expect(entry?.participantName).toBe("Jordan");
  });

  it("trims whitespace from manual entry input", () => {
    const entry = findManifestEntry(manifest, "  RPDX-AAAA-1111  ");
    expect(entry?.participantName).toBe("Jordan");
  });

  it("returns undefined for a token that doesn't exist", () => {
    expect(findManifestEntry(manifest, "not-a-real-token")).toBeUndefined();
  });

  it("returns undefined when the manifest is null", () => {
    expect(findManifestEntry(null, "token-valid")).toBeUndefined();
  });

  it("returns undefined for an empty query", () => {
    expect(findManifestEntry(manifest, "")).toBeUndefined();
  });
});

describe("evaluateLocalScan", () => {
  const manifest = makeManifest();

  it("returns VALID with participant details for an unused ticket", () => {
    const outcome = evaluateLocalScan(manifest, "token-valid");
    expect(outcome.result).toBe("VALID");
    expect(outcome.participantName).toBe("Jordan");
    expect(outcome.teamName).toBe("Team Rocket");
  });

  it("returns DUPLICATE for a ticket already marked USED, flagged as locally duplicate", () => {
    const outcome = evaluateLocalScan(manifest, "token-used");
    expect(outcome.result).toBe("DUPLICATE");
    expect(outcome.locallyDuplicate).toBe(true);
    expect(outcome.participantName).toBe("Sam");
  });

  it("returns CANCELLED for a cancelled ticket", () => {
    const outcome = evaluateLocalScan(manifest, "token-cancelled");
    expect(outcome.result).toBe("CANCELLED");
  });

  it("returns INVALID for a token not present in the manifest at all", () => {
    const outcome = evaluateLocalScan(manifest, "totally-unknown-token");
    expect(outcome.result).toBe("INVALID");
    expect(outcome.entry).toBeUndefined();
  });

  it("returns INVALID when there is no manifest cached yet", () => {
    const outcome = evaluateLocalScan(null, "token-valid");
    expect(outcome.result).toBe("INVALID");
  });

  it("accepts a manually-typed ticket code as well as a QR token", () => {
    const outcome = evaluateLocalScan(manifest, "RPDX-AAAA-1111");
    expect(outcome.result).toBe("VALID");
  });
});

describe("applyOptimisticCheckIn", () => {
  it("marks the scanned ticket USED without mutating the original manifest", () => {
    const manifest = makeManifest();
    const updated = applyOptimisticCheckIn(manifest, "token-valid");

    expect(updated.tickets.find((t) => t.qrToken === "token-valid")?.status).toBe("USED");
    // Original untouched — this must be a pure function, since the caller
    // (Scanner.tsx) relies on getting a new object back to persist.
    expect(manifest.tickets.find((t) => t.qrToken === "token-valid")?.status).toBe("VALID");
  });

  it("a ticket checked in locally is then correctly detected as a duplicate on a second scan", () => {
    const manifest = makeManifest();
    const afterFirstScan = applyOptimisticCheckIn(manifest, "token-valid");

    const secondScanOutcome = evaluateLocalScan(afterFirstScan, "token-valid");

    expect(secondScanOutcome.result).toBe("DUPLICATE");
    expect(secondScanOutcome.locallyDuplicate).toBe(true);
  });

  it("leaves other tickets in the manifest unchanged", () => {
    const manifest = makeManifest();
    const updated = applyOptimisticCheckIn(manifest, "token-valid");

    expect(updated.tickets.find((t) => t.qrToken === "token-cancelled")?.status).toBe("CANCELLED");
  });

  it("does nothing if the token isn't found (no matching ticket to update)", () => {
    const manifest = makeManifest();
    const updated = applyOptimisticCheckIn(manifest, "not-a-real-token");

    expect(updated.tickets).toEqual(manifest.tickets);
  });
});

describe("mergeManifestWithPendingQueue", () => {
  function makeQueuedScan(overrides: Partial<QueuedScan> = {}): QueuedScan {
    return {
      clientScanId: "scan-1",
      eventId: "event-1",
      qrToken: "token-valid",
      scannedAt: "2026-07-15T09:00:00Z",
      synced: false,
      ...overrides,
    };
  }

  it("preserves the pending-queue's USED state even if a server refresh reports the ticket as still VALID", () => {
    // This is the core scenario this function exists for: the device
    // scanned a ticket while offline, hasn't synced yet, and then
    // re-downloads a manifest (e.g. a periodic background refresh) that —
    // because the scan hasn't reached the server yet — still shows the
    // ticket as VALID. Without this merge, that refresh would "un-scan"
    // the ticket locally, and a second scan of the same physical ticket
    // (at the same gate, by the same device, before sync completes) would
    // incorrectly succeed as VALID again instead of being caught as a
    // duplicate.
    const freshFromServer = makeManifest(); // still shows token-valid as VALID
    const pending = [makeQueuedScan()];

    const merged = mergeManifestWithPendingQueue(freshFromServer, pending);

    expect(merged.tickets.find((t) => t.qrToken === "token-valid")?.status).toBe("USED");
  });

  it("does not override a CANCELLED status even if it's in the pending queue", () => {
    const freshFromServer = makeManifest();
    const pending = [makeQueuedScan({ qrToken: "token-cancelled" })];

    const merged = mergeManifestWithPendingQueue(freshFromServer, pending);

    // A cancelled ticket scanned offline shouldn't retroactively look
    // "checked in" once the truth (it's cancelled) is known.
    expect(merged.tickets.find((t) => t.qrToken === "token-cancelled")?.status).toBe("CANCELLED");
  });

  it("ignores already-synced entries in the queue — only unsynced scans should override server state", () => {
    const freshFromServer = makeManifest();
    const pending = [makeQueuedScan({ synced: true, syncedResult: "VALID" })];

    const merged = mergeManifestWithPendingQueue(freshFromServer, pending);

    // The server's own manifest is already authoritative for this ticket
    // once its scan has synced — nothing local should override it.
    expect(merged.tickets.find((t) => t.qrToken === "token-valid")?.status).toBe("VALID");
  });

  it("returns the manifest unchanged when the queue is empty", () => {
    const freshFromServer = makeManifest();

    const merged = mergeManifestWithPendingQueue(freshFromServer, []);

    expect(merged).toEqual(freshFromServer);
  });

  it("leaves tickets with no pending scan untouched", () => {
    const freshFromServer = makeManifest();
    const pending = [makeQueuedScan({ qrToken: "token-valid" })];

    const merged = mergeManifestWithPendingQueue(freshFromServer, pending);

    expect(merged.tickets.find((t) => t.qrToken === "token-used")?.status).toBe("USED");
  });
});
