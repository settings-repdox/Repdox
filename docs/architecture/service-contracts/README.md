# Service Contracts

Every service resolved via `resolveService()` (`src/core/services/di.ts`,
ADR 0003) implements an interface. This doc is the map of which interface
lives where, and — important — it documents an inconsistency found during
the Phase 11 audit rather than a clean, uniform pattern. Read this before
adding a new service so you don't have to guess which of the two existing
patterns to follow (see Recommendation at the bottom).

## Pattern A: interface owned by `src/core/services/interfaces/`, implementation split across layers

Six of ten registered services have both interface and implementation
inside `src/core/services/`:

| Service key | Interface | Implementation |
|---|---|---|
| `AuthService` | `core/services/interfaces/IAuthService.ts` | `core/services/impl/AuthService.ts` |
| `UserService` | `core/services/interfaces/IUserService.ts` | `core/services/impl/UserServiceImpl.ts` |
| `PermissionService` | `core/services/interfaces/IPermissionService.ts` | `core/services/impl/PermissionServiceImpl.ts` |
| `NotificationService` | `core/services/interfaces/INotificationService.ts` | `core/services/impl/NotificationServiceImpl.ts` |
| `AnalyticsService` | `core/services/interfaces/IAnalyticsService.ts` | `core/services/impl/AnalyticsServiceImpl.ts` |
| `AssetService` | `core/services/interfaces/IAssetService.ts` | `core/services/impl/AssetServiceImpl.ts` |

These are not "domains" in the ADR 0002 sense (no `src/domains/<name>/`
folder) — they're cross-cutting platform services that live directly under
`core`. That's a defensible choice on its own (auth, permissions,
notifications, analytics, and file uploads aren't really "business
domains" the way events/gaming/registrations/production are) — but it
means "domain" and "service" aren't interchangeable terms in this codebase,
despite Phase 9/10 docs sometimes using them that way.

One exception within this group: **`RegistrationService`**'s
implementation lives in `src/domains/registrations/impl/RegistrationServiceImpl.ts`
(a real domain folder), but its interface, `IRegistrationService`, is
defined in `core/services/interfaces/IRegistrationService.ts` — split
across the Pattern A / Pattern B boundary below. This is almost certainly
an artifact of `registrations` being migrated out of `core` before its
interface was, rather than a deliberate design — see Recommendation.

## Pattern B: interface and implementation both inside the domain folder

Three domains keep their full contract self-contained:

| Service key | Interface | Implementation |
|---|---|---|
| `EventService` | `domains/events/interfaces/IEventService.ts` | `domains/events/impl/EventServiceImpl.ts` |
| `GamingService` | `domains/gaming/interfaces/IGamingService.ts` | `domains/gaming/impl/GamingServiceImpl.ts` |
| `ProductionService` | `domains/production/interfaces/IProductionService.ts` | `domains/production/impl/ProductionServiceImpl.ts` |

This is the pattern ADR 0002 describes and the one new domains should
follow (see Recommendation).

`ProductionServiceImpl` also depends on `IEventService` (Pattern B,
`domains/events/interfaces/`) to look up event data — resolved via
`resolveService<IEventService>("EventService")`, never a direct import of
`EventServiceImpl`. This is the reference example of the allowed
domain-to-domain contract dependency described in ADR 0002.

## A dead duplicate: do not use `core/services/interfaces/IEventService.ts`

`src/core/services/interfaces/IEventService.ts` **also exists**, with a
different (older, thinner) method set than `domains/events/interfaces/IEventService.ts`
— `getEventDetails`/paginated `listEvents` vs. the real one's
`getEventBySlug`/`getEvent`/`listEvents`/`createEvent`/`updateEvent`/
`deleteEvent`/`transitionLifecycle`. Nothing in the codebase imports the
`core` copy — `EventServiceImpl` implements the `domains/events` one, and
that's the one `ProductionServiceImpl` depends on. This is leftover from
before the `events` domain was extracted from `core` and was never deleted
in the migration. **It should be deleted** — flagged here rather than
removed in this pass since Phase 11 is documentation, not a code change;
see `docs/architecture/PHASE11_COMPLIANCE_REPORT.md`.

## Recommendation for new services

Follow **Pattern B**: put both the interface and implementation inside
`src/domains/<name>/interfaces/` and `src/domains/<name>/impl/`, even if
the service doesn't feel like a "big" domain. It's the more consistent
pattern, it's what ADR 0002 documents, and it avoids the
interface-in-one-layer/implementation-in-another split that happened with
`RegistrationService`. Reserve `src/core/services/` for genuinely
cross-cutting platform concerns (auth, permissions) where a
`src/domains/` folder would be a stretch — and even then, prefer creating
`src/domains/<name>/interfaces/` for just the interface if a future domain
needs to depend on it via the public-contract pattern.

## All ten, for reference

Registered in `src/core/services/registerDefaults.ts`, verified resolvable
by `src/tests/architecture/domain-service-registration.test.ts` (Phase 10):
`AuthService`, `UserService`, `PermissionService`, `NotificationService`,
`AnalyticsService`, `AssetService`, `EventService`, `GamingService`,
`RegistrationService`, `ProductionService`.
