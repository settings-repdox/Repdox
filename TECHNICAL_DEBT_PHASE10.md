# Phase 10 — Remaining Technical Debt

Generated at the end of Phase 10 (Testing). This replaces the "Technical Debt
Items Identified in Phase 10" section of `PHASE10_TESTING_INFRASTRUCTURE.md`
with the state as of this pass, and adds items found while getting the suite
green.

## Fixed in this pass

- **`gaming.service.test.ts` / `registration.service.test.ts` wouldn't parse.**
  Both files had a duplicate copy of their entire test body pasted back in
  *outside* the outer `describe(...)` block (unindented, same test names,
  slightly reformatted). That's what produced the "Expression expected" /
  extra `}` syntax error and the "pending fix" status in the original Phase
  10 doc. The dangling duplicate also referenced `service`/`mockRepo`, which
  only exist inside the outer describe's closure — so even if the brace
  count had accidentally balanced, those tests would have failed with
  `ReferenceError`. Fix: deleted the dangling duplicate block; the properly
  scoped originals already covered the same cases.
- **`verify:infra` / `verify:production-deps` npm scripts were broken**,
  independent of the logic they check: the `node --loader ts-node/esm -e
  "import('./src/...')"` one-liner fails to resolve the relative import
  under Node's ESM loader. Fixed by wrapping the same functions
  (`verifyInfrastructureIsolation`, and a new domain-service-resolution
  check standing in for `verifyProductionDependencies`) as Vitest tests
  (`src/tests/architecture/*.test.ts`) and pointing the npm scripts at
  those instead. They now run reliably and show up in normal CI test output
  instead of being a separate manual step someone has to remember.
- **`setup.ts` set Supabase env vars too late.** It set
  `process.env.VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` inside
  `beforeAll()`, but `src/integrations/supabase/client.ts` reads
  `import.meta.env` at module-evaluation time — before any test hook runs.
  Any test that transitively imports the real `AuthService` /
  `registerDefaults()` chain (not just a mock) would throw
  `[CRITICAL] Missing environment variables`. This didn't surface before
  because no existing suite imported that chain. Fixed by also injecting the
  same values via Vitest's config-level `test.env`, which is applied before
  modules are transformed. `setup.ts`'s `beforeAll` block is now redundant
  with this but left in place as a harmless safety net.

## New in this pass

- Added `src/tests/broadcast/` (broadcast-test-utils.ts + 23 tests) covering
  the adapter registry (`src/infrastructure/di.ts`: register/resolve/replace,
  duplicate-key rejection) and every broadcast adapter stub's contract
  (RunPod, MediaMTX, OBS, SRT, WHEP, FFmpeg, WebSocket) — including the
  WebSocket stub's actual pub/sub behavior, since it's the one stub with real
  logic rather than a no-op.
- Added `src/tests/architecture/` — the two verify-script replacements above.
- Added Playwright (`@playwright/test`) as the E2E layer: `playwright.config.ts`
  plus `src/tests/e2e/smoke.spec.ts` (basic nav/render checks, no seeded data
  required) and `src/tests/e2e/gaming-registration-form.spec.ts` (a
  regression test for the Gaming-vs-Hackathon registration form bug fixed
  earlier — see below).

## Known limitations, not fixed here

1. **E2E tests are written but not executed in this environment.**
   `npx playwright test --list` confirms the config and both spec files are
   valid (4 tests discovered), but actually running them needs:
   - `npx playwright install` to fetch Chromium — this pulls from
     Playwright's CDN, which this sandboxed environment can't reach.
   - A running dev server (`npm run dev`) pointed at a real Supabase project.
   - For `gaming-registration-form.spec.ts` specifically: a seeded Gaming
     event, passed via `E2E_GAMING_EVENT_SLUG`. Without it the test
     self-skips rather than reporting a false pass/fail.

   Run locally with:
   ```bash
   npx playwright install chromium
   E2E_GAMING_EVENT_SLUG=<slug-of-a-real-gaming-event> npm run test:e2e
   ```
   This should be wired into CI once there's a disposable/seeded Supabase
   project for it to run against — right now there's no seed script for
   E2E-specific fixture data (only `scripts/sync-teams.ts` and
   `scripts/phase9-dry-run.ts` exist, neither of which seeds a full event).

2. **Coverage is low outside the domain/core/infrastructure layers.**
   Whole-repo line coverage is **1.44%** (491/34,068 lines) because
   `src/pages/*`, `src/components/*`, and most of `src/lib/*` have zero
   tests — Phase 10 targeted the migrated domain/service/infra layers, not
   the UI. Scoped to `src/core/services`, `src/domains`, and
   `src/infrastructure`, coverage is **21.4%** (449/2,096 lines) — better,
   but still well under the 70% target set in `vitest.config.ts`. The gap is
   concentrated in the `*Impl.ts` repository/service classes, where only the
   methods exercised by the existing unit tests are covered; private
   helpers, error branches, and Supabase-query-building code are not.
   Reports: `coverage/lcov-report/index.html` (browsable),
   `coverage/coverage-summary.json` (machine-readable).

3. **No `clearAdapters()` for the infrastructure DI registry.** Core's
   `src/core/services/di.ts` has `clearServices()` for test isolation (added
   in the original Phase 10 pass); `src/infrastructure/di.ts` has no
   equivalent. The new broadcast registry tests work around this with a
   per-test unique-key suffix instead of a shared key + reset, which is
   more verbose than it needs to be. Worth adding `clearAdapters()` and
   switching those tests to the cleaner pattern.

4. **`registerDefaultInfrastructureAdapters()` has no duplicate-registration
   guard**, unlike core's `registerDefaults()` (which wraps everything in a
   `try/catch { /* ignore if already registered */ }`). Calling it twice in
   the same process will throw `Adapter already registered`. Not a bug today
   (it's called once, in `broadcast-adapters.test.ts`), but it's an
   inconsistency with the core pattern and a trap for whoever wires it into
   app bootstrap or another test file later.

5. **Component-level and hook-level tests are still absent**, as flagged in
   the original Phase 10 doc. `EventRegister.tsx` (1,057 lines, and the file
   with the gaming/hackathon form bug fixed in the prior session) has zero
   unit/component coverage — only the new E2E spec touches it, and only
   when run with a seeded event. Same for `EventTournament.tsx`,
   `MatchCentre.tsx`, and the admin pages.

6. **No CI runs the test suite.** One GitHub Actions workflow exists
   (`.github/workflows/deploy-send-verification.yml`), but it only deploys
   two Edge Functions on push to `main` — it doesn't run tests, lint, or a
   build check. `npm test`, `npm run test:coverage`, `npm run verify:infra`,
   `npm run verify:production-deps`, and `npm run test:e2e` are all scripts
   a person has to remember to run by hand before merging. (Corrected in
   Phase 11 — this item previously said no CI configuration existed at
   all, which was wrong; see `docs/rfc/rfc-0002-ci-and-e2e-seed-environment.md`.)

## Suggested order for Phase 11+

1. Add `clearAdapters()` to `src/infrastructure/di.ts` (small, unblocks
   cleaner broadcast tests).
2. Wire `npm test`, `npm run verify:infra`, `npm run verify:production-deps`
   into a CI workflow — they're fast (~10-15s total) and now reliable.
3. Stand up a seeded Supabase test project (or local Supabase via CLI) so
   `test:e2e` can actually run, including the gaming-form regression spec.
4. Fill in `*Impl.ts` coverage gaps — prioritize `RegistrationServiceImpl`
   (7.27%) and `GamingServiceImpl` (10.94%), the two lowest and the two
   domains with the most business logic (team assignment, bracket
   generation, match scoring).
5. Component tests for `EventRegister.tsx` specifically, given its history
   (the gaming/hackathon form bug shipped once already and the only thing
   catching a regression today is an E2E test that needs manual setup to
   run).
