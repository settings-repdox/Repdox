# ADR 0006: Testing Strategy — Vitest for Unit/Integration, Playwright for E2E

Date: 2026-07-15 (retroactive — documents Phase 10 decisions)

## Status

Accepted.

## Context

Before Phase 10, the repository had no test suite at all, and its two
"architecture verification" scripts (`verify:infra`, `verify:production-deps`)
were `node --loader ts-node/esm -e "..."` one-liners that had never
actually worked (a Node ESM module-resolution bug unrelated to the checks'
own logic — see `TECHNICAL_DEBT_PHASE10.md`). Phase 10 needed to establish
unit tests, integration tests, E2E tests, mock infrastructure, and
verification for every migrated domain from nothing.

## Decision

- **Unit + integration tests: Vitest**, matching the existing Vite build
  tooling (no separate config/transform pipeline to maintain). Test files
  live under `src/tests/`, mirroring the source layout:
  `domains/` (one file per domain service, mocking the repository layer),
  `integration/` (DI container behavior, cross-domain workflows),
  `broadcast/` (adapter registry + all 7 stub contracts),
  `architecture/` (the two former CLI scripts, now Vitest tests).
- **Architecture verification lives in the test suite, not separate
  scripts.** `verify:infra` and `verify:production-deps` npm scripts still
  exist for muscle-memory/CI-familiarity reasons, but now just run a
  specific Vitest file (`vitest run src/tests/architecture/...`) rather than
  the broken ts-node one-liner. This means these checks run reliably, show
  up in normal `npm test` output, and get the same "run on every
  commit/PR" treatment as any other test rather than being a manual step.
- **E2E: Playwright** (`@playwright/test`), configured separately
  (`playwright.config.ts`) and explicitly excluded from Vitest's own file
  collection (`vitest.config.ts` → `test.exclude: ["src/tests/e2e/**"]`).
  Specs live under `src/tests/e2e/`. Run via `npm run test:e2e`, not `npm
  test`.
- **Coverage**: `@vitest/coverage-v8`, `npm run test:coverage`, reporters
  `text`, `json`, `json-summary`, `html`, `lcov`.
- **Environment variables for tests**: injected via Vitest's config-level
  `test.env` (`vitest.config.ts`), not by mutating `process.env` inside a
  `beforeAll` hook. The latter was tried first (`src/tests/setup.ts`) and
  doesn't work reliably — `import.meta.env` is read at module-evaluation
  time, before any test hook runs, so anything importing the real Supabase
  client at module scope (transitively, via `AuthService` →
  `registerDefaults()`) would throw regardless of what `beforeAll` later
  set. `setup.ts`'s `beforeAll` block was left in place as a redundant
  safety net but the config-level injection is what actually makes it work.

## Consequences

- 90 tests across 8 Vitest suites, all passing, run in ~9-14 seconds —
  fast enough to run on every save during development.
- E2E tests are **written but not executable in every environment** —
  `npx playwright install` needs network access to Playwright's browser
  CDN, which sandboxed/restricted CI environments may not have. This is a
  known, documented limitation (`TECHNICAL_DEBT_PHASE10.md`), not an
  oversight — the specs and config are still valuable as-written (confirmed
  syntactically valid via `npx playwright test --list`) for anyone running
  locally or in a CI environment with normal network access.
- Whole-repo line coverage is low (1.44%) because coverage counts
  `src/pages`, `src/components`, and `src/lib` — none of which have any
  tests yet. Scoped to what Phase 10 actually targeted
  (`src/core/services`, `src/domains`, `src/infrastructure`), coverage is
  21.4%. Both numbers are reported together in
  `TECHNICAL_DEBT_PHASE10.md` specifically so "1.44%" isn't read as "Phase
  10 barely tested anything" when the real story is "Phase 10 tested the
  layers it targeted reasonably well and didn't touch UI code at all."
- The architecture-verification-as-tests approach (rather than separate
  scripts) means these checks can silently start failing if someone edits
  `src/tests/architecture/*.test.ts` without understanding they're load-
  bearing for CI-equivalent guarantees, not just "some tests." No stronger
  protection against that exists yet beyond this ADR and code comments in
  the files themselves.
