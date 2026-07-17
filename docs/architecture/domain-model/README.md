# Domain Model

The core entities per domain, as DTOs actually defined in the codebase
(`src/shared/dtos/` and `src/domains/*/dtos/`) — not an idealized model.

## Events (`src/domains/events`)

`EventDTO` (`src/shared/dtos/event.dto.ts`): id, title, slug, `type`
(`Json` — see "Event type inconsistency" below), `format`, start/end
times, registration window, check-in window, location, description fields
(`short_blurb`, `overview`, `long_description`, `rules`), `sponsors`/`faqs`
(both `Json`), and more.

`EventLifecycle`: `draft → published → registration_open → in_progress →
completed` (or `cancelled` from any state). `IEventService.transitionLifecycle()`
is the only sanctioned way to move an event between these states.

### Event type inconsistency (found during Phase 11 audit)

Three different representations of "what kind of event is this" exist and
don't agree:

1. **`EventDTO.type`**: typed as `Json` (i.e., effectively untyped at the
   TypeScript level) in `event.dto.ts`.
2. **`EventType`** (also in `event.dto.ts`): a separate exported union,
   `"gaming" | "hackathon" | "workshop" | "other"` — **lowercase**.
3. **The actual Postgres enum** (`src/integrations/supabase/types.ts`):
   `event_type: "Hackathon" | "Workshop" | "Gaming"` — **capitalized**,
   and has no `"other"` value. This is also what `AddEvent.tsx`'s UI uses
   (`["Hackathon", "Workshop", "Gaming"]`).

`isGamingEvent()` (`src/lib/tournamentService.ts`) works around this by
lowercasing whatever it receives before comparing against `"gaming"`,
which is why it happens to work despite the mismatch — but `EventType`
as exported from `event.dto.ts` does not actually describe the real data
and shouldn't be used for a type-safe switch over an event's category.
Prefer comparing against the capitalized values, or use `isGamingEvent()`
rather than a raw string comparison. See
`docs/architecture/PHASE11_COMPLIANCE_REPORT.md`.

## Gaming / Tournaments (`src/domains/gaming`)

See ADR 0004 for the extraction history. Three record types
(`src/domains/gaming/dtos/tournament.dto.ts`):

- `TournamentRecord` — one per Gaming event. `status`
  (`registration_open → registration_closed → bracket_generated → live →
  completed`), `tournament_type` (`Single Elimination` | `Double
  Elimination` | `Round Robin`), `bracket_url` (real column as of ADR
  0004), `bracket_link` (legacy read-only fallback, not a real column).
- `TournamentTeamRecord` — one per team in a tournament: captain, up to 5
  players + substitutes, `riot_ids`, `checked_in`, `team_seed`.
- `TournamentMatchRecord` — one per match: round/match number, two teams,
  scores, `winner_id`, `match_status` (`upcoming | live | completed |
  disputed`).

All three DTOs carry a `[key: string]: unknown` index signature — see ADR
0004's Consequences for why that's a pragmatic-but-risky choice.

## Registrations (`src/domains/registrations`, contract in `src/core/services/interfaces/IRegistrationService.ts`)

`RegistrationDTO` (`src/shared/dtos/registration.dto.ts`): one row per
person/team registered for an event. Notably a **superset** covering both
Hackathon-style fields (`school`, `year`, `stream`, `motivation`, `github`,
`linkedin`, `teamId`/`teamName`, `expectedMembers`) and generic ones
(`status`, `role`, `participationMode`) in a single flat DTO — there's no
per-event-type variant. This mirrors the registration *form*'s own
history: `src/pages/EventRegister.tsx` originally rendered Hackathon-only
fields regardless of event type (a bug fixed in a prior session — the
"Team Composition" section is now gated behind `!isGaming`). The DTO being
a single flat shape for every event type is the underlying reason that
class of bug was easy to introduce: nothing in the type system forces a
Gaming registration to omit `github`/`linkedin`/`teamName`.

## Production / Broadcast (`src/domains/production`)

`IProductionService` (`src/domains/production/interfaces/IProductionService.ts`),
DTOs in `src/shared/dtos/production.dto.ts`: `BroadcastSession` (schedule/
start/stop lifecycle), `ReplayEntry` (schedule/capture), `ObserverInfo`
(who's watching/producing), `GraphicPayload`/`OverlayState`/`AudioState`
(on-broadcast visual/audio state), `StreamStatus`/`MonitoringStatus`,
`OrchestratorResult`. This is the domain-service layer that would sit on
top of the broadcast *infrastructure* adapters (ADR 0005,
`docs/architecture/broadcast/README.md`) — the domain models the business
concepts (a scheduled broadcast, a replay), the infrastructure layer models
the technical plumbing (an SRT session, an OBS connection). Depends on
`IEventService` (Pattern B, see `docs/architecture/service-contracts/README.md`)
to associate broadcasts/replays with real events.

## Tickets & Check-in (`src/domains/tickets`)

See ADR 0007 for the full design. `TicketDTO`
(`src/domains/tickets/dtos/ticket.dto.ts`): one row per confirmed
registration once ticketing is enabled on the event, generated
automatically by a database trigger. `status`
(`VALID → USED` on check-in, or `→ CANCELLED` from either state — a
cancelled ticket never becomes valid again). `qr_token` (256-bit random,
the QR/URL credential) and `ticket_code` (shorter, human-typeable, less
entropy by design) are two different fields with two different security
properties — never treat them as interchangeable. Optional `gaming_meta`
(team/game/IGN/seat/Discord/Steam ID) for Gaming events, shown to the
scanner at check-in.

`ticket_scans` is the full audit trail — every scan attempt (not just
successful check-ins) is logged with its result
(`VALID`/`DUPLICATE`/`CANCELLED`/`WRONG_EVENT`/`INVALID`), including scans
that never matched a real ticket at all.

`event_staff` grants scanner/dashboard access to volunteers without making
them event co-owners — see ADR 0007's "Scanner authorization" section for
why this is a separate table rather than reusing `events.created_by`.

## Cross-cutting: Auth / User / Permission / Notification / Analytics / Asset

Not modeled as domains with their own DTOs in `src/domains/` — see
`docs/architecture/service-contracts/README.md` for why and where they
actually live (`src/core/services/`). `UserDTO` (used by
`IAuthService`/`IUserService`) is the one shared type among this group,
defined in `src/shared/dtos/` alongside the domain DTOs above.
