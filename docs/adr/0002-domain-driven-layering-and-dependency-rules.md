# ADR 0002: Domain-Driven Layering and Dependency Rules

Date: 2026-07-15 (retroactive — documents decisions made across Phases 2-9)

## Status

Accepted. Both known deviations noted below have since been resolved —
see ADR 0008 (composition root relocation) and
`docs/architecture/PHASE11_COMPLIANCE_REPORT.md`'s tracked cleanup (the
`pages`/`components` → `supabase` bypass) for what changed and when.

## Context

ADR 0001 scaffolded the target directory structure (`src/modules`,
`src/services`, `src/shared`, `src/integrations`, `src/infrastructure`) but
didn't specify the actual layering rules or migrate any code. Phases 2-9
did the real work: introducing `src/core`, `src/domains/{events,gaming,
production,registrations}`, and a dependency-direction policy, then
migrating `EventService`, `GamingService`, `RegistrationService`, and
`ProductionService` off the old flat `src/lib/` layer into that structure.
None of this was captured as a formal decision at the time — this ADR
records it after the fact, sourced from `docs/architecture/dependency-rules.md`,
`docs/architecture/phase9-completion-report.md`, and the current codebase.

## Decision

Adopt a layered architecture with one-directional dependency flow:

```
pages/components  →  domains  →  core  →  shared
                  ↘            ↗
                    infrastructure
```

Rules (as implemented and partially automated — see Consequences):

- **`pages`/`components`** may import from `domains`, `core`, and `shared`.
  They must not import `infrastructure` or `@/integrations/supabase`
  directly — data access goes through a domain service resolved via
  `resolveService()`.
- **`domains/<name>`** may import `core` and `shared` freely, and another
  domain's `interfaces/` (its public contract) — but never another domain's
  `impl/`. Cross-domain calls happen by resolving the other domain's
  interface through DI (`src/domains/production/impl/ProductionServiceImpl.ts`
  importing `IEventService` and resolving `"EventService"` is the reference
  example).
- **`core`** may import `shared`, but not `domains`.
- **`infrastructure`** may import `shared`, but not `domains` or `core`.
  Enforced automatically by `verifyInfrastructureIsolation()`
  (`src/infrastructure/verifyArchitecture.ts`), which is run as
  `src/tests/architecture/infrastructure-isolation.test.ts` in Phase 10's
  suite.
- **`shared`** has no outward dependencies on the other layers.

## Consequences

- Domains are independently testable (Phase 10's `event.service.test.ts`,
  `gaming.service.test.ts`, `registration.service.test.ts` mock the
  repository layer and never touch a real Supabase client).
- New domains have a clear template to follow: `dtos/`, `interfaces/`,
  `impl/`, optionally `__tests__/`.
- **Resolved deviation**: `src/core/services/registerDefaults.ts` (the
  composition root that wires concrete `*Impl` classes into the DI
  registry) used to import directly from all four domains' `impl/`
  folders while physically living inside `src/core` — a literal
  "core → domains" import the rule above forbids, arguably unavoidable
  for a composition root but reading as a bare violation rather than a
  documented exception. Resolved by ADR 0008: the file moved to
  `src/bootstrap/registerDefaults.ts`, a new layer the dependency rules
  explicitly exempt from this rule, with an automated check
  (`verifyBootstrapIsolation()`) enforcing that nothing outside
  `src/bootstrap` (besides test files, which legitimately unit-test
  implementations directly) does the same thing.
- **Resolved deviation**: 25 files under `src/pages` and `src/components`
  used to import `@/integrations/supabase` directly (the Supabase client,
  bypassing domain services entirely), and 5 of those also imported the
  legacy `@/lib/tournamentService`. This was true before Phase 9 and
  Phase 9's completion report claimed full compliance
  ("Pages → Domains / Core / Shared ✅") without having actually
  re-checked every page — Phase 11's audit found the gap. All ~25 files
  have since been migrated onto proper domain services (see
  `docs/architecture/dependency-rules.md` for the remaining narrow,
  reviewed exceptions — direct Supabase auth/realtime calls with no
  domain-service equivalent, and the `Volunteers.tsx` legacy-project
  migration). See `docs/architecture/PHASE11_COMPLIANCE_REPORT.md` for
  the original file list this was audited against.
- `infrastructure` and `bootstrap` isolation are both enforced by
  automated tests as of ADR 0008 (`verifyInfrastructureIsolation()` and
  `verifyBootstrapIsolation()` respectively). The `pages`/`components` →
  `supabase` rule still has no automated check — it's asserted in docs
  only, tracked for a future RFC per
  `docs/architecture/dependency-rules.md`.
