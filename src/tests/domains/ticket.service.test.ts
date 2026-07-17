import { describe, it, expect, vi, beforeEach } from "vitest";
import { TicketServiceImpl } from "@/domains/tickets/impl/TicketServiceImpl";
import type { ITicketRepository } from "@/domains/tickets/interfaces/ITicketRepository";
import type { TicketDTO, CheckInResult } from "@/domains/tickets/dtos/ticket.dto";

// TicketServiceImpl takes its repository via constructor injection (unlike
// some other domain services in this codebase, which lazily import the
// real Supabase repository internally and are tested via a hand-written
// mock class instead — see src/tests/domains/registration.service.test.ts).
// That makes it possible to test the REAL implementation here rather than
// a parallel reimplementation of its logic, which is more direct coverage
// for the same effort.

function makeTicket(overrides: Partial<TicketDTO> = {}): TicketDTO {
  return {
    id: "ticket-1",
    event_id: "event-1",
    registration_id: "reg-1",
    ticket_code: "RPDX-AAAA-BBBB",
    qr_token: "a".repeat(64),
    status: "VALID",
    ticket_type: "participant",
    gaming_meta: null,
    checked_in_at: null,
    checked_in_by: null,
    cancelled_at: null,
    cancelled_by: null,
    cancelled_reason: null,
    reissued_from: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

function makeMockRepo(): ITicketRepository {
  return {
    generateForRegistration: vi.fn(),
    checkIn: vi.fn(),
    cancel: vi.fn(),
    reissue: vi.fn(),
    getByToken: vi.fn(),
    getById: vi.fn(),
    getByRegistrationId: vi.fn(),
    listActiveByEvent: vi.fn(),
    search: vi.fn(),
    getStats: vi.fn(),
    getOfflineManifestEntries: vi.fn(),
    getEvent: vi.fn(),
    listConfirmedRegistrationIds: vi.fn(),
    isEventOwner: vi.fn(),
    listEventStaff: vi.fn(),
    isEventStaff: vi.fn(),
    grantStaffAccess: vi.fn(),
    revokeStaffAccess: vi.fn(),
  };
}

describe("TicketServiceImpl", () => {
  let repo: ITicketRepository;
  let service: TicketServiceImpl;

  beforeEach(() => {
    repo = makeMockRepo();
    service = new TicketServiceImpl(repo);
  });

  describe("generateTicket", () => {
    it("delegates to the repository and returns the generated ticket", async () => {
      const ticket = makeTicket();
      (repo.generateForRegistration as any).mockResolvedValue(ticket);

      const result = await service.generateTicket("reg-1");

      expect(repo.generateForRegistration).toHaveBeenCalledWith("reg-1");
      expect(result).toEqual(ticket);
    });
  });

  describe("generateMissingTicketsForEvent", () => {
    it("generates a ticket for every confirmed registration", async () => {
      (repo.listConfirmedRegistrationIds as any).mockResolvedValue(["reg-1", "reg-2", "reg-3"]);
      (repo.generateForRegistration as any).mockImplementation((id: string) =>
        Promise.resolve(makeTicket({ id: `ticket-${id}`, registration_id: id })),
      );

      const results = await service.generateMissingTicketsForEvent("event-1");

      expect(results).toHaveLength(3);
      expect(repo.generateForRegistration).toHaveBeenCalledTimes(3);
    });

    it("skips a registration that fails to generate without aborting the rest", async () => {
      (repo.listConfirmedRegistrationIds as any).mockResolvedValue(["reg-1", "reg-2"]);
      (repo.generateForRegistration as any)
        .mockRejectedValueOnce(new Error("ticketing_not_enabled"))
        .mockResolvedValueOnce(makeTicket({ id: "ticket-2", registration_id: "reg-2" }));

      const results = await service.generateMissingTicketsForEvent("event-1");

      expect(results).toHaveLength(1);
      expect(results[0].registration_id).toBe("reg-2");
    });

    it("returns an empty array when there are no confirmed registrations", async () => {
      (repo.listConfirmedRegistrationIds as any).mockResolvedValue([]);

      const results = await service.generateMissingTicketsForEvent("event-1");

      expect(results).toEqual([]);
      expect(repo.generateForRegistration).not.toHaveBeenCalled();
    });
  });

  describe("checkIn", () => {
    it.each<[string, CheckInResult]>([
      ["VALID", { result: "VALID", ticket: makeTicket({ status: "USED" }) }],
      [
        "DUPLICATE",
        {
          result: "DUPLICATE",
          ticket: makeTicket({ status: "USED" }),
          previousCheckInAt: "2026-07-15T10:00:00Z",
          previousScannedByName: "Alex",
        },
      ],
      ["CANCELLED", { result: "CANCELLED", ticket: makeTicket({ status: "CANCELLED" }) }],
      ["INVALID", { result: "INVALID" }],
      ["WRONG_EVENT", { result: "WRONG_EVENT", ticket: makeTicket({ event_id: "other-event" }) }],
    ])("passes through a %s result from the repository unchanged", async (_label, expected) => {
      (repo.checkIn as any).mockResolvedValue(expected);

      const result = await service.checkIn({
        qrToken: "token",
        eventId: "event-1",
        scannedBy: "volunteer-1",
        clientScanId: "scan-1",
      });

      expect(result).toEqual(expected);
    });

    it("forwards the full request, including offline metadata, to the repository", async () => {
      (repo.checkIn as any).mockResolvedValue({ result: "VALID" });

      const request = {
        qrToken: "token",
        eventId: "event-1",
        scannedBy: "volunteer-1",
        clientScanId: "scan-1",
        deviceId: "device-abc",
        gate: "Main Entrance",
        offline: true,
        scannedAt: "2026-07-15T09:00:00Z",
      };
      await service.checkIn(request);

      expect(repo.checkIn).toHaveBeenCalledWith(request);
    });
  });

  describe("cancelTicket / reissueTicket", () => {
    it("cancels a ticket with a reason", async () => {
      const cancelled = makeTicket({ status: "CANCELLED", cancelled_reason: "duplicate registration" });
      (repo.cancel as any).mockResolvedValue(cancelled);

      const result = await service.cancelTicket("ticket-1", "organiser-1", "duplicate registration");

      expect(repo.cancel).toHaveBeenCalledWith("ticket-1", "organiser-1", "duplicate registration");
      expect(result.status).toBe("CANCELLED");
    });

    it("reissue returns a new ticket, distinct from the one being replaced", async () => {
      const newTicket = makeTicket({ id: "ticket-2", qr_token: "b".repeat(64), reissued_from: "ticket-1" });
      (repo.reissue as any).mockResolvedValue(newTicket);

      const result = await service.reissueTicket("ticket-1", "organiser-1");

      expect(repo.reissue).toHaveBeenCalledWith("ticket-1", "organiser-1");
      expect(result.id).not.toBe("ticket-1");
      expect(result.reissued_from).toBe("ticket-1");
    });
  });

  describe("getAttendanceStats", () => {
    it("delegates to the repository", async () => {
      const stats = {
        registered: 100,
        ticketsIssued: 95,
        checkedIn: 40,
        cancelled: 5,
        remaining: 55,
        recentScans: [],
      };
      (repo.getStats as any).mockResolvedValue(stats);

      const result = await service.getAttendanceStats("event-1");

      expect(result).toEqual(stats);
    });
  });

  describe("getOfflineManifest", () => {
    it("assembles event info and ticket entries into one manifest", async () => {
      (repo.getEvent as any).mockResolvedValue({
        id: "event-1",
        createdBy: "owner-1",
        title: "HackSprint 2026",
        gates: ["Main", "Side"],
      });
      (repo.getOfflineManifestEntries as any).mockResolvedValue([
        {
          qrToken: "token-1",
          ticketCode: "RPDX-AAAA-1111",
          status: "VALID",
          ticketType: "participant",
          participantName: "Jordan",
        },
      ]);

      const manifest = await service.getOfflineManifest("event-1");

      expect(manifest.eventTitle).toBe("HackSprint 2026");
      expect(manifest.gates).toEqual(["Main", "Side"]);
      expect(manifest.tickets).toHaveLength(1);
      expect(manifest.tickets[0].participantName).toBe("Jordan");
    });

    it("falls back to empty values when the event can't be found", async () => {
      (repo.getEvent as any).mockResolvedValue(null);
      (repo.getOfflineManifestEntries as any).mockResolvedValue([]);

      const manifest = await service.getOfflineManifest("missing-event");

      expect(manifest.eventTitle).toBe("");
      expect(manifest.gates).toEqual([]);
      expect(manifest.tickets).toEqual([]);
    });
  });

  describe("exportAttendanceCsv", () => {
    it("produces a CSV header plus one row per ticket, quoting fields", async () => {
      (repo.search as any).mockResolvedValue([
        {
          ...makeTicket(),
          event_title: "HackSprint",
          event_start_at: "",
          event_location: "",
          participant_name: 'Jordan "JJ" Lee',
          team_name: "Team Rocket",
        },
      ]);

      const csv = await service.exportAttendanceCsv("event-1");
      const lines = csv.split("\n");

      expect(lines[0]).toBe(
        "ticket_code,participant_name,team_name,ticket_type,status,checked_in_at",
      );
      expect(lines[1]).toContain('"Jordan ""JJ"" Lee"');
      expect(lines[1]).toContain('"Team Rocket"');
    });

    it("returns just the header when there are no tickets", async () => {
      (repo.search as any).mockResolvedValue([]);

      const csv = await service.exportAttendanceCsv("event-1");

      expect(csv.split("\n")).toHaveLength(1);
    });
  });

  describe("isAuthorizedStaff", () => {
    it("returns false immediately for an empty user id, without querying the repository", async () => {
      const result = await service.isAuthorizedStaff("", "event-1");

      expect(result).toBe(false);
      expect(repo.isEventOwner).not.toHaveBeenCalled();
    });

    it("authorizes the event owner", async () => {
      (repo.isEventOwner as any).mockResolvedValue(true);

      const result = await service.isAuthorizedStaff("owner-1", "event-1");

      expect(result).toBe(true);
    });

    it("authorizes a granted staff member who is not the owner", async () => {
      (repo.isEventOwner as any).mockResolvedValue(false);
      (repo.isEventStaff as any).mockResolvedValue(true);

      const result = await service.isAuthorizedStaff("volunteer-1", "event-1");

      expect(result).toBe(true);
    });

    it("denies a user who is neither owner nor staff nor admin", async () => {
      (repo.isEventOwner as any).mockResolvedValue(false);
      (repo.isEventStaff as any).mockResolvedValue(false);

      const result = await service.isAuthorizedStaff("random-user", "event-1");

      expect(result).toBe(false);
    });
  });

  describe("staff management", () => {
    it("grants staff access via the repository", async () => {
      const grant = {
        id: "grant-1",
        eventId: "event-1",
        userId: "volunteer-1",
        role: "volunteer" as const,
        grantedBy: "owner-1",
        createdAt: "2026-07-15T00:00:00Z",
      };
      (repo.grantStaffAccess as any).mockResolvedValue(grant);

      const result = await service.grantStaffAccess("event-1", "volunteer-1", "volunteer", "owner-1");

      expect(repo.grantStaffAccess).toHaveBeenCalledWith("event-1", "volunteer-1", "volunteer", "owner-1");
      expect(result).toEqual(grant);
    });

    it("revokes staff access via the repository", async () => {
      await service.revokeStaffAccess("event-1", "volunteer-1");

      expect(repo.revokeStaffAccess).toHaveBeenCalledWith("event-1", "volunteer-1");
    });
  });
});
