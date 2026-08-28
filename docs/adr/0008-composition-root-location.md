# ADR 0008: Composition Root Location (`src/bootstrap`)

Date: 2026-08-27

## Status

Accepted and implemented. Converts RFC 0001
(`docs/rfc/rfc-0001-composition-root-location.md`), which is now closed —
see that document for the original problem statement and alternatives
considered.

## Context

`src/core/services/registerDefaults.ts` was the composition root: the one
file that imports concrete `*Impl` classes from every domain
(`EventServiceImpl`, `GamingServiceImpl`, `RegistrationServiceImpl`,
`ProductionServiceImpl`, `TicketServiceImpl`, `UserServiceImpl`,
`VolunteerServiceImpl`, and others) in order to wire them into the DI
registry via `registerService()`. ADR 0002 (Domain-Driven Layering and
Dependency Rules) states `core` must not depend on `domains`. This file
was the one deliberate, necessary exception — something has to import
concrete implementations to register them — but because it physically
lived inside `src/core/services/`, it read as a plain rule violation to
anyone auditing imports, which is exactly how Phase 11's compliance audit
flagged it. There was also no automated check distinguishing "the
sanctioned composition root" from "someone else adding another domain
import to `core` by mistake."

RFC 0001 proposed relocating the file to a new top-level layer,
`src/bootstrap/`, that the dependency rules explicitly exempt, and adding
an automated check enforcing that exemption. This ADR records that the
proposal was accepted and carried out.

## Decision

1. Moved `src/core/services/registerDefaults.ts` to
   `src/bootstrap/registerDefaults.ts`, unchanged in content apart from
   converting its now-invalid relative imports (`./di`, `./impl/...`) to
   absolute `@/core/services/...` paths, and adding a header comment
   explaining the file's special status.
2. Updated `docs/architecture/dependency-rules.md` to add `bootstrap` as a
   fifth layer: it may import from every other layer, and it is the only
   layer permitted to import a domain's `impl/` classes directly.
   Everywhere else resolves through `resolveService()`.
3. Updated all call sites that imported `registerDefaults` from its old
   path. This turned out to be roughly 22 files, not the "chiefly the app
   entry point and the test file" the RFC estimated — every page and
   component migrated during the domain-layer bypass cleanup
   (`docs/architecture/PHASE11_COMPLIANCE_REPORT.md`) calls
   `registerDefaults()` directly at module scope, following the pattern
   established across that work. One test file's `vi.mock()` target path
   also needed updating, since a stale mock path would have silently
   stopped applying rather than failing loudly.
4. Added `verifyBootstrapIsolation()`
   (`src/bootstrap/verifyArchitecture.ts`), mirroring the shape of the
   existing `verifyInfrastructureIsolation()`
   (`src/infrastructure/verifyArchitecture.ts`, ADR 0002/Phase 10): it
   walks `src/`, skipping `src/bootstrap` itself and `src/tests` (unit
   tests that import a concrete `*ServiceImpl` on purpose, to test it
   directly, are expected and are not the violation this check exists to
   catch), and flags any file containing an actual import/require of
   `@/domains/*/impl/*`. Wired up as
   `src/tests/architecture/bootstrap-isolation.test.ts` and the
   `npm run verify:bootstrap` script, following the same pattern as
   `verify:infra`.

## Alternatives considered

See RFC 0001 for the full discussion. In summary: leaving the file where
it was and only documenting the exception (rejected — nothing would stop
the exception from becoming precedent for other `core` files); moving it
into `src/infrastructure` instead (rejected — would break
`verifyInfrastructureIsolation()`'s own isolation guarantee); and
splitting registration per-domain via side-effect imports (rejected — makes
registration order implicit).

One open question from the RFC — whether
`src/infrastructure/broadcast/registerAdapters.ts` should also move to
`src/bootstrap/` for consistency, since it has the same shape (imports
concrete `*Stub` adapters to register them) — was decided **no**. Unlike
`registerDefaults.ts`, that file does not currently violate any documented
rule: `infrastructure` is allowed to contain and reference its own `impl/`
classes. Moving it would be cosmetic symmetry, not a fix, and was not worth
the churn.

## Consequences

- `src/core` no longer contains any `domains` imports at all — the
  exception ADR 0002 documented is fully resolved, not just relocated on
  paper.
- The `core` → `domains` rule now has the same class of automated
  enforcement the `infrastructure` → `domains`/`core` rule has had since
  Phase 10. Of the three dependency-rule violation categories ADR 0002's
  Consequences section listed as unenforced, two are now covered
  (`infrastructure` isolation, `bootstrap` isolation); only the
  `pages`/`components` → `supabase` rule remains doc-only (tracked
  separately, per RFC 0002/the standards doc).
- Discovered while implementing this: the real blast radius of "which
  files import `registerDefaults`" was significantly larger than RFC
  0001 estimated (~22 files vs. "chiefly two"). This ADR's implementation
  verified every one of them individually (typecheck, full test suite,
  and a manual audit for both single- and double-quoted import strings,
  since a naive single-quote-insensitive search would have missed at
  least one file) rather than trusting a first-pass bulk find/replace.
- `verifyBootstrapIsolation()`'s first draft had a false-positive bug of
  its own: an unanchored regex matched the check's own test description
  string, not just real imports. Fixed before this landed by requiring
  the match to be an actual `from "..."` / `import(...)` / `require(...)`
  reference, and verified by deliberately introducing a real violation
  file and confirming the check caught it, then confirming it cleared
  once removed.
