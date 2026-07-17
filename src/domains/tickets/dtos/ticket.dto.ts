// Tickets domain DTOs — see docs/architecture/domain-model/README.md and
// ADR 0007 (Ticketing & QR Check-in System) for the full design writeup.

export type TicketStatus = "VALID" | "USED" | "CANCELLED";

export type TicketType =
  | "participant"
  | "volunteer"
  | "judge"
  | "sponsor"
  | "media"
  | "staff";

export type ScanResult =
  | "VALID"
  | "DUPLICATE"
  | "INVALID"
  | "CANCELLED"
  | "WRONG_EVENT";

/** Optional per-ticket gaming details, shown to the scanner at check-in
 * when present (Gaming events only — see requirement 9). */
export interface GamingTicketMeta {
  team?: string;
  game?: string;
  ign?: string;
  player_number?: string;
  seat?: string;
  discord?: string;
  steam_id?: string;
}

export interface TicketDTO {
  id: string;
  event_id: string;
  registration_id: string;
  ticket_code: string;
  qr_token: string;
  status: TicketStatus;
  ticket_type: TicketType;
  gaming_meta?: GamingTicketMeta | null;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_reason?: string | null;
  reissued_from?: string | null;
  created_at: string;
  updated_at: string;
}

/** A ticket enriched with the event/participant context the ticket page
 * and search results need, without every caller having to join manually. */
export interface TicketWithContext extends TicketDTO {
  event_title: string;
  event_start_at: string;
  event_location: string;
  event_image_url?: string | null;
  event_format?: string | null;
  participant_name: string;
  team_name?: string | null;
}

export interface CheckInRequest {
  qrToken: string;
  eventId: string;
  scannedBy: string;
  /** Client-minted idempotency key — see ticket_scans.client_scan_id in the
   * schema migration for why this matters for offline sync safety. */
  clientScanId: string;
  deviceId?: string;
  gate?: string;
  offline?: boolean;
  /** Actual scan time on the device — required for offline scans, where it
   * predates the sync request that eventually delivers it to the server. */
  scannedAt?: string;
}

export interface CheckInResult {
  result: ScanResult;
  ticket?: TicketDTO | null;
  participantName?: string;
  teamName?: string | null;
  ticketType?: TicketType;
  gamingMeta?: GamingTicketMeta | null;
  previousCheckInAt?: string | null;
  previousScannedByName?: string | null;
  /** True when this result came from the idempotency replay path (the same
   * client_scan_id was already processed) rather than a fresh evaluation —
   * the UI can use this to skip a duplicate success animation/sound. */
  replay?: boolean;
}

export interface AttendanceStats {
  registered: number;
  ticketsIssued: number;
  checkedIn: number;
  cancelled: number;
  remaining: number;
  recentScans: RecentScan[];
}

export interface RecentScan {
  id: string;
  result: ScanResult;
  scannedAt: string;
  gate?: string | null;
  deviceId?: string | null;
  ticketCode?: string | null;
  participantName?: string | null;
}

export interface TicketSearchQuery {
  eventId: string;
  /** Matches against participant name or ticket code, case-insensitive. */
  query?: string;
  status?: TicketStatus;
  limit?: number;
}

/** One row of the offline manifest a scanner downloads before an event —
 * intentionally minimal (no email/phone/etc.) even though it's cached
 * on-device, since a lost/stolen scanner device shouldn't leak more PII
 * than a printed attendee list would. */
export interface OfflineManifestEntry {
  qrToken: string;
  ticketCode: string;
  status: TicketStatus;
  ticketType: TicketType;
  participantName: string;
  teamName?: string | null;
  gamingMeta?: GamingTicketMeta | null;
}

export interface OfflineManifest {
  eventId: string;
  eventTitle: string;
  generatedAt: string;
  gates: string[];
  tickets: OfflineManifestEntry[];
}

export type EventStaffRole = "organizer" | "volunteer" | "staff";

export interface EventStaffGrant {
  id: string;
  eventId: string;
  userId: string;
  role: EventStaffRole;
  grantedBy?: string | null;
  createdAt: string;
}

/** Role used for printable badges (requirement 10) — a superset of
 * TicketType since badges are also needed for people without a ticket in
 * the traditional sense (e.g. a judge who wasn't a public "registration"). */
export type BadgeRole =
  | "volunteer"
  | "participant"
  | "judge"
  | "sponsor"
  | "media"
  | "staff";

export interface BadgeData {
  name: string;
  organisation?: string | null;
  role: BadgeRole;
  qrToken: string;
}
