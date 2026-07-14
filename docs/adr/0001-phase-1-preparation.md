# ADR 0001: Phase 1 Repository Preparation

Date: 2026-07-14

## Status

Accepted

## Context

The Repdox project needs an incremental migration strategy. Phase 1 should prepare the repository for future modular architecture without changing app behavior.

## Decision

Create a set of scaffold directories and documentation files for:

- `src/modules/` for platform/domain modules
- `src/services/` for application services
- `src/shared/` for common types and utilities
- `src/integrations/` for third-party adapters
- `src/infrastructure/` for infrastructure concepts
- `docs/architecture/`, `docs/adr/`, `docs/deployment/` for planning and runbooks

Keep existing `src/lib/` and running app code unchanged.

## Consequences

- Enables incremental migration with minimal risk.
- Provides clear boundaries for Phase 2 work.
- Avoids introduction of new runtime behavior during preparation.
