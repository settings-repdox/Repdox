# RFC 0002: CI Pipeline and a Seeded E2E Environment

Status: **Resolved.** The CI-pipeline half shipped as
`.github/workflows/ci.yml` — see "CI" section for what actually landed
vs. what was proposed. The seeded-E2E-environment half also shipped
(`scripts/seed-e2e-data.ts` + the `e2e` job in that same workflow) — see
"Seeded E2E environment" section below for what changed from the
original proposal and, importantly, what has not yet been verified with
a real run.
Author: Phase 11 documentation pass
Related: ADR 0006 (Testing Strategy), `TECHNICAL_DEBT_PHASE10.md`

## Problem

Phase 10 built a real test suite (90 Vitest tests, 4 Playwright E2E specs),
but:

1. **~~Nothing runs the test suite automatically~~ — resolved.** One
   GitHub Actions workflow existed
   (`.github/workflows/deploy-send-verification.yml`), but it only
   deployed `functions/send-verification` and
   `functions/export-registrations-xlsx` to Supabase on push to `main` —
   it didn't run `npm run typecheck`, `npm test`, `npm run lint`, or `npm
   run build`. A second workflow, `.github/workflows/ci.yml`, now does —
   see "CI" section below for exactly what it runs and why lint is
   non-blocking for now.
2. **The E2E suite has never actually executed**, anywhere, because it
   needs (a) Playwright's browser binaries, downloaded from a CDN that
   isn't reachable from every environment this project might be developed
   or built in, and (b) a Supabase project with known, seeded data —
   specifically a Gaming-type event, for
   `src/tests/e2e/gaming-registration-form.spec.ts` (which self-skips
   without `E2E_GAMING_EVENT_SLUG` set, rather than false-failing).

## Proposal

### CI — **implemented**, with two deliberate deviations from the original proposal

`.github/workflows/ci.yml` runs on every push/PR to `main`:

1. `npm ci`
2. `npm run typecheck` (added — wasn't in the original proposal below,
   because `npm run typecheck` itself didn't exist yet when this RFC was
   written; see `docs/architecture/PHASE11_COMPLIANCE_REPORT.md`'s
   addendum for why bare `tsc --noEmit`/`npm run build` don't actually
   catch type errors and this had to be a separate step)
3. `npm test -- run` (Vitest — unit, integration, broadcast, architecture; ~15-20s)
4. `npm run build`

**Lint is a separate, non-blocking job** (`continue-on-error: true`),
not a required step in the same job as originally proposed — the
codebase has ~270 pre-existing lint errors as of this writing, so making
it required would fail every PR immediately for reasons the PR author
didn't cause. Flip it to required once that backlog is cleared.

Original proposal, for reference (superseded by the above):

~~1. `npm ci`~~
~~2. `npm run lint`~~
~~3. `npm test` (Vitest — unit, integration, broadcast, architecture; ~10-15s)~~
~~4. `npm run build` (catches type errors and build breaks)~~

This is separate and independent from the existing
`.github/workflows/deploy-send-verification.yml`, which keeps deploying
on its own trigger (paths under `functions/send-verification/**` and
`functions/export-registrations-xlsx/**`) — unchanged.

E2E (`npm run test:e2e`) is **not** wired into `ci.yml` — still blocked
on the seeded environment below, same reasoning as originally proposed.

### Seeded E2E environment — **implemented**, with corrections to this
### section's original assumptions

What actually shipped, and how it differs from the proposal above:

- **Only one event needs seeding, not three.** The proposal assumed all
  three event types (Hackathon, Workshop, Gaming) needed fixture data.
  An audit of the actual specs under `src/tests/e2e/` (done before
  writing the seed script — this was exactly the missing prerequisite
  this section originally called out) found `smoke.spec.ts` and
  `ticketing-smoke.spec.ts` need no seed data at all, and
  `gaming-registration-form.spec.ts` needs exactly one Gaming-type,
  registration-open event — no team, no registration record, no
  Hackathon or Workshop event. `scripts/seed-e2e-data.ts` seeds only
  that. If a future spec needs more, extend the script then — don't
  pre-seed data nothing currently exercises.
- Also: this RFC's problem statement above says "4 Playwright E2E
  specs" and this section originally referenced
  `scripts/phase9-dry-run.ts` as an existing pattern to follow — neither
  is accurate as of this update. There are 3 spec files under
  `src/tests/e2e/`, and `scripts/phase9-dry-run.ts` does not exist
  in the current tree. Corrected here rather than left stale.
- **A dedicated hosted Supabase project** was created for this (not the
  local-CLI/`supabase start` alternative this section originally
  offered — that path remains untested and undocumented here, since it
  wasn't the one chosen).
- `scripts/seed-e2e-data.ts` upserts on a fixed slug
  (`e2e-gaming-fixture`) rather than inserting fresh rows, so it's safe
  to run on every CI job without accumulating duplicate fixture events.
  It deliberately does not try to guess "is this really the E2E
  project" from the URL — that project's real ref doesn't contain the
  word "e2e", making any such heuristic unreliable — and relies instead
  on `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` having no default value,
  so it can't silently target the wrong project.
- The CI job (`.github/workflows/ci.yml`) matches the shape below almost
  exactly, with two differences: it uses `npm run test:e2e` (the
  existing script, `playwright test`) rather than calling `playwright
  test` directly, and it's gated on
  `if: vars.E2E_SUPABASE_URL != ''` so it skips cleanly rather than
  failing when the E2E project's repo variable/secrets aren't
  configured (e.g. for forks, or before someone finishes the setup step
  below).
- **What's NOT verified**: the seed script was written and executed
  against the real E2E project up to the point of the actual database
  write — every step short of that (env var validation, guardrail
  checks, request construction, reaching the live HTTPS endpoint) ran
  successfully during development. The actual insert, and the full
  Playwright run against the seeded data, could not be executed from
  the sandbox this was developed in — no outbound network access to
  Supabase, no Docker for a local alternative, no reachable CDN for
  Playwright's browser binaries. **This still needs a real run — in CI,
  or by whoever has access to the E2E project — before being trusted as
  fully working.**

**Remaining setup step, not yet done**: add the `E2E_SUPABASE_URL`
repository variable and the `E2E_SUPABASE_ANON_KEY` /
`E2E_SUPABASE_SERVICE_ROLE_KEY` repository secrets in GitHub so the `e2e`
job actually runs instead of skipping. Until that's set, the job is
present in the workflow but inert.

Original proposal (superseded by the above, kept for the historical
record):

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

~~Both pieces~~ — the CI half shipped (see above); only the seeded E2E
environment remains, and it should stay scoped as its own task once
someone audits exactly what fixture data each planned E2E spec needs —
that scoping work hasn't happened yet.

## Next step if approved

~~Convert to an ADR once approved, per `docs/rfc/rfc-process.md`. Split
into two implementation tasks (CI wiring; E2E seed environment) since
they have very different effort and can land independently.~~ CI wiring
is done and didn't get its own ADR — it's small/mechanical enough that
this RFC's own record of what shipped (above) serves as the decision
record. The E2E seed environment remains open; convert *that* to an ADR
once someone scopes and approves it.
