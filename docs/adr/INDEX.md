# ADR Index

List of Architecture Decision Records. Numbers are sequential and never
reused, even if a later ADR supersedes an earlier one (mark the earlier one
"Superseded" in its own Status section instead).

| # | Title | Status |
|---|---|---|
| 0001 | [Phase 1 repository preparation](0001-phase-1-preparation.md) | Accepted |
| 0002 | [Domain-driven layering and dependency rules](0002-domain-driven-layering-and-dependency-rules.md) | Accepted (1 known deviation, tracked) |
| 0003 | [Lightweight service locator for dependency injection](0003-lightweight-service-locator-di.md) | Accepted |
| 0004 | [Gaming domain extraction and the `bracket_url` schema gap](0004-gaming-domain-extraction-and-bracket-url-fix.md) | Accepted |
| 0005 | [Broadcast infrastructure as swappable adapters](0005-broadcast-infrastructure-adapter-pattern.md) | Accepted (interfaces/pattern only — see adapter status table) |
| 0006 | [Testing strategy: Vitest + Playwright](0006-testing-strategy-vitest-and-playwright.md) | Accepted |

ADRs 0002–0006 were written retroactively in Phase 11, documenting
decisions actually made across Phases 2–10 that were never recorded at the
time. Going forward, write the ADR *when the decision is made*, not months
later — see `docs/rfc/rfc-process.md` for how a decision should move from
RFC → ADR.

Add future ADRs here with number, short description, and status.
