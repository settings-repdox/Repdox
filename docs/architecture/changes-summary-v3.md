# Changes Summary — Baseline v3.0

This document explains each structural change introduced in Baseline v3.0 and the rationale for maintainability.

1. `src/domains/` created to represent business domains. Why: maps code to product ownership, reduces cross-team coupling, and keeps feature code colocated.

2. `src/core/` created for cross-cutting capabilities. Why: enforces separation between platform concerns and business logic. Core is the only layer that may be imported by domains for shared functionality.

3. `src/production/` created as a first-class domain. Why: broadcast/production is operationally distinct and must be developed with strict constraints (read-only of domain state) and specific adapters.

4. `src/shared/` decomposed into `types/`, `config/`, `utils/`, `constants/`. Why: avoids monolithic shared files and makes it clear where to place cross-cutting helpers.

5. `src/infrastructure/` reorganized by responsibility. Why: operational concerns belong here and should be accessed via adapters by higher-level modules.

6. Added `docs/rfc/` and `docs/adr/INDEX.md`. Why: formalizes decision-making and ensures architectural changes follow RFC→ADR flow.

7. Dependency rules added. Why: enforceable import directions reduce architectural entropy as the codebase grows.

Migration impact: None to runtime — only scaffolding and docs added. Implementation teams should follow these guidelines when migrating code in Phase 2.
