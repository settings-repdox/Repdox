# Contributing to Repdox

This guide covers how to work in this codebase day-to-day. For the
architecture itself, start with `docs/architecture/overview.md` — this
file assumes you've read that, or will before writing non-trivial code.

## Setup

```bash
npm install
# Create .env.local with at least VITE_SUPABASE_URL and
# VITE_SUPABASE_ANON_KEY pointed at a dev Supabase project.
# See docs/deployment/environment.md for the full variable list —
# there's no .env.example in the repo, that doc is the closest thing to one.
npm run dev
```

## Before you start writing code

1. **Know which layer your change belongs in.**
   `docs/architecture/standards/README.md` → "Module ownership" tells you
   where new code goes. If you're adding a new domain, or a new
   infrastructure adapter, or extending an existing service, there's a
   pattern to follow — don't guess or invent a new folder structure.
2. **Check `docs/architecture/service-contracts/README.md` before adding a
   new service.** Two inconsistent patterns already exist in this codebase
   for where an interface lives relative to its implementation — that doc
   tells you which one to follow going forward (Pattern B) so you don't
   add a third variant.
3. **If your change affects the dependency rules, the layering, or
   anything a future contributor would reasonably ask "why was this built
   this way" about — write an RFC first.** See `docs/rfc/rfc-process.md`.
   Five ADRs (0002-0006) had to be written *retroactively* in Phase 11
   specifically because this didn't happen during Phases 2-10, and
   reconstructing the reasoning after the fact from code alone is strictly
   worse than writing it down at decision time. Don't repeat that.

## While writing code

- **Respect the dependency direction.** `docs/architecture/dependency-rules.md`
  has the full rules. The short version: pages/components never import
  `@/integrations/supabase` directly — go through a domain service
  (`resolveService("EventService")` etc.). This rule already has 24 known
  violations predating your change (see
  `docs/architecture/PHASE11_COMPLIANCE_REPORT.md`) — don't add a 25th.
  Fixing an existing one while you're in the area is welcome, not
  required.
- **New domain service → write its unit test in the same PR.**
  `src/tests/domains/event.service.test.ts` is the template: mock the
  repository/Supabase layer, never hit a real project. See
  `docs/architecture/standards/README.md` → "Testing."
- **New infrastructure adapter → interface + stub + contract test**,
  following `src/infrastructure/broadcast/` as the reference (ADR 0005).
- Match the naming conventions in `docs/architecture/standards/README.md`
  (`I<Name>Service`, `<Name>ServiceImpl`, DI keys matching the interface
  name minus `I`, etc.) — a typo'd DI key is a runtime error, not a
  compile error (ADR 0003), so copy an existing registration rather than
  retyping one.

## Before opening a PR

```bash
npm test          # unit + integration + broadcast + architecture (~10-15s)
npm run lint
npm run build      # catches type errors the dev server won't
```

All three should pass. If you touched anything under `src/infrastructure`,
`src/core`, or cross-domain calls, also sanity-check
`npm run verify:infra` and `npm run verify:production-deps` explicitly —
they're now just aliases for specific Vitest files (ADR 0006) but are
worth running by name since they map directly to "did I break an
architectural invariant," which `npm test`'s full-suite output can bury
among 90 test results.

E2E (`npm run test:e2e`) is not required for most PRs — it needs local
Playwright browser install and, for the gaming-registration-form spec, a
seeded event slug (see RFC 0002). If your change touches
`EventRegister.tsx`, `EventTournament.tsx`, or anything else E2E specs
cover, running it locally if you can is strongly encouraged even though
CI doesn't enforce it yet.

## If you find a documentation/implementation mismatch

`docs/architecture/PHASE11_COMPLIANCE_REPORT.md` was accurate as of Phase
11 but will drift the same way every doc in this repo has drifted before
(Phase 9's completion report claimed dependency-rule compliance that
turned out not to hold up under a real audit). If you find docs and code
disagreeing:

- Fix the doc to match the code, unless the code is the actual bug — in
  which case fix the code and leave the doc's description of the *rule*
  alone (only update the doc's claim about *current compliance status*).
- If it's a pattern likely to recur (like the `send-verification`
  duplication, or the dead `src/services/`/`src/modules/platform/`
  scaffolding), add a note explaining it rather than silently correcting
  it — the explanation is what prevents the next person from rediscovering
  the same confusion from scratch.

## Getting help

There's no other contributor guide or team chat documented in this repo as
of Phase 11 — if one exists, add it here.
