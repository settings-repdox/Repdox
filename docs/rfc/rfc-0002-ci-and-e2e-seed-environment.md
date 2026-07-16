# RFC 0002: CI Pipeline and a Seeded E2E Environment

Status: **Open — proposed, not yet approved or scheduled**
Author: Phase 11 documentation pass
Related: ADR 0006 (Testing Strategy), `TECHNICAL_DEBT_PHASE10.md`

## Problem

Phase 10 built a real test suite (90 Vitest tests, 4 Playwright E2E specs),
but:

1. **Nothing runs the test suite automatically.** One GitHub Actions
   workflow exists (`.github/workflows/deploy-send-verification.yml`), but
   it only deploys `functions/send-verification` and
   `functions/export-registrations-xlsx` to Supabase on push to `main` —
   it does not run `npm test`, `npm run lint`, or `npm run build`. There is
   no CI job that runs the Vitest suite, the verify scripts, or a build
   check on every push/PR.
2. **The E2E suite has never actually executed**, anywhere, because it
   needs (a) Playwright's browser binaries, downloaded from a CDN that
   isn't reachable from every environment this project might be developed
   or built in, and (b) a Supabase project with known, seeded data —
   specifically a Gaming-type event, for
   `src/tests/e2e/gaming-registration-form.spec.ts` (which self-skips
   without `E2E_GAMING_EVENT_SLUG` set, rather than false-failing).

## Proposal

### CI

Add a **new** GitHub Actions workflow (`.github/workflows/ci.yml`) that on
every push/PR to `main`:

1. `npm ci`
2. `npm run lint`
3. `npm test` (Vitest — unit, integration, broadcast, architecture; ~10-15s)
4. `npm run build` (catches type errors and build breaks)

This is separate and independent from the existing
`.github/workflows/deploy-send-verification.yml`, which should keep
deploying on its own trigger (paths under `functions/send-verification/**`
and `functions/export-registrations-xlsx/**`) — no change proposed to
that workflow here, other than possibly gating it behind the new CI job
passing first, which is a nice-to-have, not required for this RFC.

E2E (`npm run test:e2e`) is proposed as a **separate, non-blocking**
workflow or job for now (see below), not part of the required checks —
until the seed-data problem is solved, a flaky/skipped E2E job would just
train people to ignore CI failures.

### Seeded E2E environment

Stand up a dedicated Supabase project (or use the Supabase CLI's local
Postgres + `supabase start`) exclusively for E2E runs, with a seed script
(new: `scripts/seed-e2e-data.ts`, following the existing pattern of
`scripts/sync-teams.ts` and `scripts/phase9-dry-run.ts`) that creates:

- One event of each type (Hackathon, Workshop, Gaming) with predictable
  slugs (e.g. `e2e-hackathon-fixture`, `e2e-gaming-fixture`), so
  `E2E_GAMING_EVENT_SLUG` and future fixture-dependent specs have something
  stable to point at.
- Minimal associated data needed for registration flows to complete
  (whatever `EventRegister.tsx` and `EventTournament.tsx` require —
  audit needed, not fully known at RFC time).

Once that exists, add the CI job:

```yaml
e2e:
  runs-on: ubuntu-latest
  steps:
    - run: npx playwright install --with-deps chromium
    - run: npm run seed:e2e   # new script, wired to the seed data above
    - run: E2E_GAMING_EVENT_SLUG=e2e-gaming-fixture npm run test:e2e
```

## Alternatives considered

1. **Mock Supabase entirely for E2E** (e.g. intercept network requests via
   Playwright's route interception) instead of a real seeded backend.
   Would remove the seed-data dependency but also stops testing the real
   integration — defeats much of the point of E2E over the existing
   Vitest integration tests, which already mock the repository layer. Not
   recommended as the primary approach, though could be a useful
   *addition* for specs that need to simulate backend failures.
2. **Skip CI for now, revisit later.** This is the de facto current state.
   Cheapest, but every regression (like the gaming/hackathon form bug that
   motivated `gaming-registration-form.spec.ts` in the first place) depends
   entirely on someone remembering to run the suite locally before merging.

## Recommendation

Both pieces (CI wiring for the fast Vitest suite, and the seeded E2E
environment) — but the Vitest-CI half is small and can ship independently
and immediately; the seeded-environment half is the larger, more open-ended
piece and should be scoped as its own Phase 12 task once someone audits
exactly what fixture data each planned E2E spec needs.

## Next step if approved

Convert to an ADR once approved, per `docs/rfc/rfc-process.md`. Split into
two implementation tasks (CI wiring; E2E seed environment) since they have
very different effort and can land independently.
