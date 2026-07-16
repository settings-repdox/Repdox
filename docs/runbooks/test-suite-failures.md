# Runbook: `npm test` fails

## First: is it a real regression or an environment issue?

Run it fresh and read the actual error, not just "failed":

```bash
npm test -- run
```

### "Cannot find module" / import resolution errors

Check `npm install` actually completed — `@playwright/test` and
`@vitest/coverage-v8` were added in Phase 10 and aren't part of the
original `package.json`'s baseline; a stale `node_modules` from before
that point will be missing them.

### `[CRITICAL] Missing environment variables` from the Supabase client

If this shows up in test output, `vitest.config.ts`'s `test.env` block got
removed or a new test file imports the real Supabase client in a way that
runs before Vitest applies it. See ADR 0006's Decision section for exactly
why this class of failure happens (`import.meta.env` is read at
module-evaluation time, before any `beforeAll` hook) — don't try to fix it
by adding more to `src/tests/setup.ts`'s `beforeAll`, that's the approach
that already didn't work.

### A syntax/parse error in one specific test file

Check for **duplicated content** before assuming a real syntax bug — this
exact failure mode already happened twice in Phase 10
(`gaming.service.test.ts`, `registration.service.test.ts` both had their
entire test body pasted back in a second time outside the closing brace of
the outer `describe` block). Quick check:

```bash
grep -c "^describe(" src/tests/domains/<file>.test.ts
```

If a file has the same top-level `describe(...)` name appearing more than
once, that's very likely this bug, not a genuine new one. See
`TECHNICAL_DEBT_PHASE10.md` for the full writeup of how this happened
before.

### `Adapter already registered` / `Service already registered`

The DI registries (`src/core/services/di.ts`, `src/infrastructure/di.ts`)
are module-level singletons — state persists across test files in the
same Vitest worker. `core`'s `registerDefaults()` swallows duplicate-
registration errors; `infrastructure`'s `registerDefaultInfrastructureAdapters()`
does **not** (ADR 0003's Consequences section, and
`TECHNICAL_DEBT_PHASE10.md` item 4). If a new test calls
`registerDefaultInfrastructureAdapters()` and it's already been called
elsewhere in the same run, this is expected, not a bug in your new code —
either don't call it again, or (better, longer-term) add
`clearAdapters()` to `src/infrastructure/di.ts` and call it in
`beforeEach`/`afterEach` the way `core/services/di.ts`'s `clearServices()`
is used.

### Failure only in CI, passes locally

There currently is no CI job running `npm test` (see RFC 0002) — if you're
seeing this, someone has already started wiring that up; check whether the
CI environment sets `test.env` differently, or whether a timezone/locale
difference is involved (none of the current tests are known to be
timezone-sensitive, but this is worth checking first before assuming
something more complex).

## If it's a real regression

1. `git log --oneline -- <path/to/file>` to see what changed recently in
   the failing area.
2. Check whether the failing test corresponds to a runbook in
   `docs/runbooks/` already — if the test exists specifically because of a
   past incident (e.g. `gaming-registration-form.spec.ts`), you may be
   looking at that bug coming back, not a new one.
3. Fix, then run the full suite (`npm test -- run`) before considering it
   resolved — don't just re-run the one failing file, in case the fix has
   side effects elsewhere.
