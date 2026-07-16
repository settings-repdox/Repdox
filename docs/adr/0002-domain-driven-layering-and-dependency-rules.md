# ADR 0002: Domain-Driven Layering and Dependency Rules

Date: 2026-07-15 (retroactive — documents decisions made across Phases 2-9)

## Status

Accepted, with one known deviation tracked as a technical debt item (see
Consequences and `docs/architecture/PHASE11_COMPLIANCE_REPORT.md`).

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
- **Known deviation, accepted for now**: `src/core/services/registerDefaults.ts`
  (the composition root that wires concrete `*Impl` classes into the DI
  registry) imports directly from all four domains' `impl/` folders. That's
  a literal "core → domains" import, which the rule above forbids. This is
  arguably unavoidable for a composition root — *something* has to import
  concrete implementations to register them — but as written it lives
  inside `src/core`, so it reads as a rule violation rather than a
  documented exception. RFC 0001 proposes moving it to a dedicated location
  the dependency rules explicitly carve out. Until that's resolved, treat
  this one file as the sanctioned exception, not a precedent for other
  `core` files importing `domains`.
- **Known deviation, not yet fixed**: 25 files under `src/pages` and
  `src/components` still import `@/integrations/supabase` directly (the
  Supabase client, bypassing domain services entirely), and 5 of those also
  import the legacy `@/lib/tournamentService`. This was true before Phase 9
  and Phase 9's completion report claims full compliance
  ("Pages → Domains / Core / Shared ✅") without having actually re-checked
  every page — Phase 11's audit found the gap. See
  `docs/architecture/PHASE11_COMPLIANCE_REPORT.md` for the full file list
  and `docs/architecture/dependency-rules.md` for the corrected compliance
  status.
- Only `infrastructure` isolation is currently enforced by an automated
  test. The `pages`/`components` → `supabase` rule and the `core` → `domains`
  rule have no automated check yet — both are asserted in docs only. Adding
  tests for these is recommended for Phase 12 (see RFC 0001).
