# Phase 2 — Core Foundation

This document lists the Phase 2 foundation artifacts created and describes usage guidance. Phase 2 establishes shared DTOs, service interfaces, API response types, validation utilities and a minimal DI registry.

Created artifacts:

- `src/shared/dtos/*` — canonical DTO definitions
- `src/shared/interfaces/api.ts` — standard API response types
- `src/shared/contracts/*` — public contract markers
- `src/shared/validation/*` — simple validators
- `src/core/services/interfaces/*` — service interfaces
- `src/core/services/di.ts` — lightweight service registry

Guidance:

- Preserve existing APIs and imports.
- Domains should adopt these DTOs and interfaces incrementally.
- The DI registry is a minimal helper for wiring only; prefer explicit injection when practical.
