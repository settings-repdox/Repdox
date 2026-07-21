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

/** Public contract for the tickets domain — see
 * docs/architecture/service-contracts/README.md for the "Pattern B"
 * convention this follows (interface + impl live together in the domain). */
export interface ITicketService {
  /** Idempotent — generating twice for the same registration returns the
   * existing active ticket rather than creating a duplicate. Normally you
   * don't need to call this directly: a database trigger
   * (trg_generate_ticket_on_registration_confirm) generates a ticket
   * automatically when a registration's status becomes "confirmed" or
   * "registered". This is exposed for manual/backfill generation — e.g. an
   * organiser enabling ticketing on an event that already has registrations. */
  generateTicket(registrationId: string): Promise<TicketDTO>;

  /** Backfills tickets for every existing confirmed registration on an
   * event — used right after an organiser flips ticketing_enabled on. */
  generateMissingTicketsForEvent(eventId: string): Promise<TicketDTO[]>;

  /** The single atomic check-in operation the scanner calls for every
   * scan, online or offline-then-synced. Never throws for a "bad" ticket
   * (invalid/cancelled/duplicate/wrong event) — those are valid results,
   * not exceptions. Only throws for a genuine failure (event not found,
   * network/db error). */
  checkIn(request: CheckInRequest): Promise<CheckInResult>;

  cancelTicket(ticketId: string, cancelledBy: string, reason?: string): Promise<TicketDTO>;

  /** Cancels the existing ticket and returns a brand-new one (new code +
   * token) for the same registration — see the schema migration's design
   * notes on why this is "cancel + create new" rather than an update. */
  reissueTicket(ticketId: string, reissuedBy: string): Promise<TicketDTO>;

  getTicketByToken(token: string): Promise<TicketWithContext | null>;
  getTicketById(id: string): Promise<TicketDTO | null>;
  getTicketByRegistrationId(registrationId: string): Promise<TicketDTO | null>;

  searchTickets(query: TicketSearchQuery): Promise<TicketWithContext[]>;

  getAttendanceStats(eventId: string): Promise<AttendanceStats>;

  /** Everything the scanner PWA needs to cache locally before an event so
   * it can validate scans while offline — see requirement 6. */
  getOfflineManifest(eventId: string): Promise<OfflineManifest>;

  exportAttendanceCsv(eventId: string): Promise<string>;

  /** Resolves the caller's effective access level for an event's
   * ticketing, or null if they have none — "owner" (event creator or
   * global admin), "organizer"/"staff"/"volunteer" (from an event_staff
   * grant), ranked in that descending order of privilege. This is the
   * single source of truth callers should use to decide what UI/actions
   * to allow; don't re-derive owner/admin/event_staff checks elsewhere. */
  getAccessRole(userId: string, eventId: string): Promise<TicketAccessRole | null>;

  /** Convenience shorthand for "does this user have ANY ticketing access
   * at all for this event" (equivalent to
   * `(await getAccessRole(userId, eventId)) !== null`). Reach for
   * getAccessRole() directly instead when you need to distinguish
   * scan-only volunteers from staff/organizer-level access — see the
   * per-action role table in docs/api/README.md. */
  isAuthorizedStaff(userId: string, eventId: string): Promise<boolean>;

  listEventStaff(eventId: string): Promise<EventStaffGrant[]>;
  grantStaffAccess(eventId: string, userId: string, role: EventStaffRole, grantedBy: string): Promise<EventStaffGrant>;
  revokeStaffAccess(eventId: string, userId: string): Promise<void>;
}
