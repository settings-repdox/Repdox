# Dependency Rules

Mandatory repository dependency directions for Repdox. This is the rules
document; `docs/architecture/PHASE11_COMPLIANCE_REPORT.md` is the current
audit against these rules (last run: Phase 11) — check there for
today's actual compliance status, since some violations below are known
and still open, not resolved by this document existing.

## Allowed dependency flow

- `pages` / `components` → `domains` / `core` / `shared`
- `domains` → `core` / `shared`
- `domains` → another domain's `interfaces/` only (never another domain's
  `impl/`), resolved via `resolveService()` — never a direct class import.
  Reference example: `ProductionServiceImpl` depends on `IEventService`.
- `core` → `shared`
- `infrastructure` → `shared`
- `domains` / `core` → `infrastructure` only through
  `infrastructure/di.ts`'s `resolveAdapter()`, never a direct import of an
  adapter implementation.
- `bootstrap` → everything (`domains`, `core`, `infrastructure`, `shared`).
  This is the composition root — the one layer allowed to import concrete
  `*Impl` classes directly, in order to wire them into the DI registry
  (`registerService()`/`registerAdapter()`). See ADR 0008.

## Disallowed dependencies

- `pages` / `components` → `infrastructure`
- `pages` / `components` → `@/integrations/supabase` (the raw Supabase
  client) — go through a domain service instead.
- `domain A` → `domain B`'s `impl/` (its `interfaces/` is fine — see above)
- `core` → `domains`
- `infrastructure` → `pages` / `components`
- `infrastructure` → `domains` / `core`
- anything outside `bootstrap` → any domain's `impl/` directly. Resolve
  through `resolveService()` instead. (Test files under `src/tests/` that
  unit-test a concrete `*ServiceImpl` on purpose are the one expected
  exception to this — see the automated check below.)

## Automated enforcement

- **`infrastructure` → `domains`/`core` isolation**:
  `verifyInfrastructureIsolation()` (`src/infrastructure/verifyArchitecture.ts`),
  run as `src/tests/architecture/infrastructure-isolation.test.ts`
  (Phase 10) and via `npm run verify:infra`.
- **`bootstrap` isolation** (no file outside `src/bootstrap` imports a
  concrete `@/domains/*/impl/*` class, except test files under
  `src/tests/`, which legitimately unit-test implementations directly):
  `verifyBootstrapIsolation()` (`src/bootstrap/verifyArchitecture.ts`),
  run as `src/tests/architecture/bootstrap-isolation.test.ts`
  (RFC 0001 / ADR 0008) and via `npm run verify:bootstrap`.

Everything else is enforced by code review and this document only. RFC
0002/the standards doc recommend the same automated-check treatment for
the `pages` → `supabase` rule eventually.

## Known exceptions and violations (as of Phase 11 — see compliance report for detail)

- **`core` → `domains`**: resolved. The composition root
  (`registerDefaults()`) lives in `src/bootstrap/registerDefaults.ts`, not
  `src/core`, as of RFC 0001 / ADR 0008. `core` itself now has no `domains`
  imports at all, and `verifyBootstrapIsolation()` (above) enforces that
  going forward — this is no longer just a documented convention.
- **`pages`/`components` → `supabase`**: resolved. The ~25 files that
  bypassed domain services by importing `@/integrations/supabase` or the
  legacy `@/lib/tournamentService` directly (see
  `docs/architecture/PHASE11_COMPLIANCE_REPORT.md` for the original file
  list) have all been migrated onto proper domain services, with two
  categories of narrow, reviewed exceptions that remain and are not
  considered violations of this rule: (1) direct
  `supabase.auth.*`/`supabase.channel()` calls, which are genuine
  session/realtime infrastructure with no domain-service equivalent
  (`AuthContext.tsx`, `EventRegister.tsx`, `MatchCentre.tsx`,
  `login-form.tsx`, `EmailChangeModal.tsx`); and (2) `Volunteers.tsx`,
  which previously talked to an entirely separate legacy Supabase project
  and now goes through a proper `IVolunteerService` against this
  project's own `volunteer_applications` table. This rule does not yet
  have an automated check (see RFC 0002/the standards doc above).

## Key rules (unchanged from earlier phases)

- Domain modules own their public contracts (their `interfaces/` folder).
- Production consumes domain state (via `IEventService`) but does not own
  event domain data or write to it directly.
- Core provides shared cross-cutting concerns only — the composition root
  lives in `bootstrap`, not `core` (see above).
- Infrastructure is a runtime concern (broadcast adapters, Supabase client)
  and should be accessed through adapters/services, never imported
  directly by UI code.

