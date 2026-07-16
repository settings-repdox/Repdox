# Engineering Standards

Concrete conventions actually followed (or that should be followed) in
this codebase, extracted from the patterns established in Phases 2-10
rather than written in the abstract. Where the codebase itself is
inconsistent, this doc says so and states which pattern to prefer going
forward — see `docs/architecture/service-contracts/README.md` for the
most significant example (interface placement).

## Module ownership / where new code goes

- A new business domain → `src/domains/<name>/` with `dtos/`,
  `interfaces/`, `impl/` subfolders (Pattern B in service-contracts). Only
  put a new service directly under `src/core/services/` if it's genuinely
  cross-cutting infrastructure-adjacent platform code (auth, permissions) —
  not just because it feels small.
- A new piece of external infrastructure (a new broadcast adapter, a new
  third-party integration) → an interface under
  `src/infrastructure/<area>/interfaces/`, implementation under
  `src/infrastructure/<area>/impl/`, registered via
  `src/infrastructure/di.ts`. Follow the broadcast adapters
  (`src/infrastructure/broadcast/`) as the reference example.
- Shared types used by more than one domain → `src/shared/dtos/`, not
  duplicated per-domain.
- Do not add new code to `src/lib/` — it's the pre-domain-migration legacy
  layer (`tournamentService.ts`, `eventService.ts`, `adminService.ts`, etc.)
  and is being migrated out, not grown.

## Naming

- DTOs: `<Name>DTO` (e.g. `EventDTO`, `RegistrationDTO`) for the primary
  entity of a domain; `<Name>Record` for gaming/tournament sub-entities
  (`TournamentRecord`, `TournamentTeamRecord`) — this split isn't
  meaningful (both are just DTOs), it's just what got used; don't read
  significance into "Record" vs "DTO."
- Interfaces: `I<Name>Service` for service contracts, `I<Name>Adapter` for
  infrastructure adapters, `I<Name>Repository` where a repository
  abstraction exists (e.g. `IEventRepository`).
- Implementations: `<Name>ServiceImpl` / `<Name>AdapterStub` (stub) or
  `<Name>Adapter` (real, no suffix — see ADR 0005's "Implementing a real
  adapter" section).
- DI registry keys: PascalCase, matching the interface name minus the `I`
  prefix (`"EventService"`, `"GamingService"`, `"RunPodAdapter"`) — a typo
  here is a runtime error, not a compile error (ADR 0003), so copy an
  existing key rather than retyping it.

## Dependency direction

See ADR 0002 and `docs/architecture/dependency-rules.md` for the full
rules. The one-sentence version: **pages/components → domains → core →
shared**, with `infrastructure` reachable only from `core`/`domains`
(never the reverse), and cross-domain calls only through another domain's
`interfaces/` (never its `impl/`), resolved via `resolveService()`.

## Error handling

- API routes (`api/`) return `{ error: string, code?: string }` on
  failure, with a specific `code` for conditions the frontend needs to
  branch on (`"quota_exceeded"`, `"already_registered"`, `"handle_taken"`,
  etc. — see `docs/api/README.md` for the full list per route). Don't
  return a bare `500` with no body for expected failure conditions; reserve
  unstructured 500s for genuinely unexpected errors.
- `resolveService()`/`resolveAdapter()` throw (not return `undefined`) for
  an unregistered key — this is deliberate (ADR 0003) so a wiring mistake
  fails loudly at the resolution site, not silently later when something
  calls a method on `undefined`. Don't wrap these in a try/catch that
  swallows the error unless you have a specific fallback behavior in mind.

## Testing

See ADR 0006. Concretely:

- New domain service → a test file in `src/tests/domains/`, mocking the
  repository/Supabase layer (see `src/tests/domains/event.service.test.ts`
  as the template) — never hit a real Supabase project from a unit test.
- New infrastructure adapter → a stub implementation + a contract test in
  `src/tests/broadcast/` (or a new sibling folder if it's not
  broadcast-related) — see `docs/architecture/broadcast/README.md`'s
  "Implementing a real adapter" for the expected shape.
- A new dependency-rule or cross-cutting architectural invariant → a test
  in `src/tests/architecture/`, not a standalone script — see ADR 0006 for
  why (the old CLI-script approach silently never worked).
- Run `npm test` before every commit that touches `src/`. It's fast
  (~10-15s) — there's no excuse to skip it.

## RFC/ADR process

Any change to the dependency rules, the layering, or a decision that a
future contributor would reasonably ask "why was it built this way" about
— write an RFC first (`docs/rfc/rfc-process.md`), not after the fact. ADRs
0002-0006 were written retroactively in Phase 11 specifically because this
didn't happen during Phases 2-10, and reconstructing the reasoning after
the fact is strictly worse than writing it down at decision time — you're
guessing at intent instead of stating it.
