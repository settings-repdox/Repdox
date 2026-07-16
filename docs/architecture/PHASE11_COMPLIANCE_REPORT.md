# Phase 11 — Final Architecture Compliance Report

Generated at the end of Phase 11 (Documentation & Operations). This is a
point-in-time audit against the rules in
`docs/architecture/dependency-rules.md`, run by grepping the actual
codebase rather than trusting prior phases' self-reported status — Phase
9's completion report claimed full dependency-rule compliance
("Pages → Domains / Core / Shared ✅") without this having been
re-verified against every file, which is exactly the kind of doc/code
drift this report exists to catch and prevent going forward.

**This is a snapshot, not a living document.** If you fix an item below,
update this file in the same PR (see `docs/operations/handbook.md`).

## Most significant finding: a fix that was documented before it existed

While drafting this report, a doc cross-reference check (verifying every
file path mentioned across `docs/` actually exists in the repository)
found that `supabase/migrations/202607150001_add_bracket_url_to_events.sql`
— referenced by ADR 0004 and a runbook as the fix for the `bracket_url`
Supabase error — did not exist. Neither did the corresponding
`src/integrations/supabase/types.ts` change. The bug had been correctly
diagnosed in an earlier session, but that session was interrupted before
the fix was committed, and later work (Phase 10's tests, early Phase 11
drafts) proceeded as though it had been. This was caught and corrected
within this same phase — the real fix (migration, types update, removing
three separate type-cast workarounds across two code paths in
`EventTournament.tsx`) was applied and verified (full test suite +
production build) before this report was finalized. See ADR 0004's
"Timeline note" and item 6 below for the full account.

This is called out prominently because it's the best evidence for why
Phase 11 exists: not just writing docs, but checking them against reality
before trusting them — the same discipline that caught Phase 9's
inaccurate compliance claim (see Dependency rule audit below) also caught
this. It's worth treating as a standing practice, not a one-time audit.

## Automated checks (`npm test`, `npm run build`)

| Check | Result |
|---|---|
| `npm test` (90 tests, 8 Vitest suites) | ✅ All passing |
| `npm run verify:infra` (infrastructure isolation) | ✅ Passing |
| `npm run verify:production-deps` (all 10 domain services resolve via DI) | ✅ Passing |
| `npm run build` | ✅ Succeeds (bundle-size warnings only, not errors) |
| `npx playwright test --list` (4 E2E specs) | ✅ Valid, not executed (see `TECHNICAL_DEBT_PHASE10.md`) |

## Dependency rule audit (manual grep-based, not yet automated beyond infra isolation)

| Rule | Status | Detail |
|---|---|---|
| `infrastructure` → `domains`/`core` isolation | ✅ Enforced automatically | `verifyInfrastructureIsolation()`, tested |
| `domain A` → `domain B`'s `impl/` | ✅ Compliant | Only cross-domain dependency found is `ProductionServiceImpl` → `IEventService` (an interface, not an impl) — the correct pattern |
| `core` → `domains` | ⚠️ One known, documented exception | `src/core/services/registerDefaults.ts` imports 4 domains' `*Impl` classes (the composition root). Not automated-checked. RFC 0001 proposes relocating it to a new `src/bootstrap/` layer that's explicitly exempt, rather than leaving it as an undistinguished exception inside `core`. |
| `pages`/`components` → `@/integrations/supabase` | ❌ Violated, not fixed this phase | **25 files** import the raw Supabase client directly (list below). 5 of those also import the legacy `@/lib/tournamentService`. This predates Phase 9; Phase 9's completion report's compliance claim did not hold up under this audit. Not automated-checked. |

### The 25 files importing `@/integrations/supabase` directly

```
src/components/CurrentEventsStrip.tsx
src/components/EmailChangeModal.tsx
src/components/Nav.tsx
src/components/OrganizerRegistrations.tsx
src/components/OrganizerTeams.tsx
src/components/RSVPAnalytics.tsx
src/components/RSVPForm.tsx
src/components/RecentlyViewedEvents.tsx
src/components/login-form.tsx
src/pages/AddEvent.tsx
src/pages/AuthCallback.tsx
src/pages/Dashboard.tsx
src/pages/DiscordLink.tsx
src/pages/EventDetail.tsx
src/pages/EventRegister.tsx
src/pages/EventRegistrations.tsx
src/pages/EventTeams.tsx
src/pages/EventTournament.tsx
src/pages/EventsList.tsx
src/pages/MatchCentre.tsx
src/pages/MyEvents.tsx
src/pages/Notifications.tsx
src/pages/Profile.tsx
src/pages/VerifyEmail.tsx
src/pages/Volunteers.tsx
```

Of these, 5 also import the legacy `@/lib/tournamentService` directly:
`AddEvent.tsx`, `EventDetail.tsx`, `EventRegister.tsx`,
`EventTournament.tsx`, `MatchCentre.tsx` — unsurprisingly, the
gaming/tournament-heavy pages, since `tournamentService.ts` predates the
`gaming` domain's extraction (ADR 0004) and nothing has migrated these
call sites to `GamingService` yet.

**Not fixed in this phase** — Phase 11 is documentation and operations,
not a refactor. Recommended as the top code-level priority for Phase 12
given its size (roughly a quarter of all pages/components) and because it
undermines the entire point of having domain services (testability,
swappable implementations) for the pages that don't go through them.

## Documentation-vs-implementation mismatches found and fixed this phase

1. **Dead scaffolding never flagged**: `src/services/` (top-level) and
   `src/modules/platform/*` are Phase 1 scaffolding that nothing imports —
   the real implementation went into `src/core/services/` and
   `src/domains/` instead, and nobody deleted or repurposed the original
   scaffold. Now documented in `docs/architecture/overview.md`'s "What
   Phase 1 scaffolded but never got used" section. **Not deleted** in this
   phase (documentation only) — recommended for Phase 12.
2. **Two incompatible `IEventService` interfaces**: `src/core/services/interfaces/IEventService.ts`
   (stale, unused, different method set) vs.
   `src/domains/events/interfaces/IEventService.ts` (the real one,
   implemented by `EventServiceImpl` and depended on by
   `ProductionServiceImpl`). Nothing imports the `core` copy. Now
   documented in `docs/architecture/service-contracts/README.md`. **Not
   deleted** in this phase — recommended for Phase 12.
3. **Inconsistent interface placement**: 3 of 4 domains (events, gaming,
   production) keep their interface inside their own domain folder;
   `registrations` does not — its interface (`IRegistrationService`) lives
   in `core/services/interfaces/` while its implementation lives in
   `src/domains/registrations/impl/`. Now documented in
   `docs/architecture/service-contracts/README.md` with a stated
   recommendation (follow the events/gaming/production pattern for new
   services).
4. **`EventType` casing mismatch**: `EventDTO`'s exported `EventType`
   union (`"gaming" | "hackathon" | "workshop" | "other"`, lowercase)
   doesn't match the actual Postgres enum (`"Hackathon" | "Workshop" |
   "Gaming"`, capitalized, no `"other"`) that the UI and database
   actually use. `isGamingEvent()` works around this with a lowercase
   comparison. Now documented in
   `docs/architecture/domain-model/README.md`.
5. **Edge Function duplication, one drifted**: `functions/` (repo root)
   and `supabase/functions/` both have `send-verification` and
   `export-registrations-xlsx` folders. `export-registrations-xlsx`'s
   `supabase/functions/` copy is a genuine re-export (safe). `send-verification`'s
   are two **independent implementations** that have drifted apart, with
   no prior documentation of which is authoritative.
   `.github/workflows/deploy-send-verification.yml` auto-deploys the
   `functions/` copy on push to `main`, which is strong evidence that's
   the live one — but this had to be inferred from a CI workflow, not
   stated anywhere. Now documented in `docs/api/README.md` and
   `docs/deployment/README.md`.
6. **`events.bracket_url` schema gap, and a near-miss on this very report** —
   see ADR 0004 and
   `docs/runbooks/incident-bracket-url-save-failure.md`. This bug was
   diagnosed in an earlier session, but that session was interrupted
   before the fix was actually committed. Phase 10's tests and early
   drafts of this Phase 11 documentation referenced the fix as already
   applied — which was false; the migration file and `types.ts` changes
   didn't exist in the repository. Phase 11's own doc-cross-reference
   check (verifying every file path mentioned in a doc actually exists)
   caught this before it shipped. The fix — migration, `types.ts` update,
   removing three separate type-cast workarounds across two code paths in
   `EventTournament.tsx` — was then actually applied as part of this
   phase, verified with the full test suite and a production build. See
   item 7 below for a related, smaller instance of the same "doc claims
   something not yet true" pattern.
7. **Incorrect "no CI" claim** — an earlier draft of
   `TECHNICAL_DEBT_PHASE10.md` and RFC 0002 (both written in this same
   Phase 11 pass) initially stated no GitHub Actions/CI configuration
   existed at all. This was wrong: `.github/workflows/deploy-send-verification.yml`
   exists and auto-deploys two Edge Functions on push to `main`. Corrected
   before this report was finalized — flagged here as an example of how
   easy it is to introduce a new doc/code mismatch even while writing
   documentation specifically meant to prevent that.
8. **`events` table has no baseline schema migration** — only additive
   changes (esports schema, `bracket_url`) exist in
   `supabase/migrations/`. There's no single command or file that
   reproduces the full schema. Documented in
   `docs/architecture/repository/README.md` and
   `docs/deployment/README.md`; flagged as the root enabling condition for
   the `bracket_url` incident and a risk for any future column-level
   schema drift of the same kind.

## Documentation delivered this phase

- **ADRs**: 0002 (layering/dependency rules), 0003 (DI/service locator),
  0004 (gaming domain + bracket_url fix), 0005 (broadcast adapters), 0006
  (testing strategy) — all retroactive, closing the gap left by Phases
  2-10 not recording decisions at the time. `docs/adr/INDEX.md` updated.
- **RFCs**: 0001 (composition root location), 0002 (CI + seeded E2E
  environment) — both open, proposing fixes for issues found during this
  audit. `docs/rfc/README.md` updated.
- **API documentation**: `docs/api/README.md`, consolidating every Vercel
  API route and Supabase Edge Function, including the duplication warning
  above.
- **Architecture documentation**: `overview.md`, `principles.md` (noted as
  Phase-1-specific), `dependency-rules.md`, `dependency-rules-summary.md`,
  `domain-model/README.md`, `repository/README.md`,
  `service-contracts/README.md`, `standards/README.md`, `broadcast/README.md`
  — all rewritten from Phase 1/2 stubs to reflect actual current state.
- **Deployment guides**: `docs/deployment/README.md`,
  `docs/deployment/environment.md` (full env var reference, audited via
  grep across the whole codebase, not written from memory).
- **Runbooks**: `docs/runbooks/README.md` plus four runbooks — two for
  real past incidents (bracket_url, registration form fields), one
  procedural (test suite failures), one procedural (rollback).
- **Contributor guide**: `CONTRIBUTING.md` (new — none existed before).
- **Operations handbook**: `docs/operations/handbook.md` (new).
- **This report.**

## Recommended priority order for Phase 12

1. **Fix the 25 `pages`/`components` → `supabase` violations** (or at
   minimum, stop the count from growing — add the automated check RFC
   0001 mentions before doing the full migration, so regressions are
   caught immediately rather than requiring another manual audit).
2. **Delete dead code**: `src/services/`, `src/modules/platform/*`, and
   the stale `src/core/services/interfaces/IEventService.ts`. Low risk
   (confirmed zero imports for all three), meaningful clarity gain.
3. **Resolve RFC 0001** (composition root location) and **RFC 0002** (CI +
   seeded E2E environment) — both are scoped and ready for a decision.
4. **Resolve the `send-verification` duplication** — confirm with whoever
   manages the Supabase project which copy is actually live, then delete
   or explicitly re-export the other one the same way
   `export-registrations-xlsx` already does.
5. **Fix the `EventType` casing mismatch** in `event.dto.ts`, or at
   minimum add a code comment on the export warning it doesn't match the
   real enum, given the direct connection to the registration-form bug in
   `docs/runbooks/incident-registration-form-wrong-fields.md`.
6. Everything in `TECHNICAL_DEBT_PHASE10.md`'s own priority list
   (`clearAdapters()`, raising `*Impl.ts` test coverage, component tests
   for `EventRegister.tsx`) remains open and unaffected by this phase.
