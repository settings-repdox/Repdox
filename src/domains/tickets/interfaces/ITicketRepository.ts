import type {
  TicketDTO,
  TicketWithContext,
  CheckInRequest,
  CheckInResult,
  AttendanceStats,
  TicketSearchQuery,
  OfflineManifestEntry,
  EventStaffGrant,
  EventStaffRole,
} from "../dtos/ticket.dto";

/** Data-access contract for the tickets domain. Almost every mutation
 * delegates to a Postgres RPC function (see
 * supabase/migrations/202607160002_ticketing_rpc_functions.sql) rather
 * than a plain table update — see that file's header comment for why
 * (atomicity under concurrent scans, mainly). */
export interface ITicketRepository {
  generateForRegistration(registrationId: string): Promise<TicketDTO>;
  checkIn(request: CheckInRequest): Promise<CheckInResult>;
  cancel(ticketId: string, cancelledBy: string, reason?: string): Promise<TicketDTO>;
  reissue(ticketId: string, reissuedBy: string): Promise<TicketDTO>;

  getByToken(token: string): Promise<TicketWithContext | null>;
  getById(id: string): Promise<TicketDTO | null>;
  getByRegistrationId(registrationId: string): Promise<TicketDTO | null>;
  listActiveByEvent(eventId: string): Promise<TicketDTO[]>;
  search(query: TicketSearchQuery): Promise<TicketWithContext[]>;

  getStats(eventId: string): Promise<AttendanceStats>;
  getOfflineManifestEntries(eventId: string): Promise<OfflineManifestEntry[]>;

  getEvent(eventId: string): Promise<{ id: string; createdBy: string | null; title: string; gates: string[] } | null>;
  listConfirmedRegistrationIds(eventId: string): Promise<string[]>;

  isEventOwner(userId: string, eventId: string): Promise<boolean>;
  listEventStaff(eventId: string): Promise<EventStaffGrant[]>;
  isEventStaff(userId: string, eventId: string): Promise<boolean>;
  grantStaffAccess(eventId: string, userId: string, role: EventStaffRole, grantedBy: string): Promise<EventStaffGrant>;
  revokeStaffAccess(eventId: string, userId: string): Promise<void>;
}
