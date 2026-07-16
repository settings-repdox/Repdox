# Architecture Overview

This document describes Repdox's architecture as it actually exists after
Phases 1-10, not the Phase 1 plan (kept for history in `phase-1-scope.md`).
Where the original plan and the real outcome diverge, that's called out
explicitly — several pieces of Phase 1's scaffold were superseded by a
different structure built in later phases and never cleaned up.

## What actually got built

- **`src/core/services/`** — the service locator (`di.ts`, ADR 0003) and
  six cross-cutting services (Auth/User/Permission/Notification/Analytics/
  Asset), plus the composition root (`registerDefaults.ts`, see RFC 0001).
- **`src/domains/{events,gaming,production,registrations}/`** — four
  business domains, each with (mostly) their own `dtos/`, `interfaces/`,
  `impl/`. See `docs/architecture/domain-model/README.md` and
  `docs/architecture/service-contracts/README.md` for the full map,
  including the inconsistencies found in Phase 11's audit.
- **`src/infrastructure/`** — a separate DI registry (`di.ts`) and the
  broadcast adapter layer (ADR 0005, `docs/architecture/broadcast/README.md`).
- **`src/shared/dtos/`** — cross-domain DTOs.
- **`src/tests/`** — Vitest suites (`domains/`, `integration/`,
  `broadcast/`, `architecture/`) plus Playwright E2E specs (`e2e/`), per
  ADR 0006.

## What Phase 1 scaffolded but never got used

Two pieces of the original Phase 1 skeleton exist in the repository today,
untouched since, and **nothing imports them**:

- **`src/services/`** (top-level, not `src/core/services/`) —
  `eventService.ts` and `userService.ts`, both ~10-line placeholder classes
  with a single method returning `null`. The real event/user logic lives
  in `src/domains/events/` and `src/core/services/impl/UserServiceImpl.ts`
  respectively. This folder is dead code.
- **`src/modules/platform/{assets,auth,branding,permissions,users}/`** —
  each is just a `README.md` stub, no implementation. The real
  asset/auth/permissions logic lives in `src/core/services/impl/`
  (`AssetServiceImpl`, `AuthService`, `PermissionServiceImpl`). This
  folder is also dead.

Neither is referenced by any test, any page, or any other source file
(verified via `grep` across `src/` in Phase 11). They should be deleted —
not done in this pass since Phase 11 is documentation, not a code change;
tracked in `docs/architecture/PHASE11_COMPLIANCE_REPORT.md` as a Phase 12
cleanup item. Until deleted, **do not add new code to either folder** —
they look like they might be "the right place" for platform-capability
code based on their names, but the actual convention that won is
`src/core/services/` + `src/domains/`. See
`docs/architecture/standards/README.md` for where new code should
actually go.

## Layers, in dependency order

```
pages/components  →  domains  →  core  →  shared
                  ↘            ↗
                    infrastructure
```

Full rules: `docs/architecture/dependency-rules.md`. Current compliance
status (including known violations): `docs/architecture/PHASE11_COMPLIANCE_REPORT.md`.

## Key documents

- `docs/architecture/domain-model/README.md` — entities per domain.
- `docs/architecture/service-contracts/README.md` — which interface lives
  where, and the one inconsistency worth knowing about before adding a
  new service.
- `docs/architecture/broadcast/README.md` — the broadcast adapter layer,
  what's real vs. stubbed.
- `docs/architecture/repository/README.md` — full folder-by-folder map.
- `docs/adr/` — decision records, including five (0002-0006) written
  retroactively in Phase 11 to close the gap left by Phases 2-10 not
  recording decisions as they were made.
