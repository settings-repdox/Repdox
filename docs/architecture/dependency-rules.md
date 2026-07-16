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

## Disallowed dependencies

- `pages` / `components` → `infrastructure`
- `pages` / `components` → `@/integrations/supabase` (the raw Supabase
  client) — go through a domain service instead.
- `domain A` → `domain B`'s `impl/` (its `interfaces/` is fine — see above)
- `core` → `domains`
- `infrastructure` → `pages` / `components`
- `infrastructure` → `domains` / `core`

## Automated enforcement

Only one of the rules above currently has an automated test:

- **`infrastructure` → `domains`/`core` isolation**:
  `verifyInfrastructureIsolation()` (`src/infrastructure/verifyArchitecture.ts`),
  run as `src/tests/architecture/infrastructure-isolation.test.ts`
  (Phase 10) and via `npm run verify:infra`.

Everything else is enforced by code review and this document only. RFC
0001 proposes extending automated checks to cover the `core` → `domains`
rule (once the one sanctioned exception, the composition root, has a
proper home) and RFC 0002/the standards doc recommend the same treatment
for the `pages` → `supabase` rule eventually.

## Known exceptions and violations (as of Phase 11 — see compliance report for detail)

- **`core` → `domains`, sanctioned exception**:
  `src/core/services/registerDefaults.ts` (the composition root) imports
  concrete `*Impl` classes from all four `src/domains/*` folders to wire
  them into the DI registry. This is the one place in the codebase that
  legitimately needs to know about concrete implementations. It currently
  lives inside `src/core`, which makes it read as a bare rule violation
  rather than a documented exception — RFC 0001 proposes relocating it to
  a new `src/bootstrap/` layer that's explicitly exempted from this rule.
  Until that lands, treat only this one file as exempt; it is not
  precedent for any other file under `core`.
- **`pages`/`components` → `supabase`, NOT sanctioned, not yet fixed**:
  25 files under `src/pages` and `src/components` import
  `@/integrations/supabase` directly (bypassing domain services entirely),
  and 5 of those also import the legacy `@/lib/tournamentService`. This
  predates Phase 9 and was not caught by that phase's completion report,
  which claimed full compliance without re-auditing every page. See
  `docs/architecture/PHASE11_COMPLIANCE_REPORT.md` for the full file list.
  Not fixed in Phase 11 (documentation phase, not a refactor) — recommended
  as a Phase 12 priority given its size (nearly a quarter of all
  pages/components).

## Key rules (unchanged from earlier phases)

- Domain modules own their public contracts (their `interfaces/` folder).
- Production consumes domain state (via `IEventService`) but does not own
  event domain data or write to it directly.
- Core provides shared cross-cutting concerns and the composition root
  (pending RFC 0001) only — not business logic for a specific domain.
- Infrastructure is a runtime concern (broadcast adapters, Supabase client)
  and should be accessed through adapters/services, never imported
  directly by UI code.
