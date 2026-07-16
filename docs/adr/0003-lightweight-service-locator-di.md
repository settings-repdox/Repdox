# ADR 0003: Lightweight Service Locator for Dependency Injection

Date: 2026-07-15 (retroactive — documents decisions made across Phases 2-10)

## Status

Accepted.

## Context

Once domain services existed as interfaces + implementations (ADR 0002),
something had to wire concrete implementations to callers without pages
importing `*Impl.ts` classes directly (which would defeat the point of
having interfaces at all, and would make swapping implementations in tests
impossible without module-mocking gymnastics). A full DI framework
(InversifyJS, tsyringe, etc.) was considered too heavy for the project's
size and would have added a build-time dependency for a problem with a much
simpler solution.

## Decision

Use a minimal, hand-rolled service locator — a `Map<string, unknown>`
behind four functions — implemented twice, once per layer that needs it:

- `src/core/services/di.ts` — the domain/core service registry.
  `registerService(key, impl)`, `resolveService<T>(key)`,
  `replaceService(key, impl)` (upsert, used by tests), `clearServices()`
  (test teardown).
- `src/infrastructure/di.ts` — a separate registry for infrastructure
  adapters (broadcast adapters currently; could hold other infra adapters
  later). Same shape: `registerAdapter`, `resolveAdapter`,
  `replaceAdapter`. Deliberately kept as a *separate* registry from
  `core/services/di.ts` rather than one shared map, so that infrastructure
  concerns can't accidentally end up resolvable from domain code through
  the same lookup table — reinforces the isolation boundary from ADR 0002.

Both registries throw on `resolve*` for an unregistered key (fail loudly,
not `undefined`) and throw on double-`register*` for the same key (catches
accidental duplicate wiring). `replace*` is the escape hatch for tests that
need to swap in a mock after the real one is already registered.

Domain services are wired in one place: `src/core/services/registerDefaults.ts`
calls `registerService()` for all ten services
(Auth/User/Permission/Notification/Analytics/Asset/Event/Gaming/
Registration/Production). Broadcast adapters are wired in
`src/infrastructure/broadcast/registerAdapters.ts` via
`registerDefaultInfrastructureAdapters()`.

## Consequences

- No new runtime dependency, no decorators, no reflection — just two small
  files most contributors can read end-to-end in under a minute.
- Callers depend on interfaces (`IEventService`, `IGamingService`, etc.),
  not concrete classes, so tests can `replaceService("EventService", mock)`
  without any module-mocking framework. Phase 10's
  `src/tests/domains/*.test.ts` and `src/tests/integration/*.test.ts` rely
  on exactly this.
- The registry is a **module-level singleton** — state persists across
  test files run in the same Vitest worker unless explicitly cleared. This
  is why `src/tests/architecture/domain-service-registration.test.ts`
  calls `clearServices()` in `beforeEach`/`afterEach`, and why
  `src/tests/broadcast/broadcast-adapters.test.ts` had to use per-test
  unique key suffixes rather than the real fixed keys for most of its
  cases (`src/infrastructure/di.ts` has no `clearAdapters()` yet — tracked
  in `TECHNICAL_DEBT_PHASE10.md`).
- `core/services/registerDefaults.ts` wraps each `registerService()` call
  in a `try/catch` that silently ignores "already registered" errors,
  making it safe to call multiple times (e.g. once per test file that needs
  it). `infrastructure/broadcast/registerAdapters.ts` does **not** have
  this guard — calling `registerDefaultInfrastructureAdapters()` twice in
  the same process throws. This inconsistency is intentional-by-accident
  (nobody decided infra adapters should behave differently), not a
  deliberate design choice — see `TECHNICAL_DEBT_PHASE10.md` item 4.
- Because resolution is by string key rather than the TypeScript type
  system, a typo in a key (`"EventSevice"`) is a runtime error, not a
  compile error. `domain-service-registration.test.ts` exists specifically
  to catch this class of mistake for the ten registered services.
