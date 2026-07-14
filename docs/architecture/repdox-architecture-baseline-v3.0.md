# Repdox Architecture Baseline v3.0

Date: 2026-07-14

Status: Approved

This document establishes the canonical repository structure and engineering rules for Repdox before Phase 2 implementation.

## Summary

Repdox adopts a business-domain oriented repository layout. Key top-level folders:

- `src/core/` — cross-cutting platform capabilities
- `src/domains/` — business domains (events, registration, sponsors, certificates, assets, ...)
- `src/production/` — live production/broadcast orchestration and subdomains
- `src/shared/` — utilities, types, config, constants
- `src/integrations/` — third-party adapters
- `src/infrastructure/` — runtime responsibilities and adapters

This baseline includes mandatory dependency rules and an RFC→ADR governance process.

## Final repository tree (top-level highlights)

- src/
  - core/
  - domains/
    - events/
      - gaming/
      - hackathons/
      - workshops/
    - registration/
    - sponsors/
    - certificates/
    - assets/
  - production/
    - broadcast/
    - overlays/
    - replay/
    - observer/
    - streaming/
  - shared/
  - integrations/
  - infrastructure/

## Key decisions and rationale

1. Business-domain-first layout ensures clear ownership and easier scaling across multiple teams. Domains encapsulate UI components, hooks, services, types, API adapters and tests.
2. `production/` is a first-class domain because broadcast orchestration is operationally distinct from event domain data and must consume domain state without owning it.
3. `core/` holds only cross-cutting concerns. It must not become a home for business logic.
4. `shared/` is decomposed into directories to avoid monolithic shared files.
5. `infrastructure/` is organized by runtime responsibility to make operational concerns discoverable and avoid leaking business logic.

## Migration impact

- This is a purely scaffolding change; no application code or logic has been moved.
- Developers should follow the dependency rules and RFC process when implementing Phase 2.

## Next steps

- Use this baseline to guide Phase 2 migrations.
- Add ADRs for any deviation or clarification.

Approved: Engineering Leadership
