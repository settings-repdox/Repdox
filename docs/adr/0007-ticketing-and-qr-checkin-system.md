# ADR 0007: Ticketing & QR Check-in System

Date: 2026-07-17

## Status

Accepted.

## Context

Repdox had no ticketing or check-in system. Offline hackathons, gaming
tournaments, and conferences needed: a way to issue verifiable tickets to
confirmed registrants, a scanner volunteers could use at the door
(including when venue wifi is unreliable — a near-certainty at most
physical event venues), and organiser-facing attendance visibility.

## Decision

### Domain structure

A new `tickets` domain (`src/domains/tickets/`) follows Pattern B from
`docs/architecture/service-contracts/README.md` — interface and
implementation together in the domain folder — including a full
`ITicketRepository` abstraction (`SupabaseTicketRepository`) rather than
`TicketServiceImpl` talking to Supabase directly, which is what makes the
service layer unit-testable with a plain mock (see
`src/tests/domains/ticket.service.test.ts`) instead of the
hand-reimplemented mock classes Phase 10 used for services that lazily
import their own repository.

### Database: RPCs for every mutation, not client-side read-then-write

Every ticket state change (`generate_ticket_for_registration`,
`check_in_ticket`, `cancel_ticket`, `reissue_ticket`) is a `SECURITY
DEFINER` Postgres function, not a plain `.from("tickets").update(...)`
call from application code. `check_in_ticket()` specifically row-locks the
ticket (`select ... for update`) for the transaction's duration — this is
not optional: two volunteers scanning the same physical ticket at the same
gate at the same moment is a normal event-day occurrence, not an edge
case, and a read-then-write from application code would race under that
load. See `supabase/migrations/202607160002_ticketing_rpc_functions.sql`'s
header comment for the full reasoning.

### Ticket generation: a database trigger, not an application-code call site

A trigger on `event_registrations` (`AFTER INSERT OR UPDATE OF status`)
generates a ticket automatically when a registration's status becomes
`confirmed`/`registered`. This was chosen over calling
`generateTicket()` from every place a registration can be confirmed
(the public registration API, any future admin approval flow, direct
database edits) because there are already multiple such places in this
codebase (see `docs/architecture/PHASE11_COMPLIANCE_REPORT.md`'s findings
on how much registration/event logic bypasses the service layer) and a
trigger is the one place guaranteed to fire regardless of which path
confirms a registration. `ITicketService.generateTicket()` and
`generateMissingTicketsForEvent()` still exist for manual/backfill
generation — e.g. an organiser enabling ticketing on an event that already
has registrations, where the trigger never fired because
`ticketing_enabled` was false at registration time.

### No sequential IDs in QR codes

`qr_token` is `encode(gen_random_bytes(32), 'hex')` — a 256-bit random
value, unrelated to the ticket's row id. `ticket_code` (the short,
human-typeable fallback for manual entry) is also randomly generated, not
sequential, though with meaningfully less entropy than `qr_token` by
design — it's meant to be read and typed by a person, not to carry the
same security weight. See the schema migration's design notes for the
full reasoning on why these are two different things with different
guarantees, not interchangeable.

### Offline-first scanner architecture

Three-layer split, each independently testable:

1. **`src/lib/offlineScanLogic.ts`** — pure functions (manifest lookup,
   optimistic check-in, conflict resolution when merging a fresh manifest
   against a pending local queue). Zero I/O, fully unit-tested
   (`src/tests/lib/offlineScanLogic.test.ts`, 21 tests) without a browser.
2. **`src/lib/offlineTicketStore.ts`** — native IndexedDB I/O (no `idb`
   wrapper library — the two-object-store surface area here didn't
   justify a new dependency). Persists the downloaded manifest and the
   local scan queue.
3. **`src/lib/offlineSyncEngine.ts`** — flushes the queue to
   `POST /api/tickets/sync` once online, de-duplicating concurrent sync
   attempts into one in-flight request.

`ticket_scans.client_scan_id` (a client-minted UUID, one per physical
scan, reused across retries) is what makes a retried or duplicated sync
request safe — `check_in_ticket()` checks it first and returns the
original result for a replay rather than re-evaluating, which is what
actually prevents "flaky connection turns one scan into two check-ins"
rather than anything client-side.

### QR content and ticket page access

The QR encodes `https://<origin>/ticket/<qr_token>` (the permanent ticket
URL), never participant data. `GET /api/tickets/get` resolves a ticket by
token without requiring authentication — the token itself (256 bits of
randomness) is treated as the credential, the same trust model as a
calendar invite link or a boarding pass URL. A logged-in participant's own
tickets are also reachable via `GET /api/tickets/my` + `/my-tickets` (the
"access from your dashboard" requirement), which does require auth and
only ever returns the caller's own tickets.

### Scanner authorization: a new `event_staff` allowlist, not just event ownership

The rest of this codebase's organiser checks are all `event.created_by ===
user.id` (see `docs/architecture/PHASE11_COMPLIANCE_REPORT.md`). That's
insufficient for scanning specifically — a real event has multiple
volunteers checking people in at once, not just the founder. `event_staff`
(`event_id, user_id, role, granted_by`) lets an organiser grant scanner
access to volunteers without making them a co-owner of the event.
Authorization for `/scanner` and `/events/:slug/tickets` is: global admin,
OR event owner, OR an `event_staff` row — checked server-side in every
`api/tickets/*.ts` route (`api/tickets/_utils.ts`'s
`isAuthorizedTicketStaff`), never trusted from the client.

### Rate limiting reuses the existing quota RPC

`POST /api/tickets/checkin` calls the same `check_and_increment_quota` RPC
`api/events/register.ts` and `api/events/create.ts` already use, under a
new `"ticket_checkin"` action key, rather than introducing separate
rate-limiting infrastructure. This RPC's source isn't in this repo (see
`docs/architecture/PHASE11_COMPLIANCE_REPORT.md` on undocumented schema
created directly in the Supabase dashboard), so its default per-action
daily limit is unknown from the codebase alone — if scanning gets rate
limited during a real event, the fix is raising the `"ticket_checkin"`
action's limit server-side, not removing the check. `POST
/api/tickets/sync` (the offline batch-sync endpoint) deliberately skips
this check — a device back online after an hour offline may have dozens
of legitimate scans to flush in one request, which a per-request quota
isn't sized for.

## Consequences

- **Amendment**: the 13 `api/tickets/*.ts` routes described above were
  originally separate files, one per action. The first production deploy
  failed Vercel's Hobby-plan limit of 12 Serverless Functions per
  deployment (13 ticket routes + 7 pre-existing routes = 20). They were
  consolidated into a single dynamic-route file,
  `api/tickets/[action].ts`, dispatching internally on `req.query.action`
  — see its file header for the mechanics. URLs, request/response shapes,
  and authorization logic are all unchanged; this was purely a
  deployment-platform constraint, not a design change. New ticket actions
  should be added as a new `handleX` function + `HANDLERS` entry inside
  that file, not as a new file under `api/tickets/`.

- Every requirement in the original task is implemented: enable ticketing
  per event, automatic + manual ticket generation, the participant ticket
  page (QR/download/print/dashboard access), the `/scanner` PWA (camera +
  manual entry + offline queue + auto-sync), check-in audit logging
  (`ticket_scans`), the admin dashboard (`/events/:slug/tickets`: stats,
  search, revoke, reissue, CSV export), gaming metadata on tickets, and
  A6 badge printing (`/events/:slug/badges`).
- No new runtime dependencies — `qrcode`, `react-qr-code`, `jsqr`, and
  `html2canvas` were already in `package.json`, unused. The PWA layer
  (`public/sw.js`, `public/manifest.webmanifest`) is hand-written rather
  than using a build plugin like `vite-plugin-pwa`, for the same reason.
- **Known gap**: the offline scanner's IndexedDB-cached manifest can go
  stale if a ticket is cancelled/reissued *after* the manifest was
  downloaded but *before* the device goes offline — a scanner that never
  reconnects before the event ends would accept a since-cancelled ticket.
  This is an inherent tradeoff of "must work with zero connectivity," not
  a bug: there's no way to learn about a server-side change without a
  network round-trip. Mitigation is operational (re-download the manifest
  periodically while online, which `Scanner.tsx` does on event/gate
  selection and could be extended to a manual "refresh" button), not
  architectural.
- **Known gap**: `event_staff`-granted volunteers currently get one flat
  set of scanner permissions — there's no distinction between "can scan"
  and "can also revoke/reissue tickets from the admin dashboard." The
  `event_staff.role` column (`organizer`/`volunteer`/`staff`) exists for
  future use here but isn't yet checked anywhere beyond "is this person
  in the table at all" — `isAuthorizedStaff` and `isAuthorizedTicketStaff`
  don't differentiate by role. Worth a follow-up RFC if finer-grained
  permissions become necessary.
- Following ADR 0002's dependency rules, no page imports
  `SupabaseTicketRepository` or `TicketServiceImpl` directly — pages use
  `resolveService<ITicketService>("TicketService")` or, for
  server-side/API-route code (which runs in a separate bundle and can't
  reach the browser DI registry at all), the routes in `api/tickets/`
  re-implement the same authorization logic against the admin client
  directly (`api/tickets/_utils.ts`) — the same client/server duplication
  pattern already noted for `PermissionServiceImpl` in
  `docs/architecture/PHASE11_COMPLIANCE_REPORT.md`, not a new one.
