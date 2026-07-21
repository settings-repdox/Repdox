import type {
  TicketDTO,
  TicketWithContext,
  CheckInRequest,
  CheckInResult,
  AttendanceStats,
  TicketSearchQuery,
  OfflineManifest,
  EventStaffGrant,
  EventStaffRole,
  TicketAccessRole,
} from "../dtos/ticket.dto";
import type { ITicketService } from "../interfaces/ITicketService";
import type { ITicketRepository } from "../interfaces/ITicketRepository";

export class TicketServiceImpl implements ITicketService {
  constructor(private readonly repo: ITicketRepository) {}

  async generateTicket(registrationId: string): Promise<TicketDTO> {
    return this.repo.generateForRegistration(registrationId);
  }

  async generateMissingTicketsForEvent(eventId: string): Promise<TicketDTO[]> {
    const registrationIds = await this.repo.listConfirmedRegistrationIds(eventId);
    const results: TicketDTO[] = [];
    // Sequential rather than Promise.all — this runs rarely (organiser
    // flips ticketing on for an event that may already have hundreds of
    // registrations) and sequential calls are easier to reason about for
    // partial-failure handling than a bulk Promise.all that aborts on the
    // first rejection.
    for (const registrationId of registrationIds) {
      try {
        const ticket = await this.repo.generateForRegistration(registrationId);
        results.push(ticket);
      } catch (err) {
        // A single bad registration shouldn't abort the whole backfill —
        // log and continue. Callers can diff registrationIds.length against
        // results.length to see if anything was skipped.
        console.error(`Ticket backfill skipped for registration ${registrationId}:`, err);
      }
    }
    return results;
  }

  async checkIn(request: CheckInRequest): Promise<CheckInResult> {
    return this.repo.checkIn(request);
  }

  async cancelTicket(ticketId: string, cancelledBy: string, reason?: string): Promise<TicketDTO> {
    return this.repo.cancel(ticketId, cancelledBy, reason);
  }

  async reissueTicket(ticketId: string, reissuedBy: string): Promise<TicketDTO> {
    return this.repo.reissue(ticketId, reissuedBy);
  }

  async getTicketByToken(token: string): Promise<TicketWithContext | null> {
    return this.repo.getByToken(token);
  }

  async getTicketById(id: string): Promise<TicketDTO | null> {
    return this.repo.getById(id);
  }

  async getTicketByRegistrationId(registrationId: string): Promise<TicketDTO | null> {
    return this.repo.getByRegistrationId(registrationId);
  }

  async searchTickets(query: TicketSearchQuery): Promise<TicketWithContext[]> {
    return this.repo.search(query);
  }

  async getAttendanceStats(eventId: string): Promise<AttendanceStats> {
    return this.repo.getStats(eventId);
  }

  async getOfflineManifest(eventId: string): Promise<OfflineManifest> {
    const [event, entries] = await Promise.all([
      this.repo.getEvent(eventId),
      this.repo.getOfflineManifestEntries(eventId),
    ]);
    return {
      eventId,
      eventTitle: event?.title ?? "",
      generatedAt: new Date().toISOString(),
      gates: event?.gates ?? [],
      tickets: entries,
    };
  }

  async exportAttendanceCsv(eventId: string): Promise<string> {
    const tickets = await this.repo.search({ eventId, limit: 100000 });
    const header = [
      "ticket_code",
      "participant_name",
      "team_name",
      "ticket_type",
      "status",
      "checked_in_at",
    ];
    const escape = (value: unknown) => {
      const s = value === null || value === undefined ? "" : String(value);
      // CSV-escape: wrap in quotes and double up any embedded quotes.
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = tickets.map((t) =>
      [
        t.ticket_code,
        t.participant_name,
        t.team_name ?? "",
        t.ticket_type,
        t.status,
        t.checked_in_at ?? "",
      ]
        .map(escape)
        .join(","),
    );
    return [header.join(","), ...rows].join("\n");
  }

  async getAccessRole(userId: string, eventId: string): Promise<TicketAccessRole | null> {
    if (!userId) return null;

    // Lazy import to avoid a hard dependency on core/services from a domain
    // module's happy path — only pulled in when actually needed.
    const { resolveService } = await import("@/core/services/di");
    type PermissionServiceShape = { isUserAdmin(userId?: string): Promise<boolean> };
    try {
      const permissionService = resolveService<PermissionServiceShape>("PermissionService");
      if (await permissionService.isUserAdmin(userId)) return "owner";
    } catch {
      // PermissionService not registered (e.g. isolated unit test) — fall
      // through to the owner/staff checks, which don't depend on it.
    }

    if (await this.repo.isEventOwner(userId, eventId)) return "owner";

    const staffRole = await this.repo.getStaffRole(userId, eventId);
    return staffRole ?? null;
  }

  async isAuthorizedStaff(userId: string, eventId: string): Promise<boolean> {
    return (await this.getAccessRole(userId, eventId)) !== null;
  }

  async listEventStaff(eventId: string): Promise<EventStaffGrant[]> {
    return this.repo.listEventStaff(eventId);
  }

  async grantStaffAccess(
    eventId: string,
    userId: string,
    role: EventStaffRole,
    grantedBy: string,
  ): Promise<EventStaffGrant> {
    return this.repo.grantStaffAccess(eventId, userId, role, grantedBy);
  }

  async revokeStaffAccess(eventId: string, userId: string): Promise<void> {
    return this.repo.revokeStaffAccess(eventId, userId);
  }
}
