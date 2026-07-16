# Architecture Principles

**Note (Phase 11):** the six principles below were written for Phase 1
specifically ("no runtime changes," "add scaffolding") and describe
constraints that no longer apply — Phases 2-10 made substantial runtime
and business-logic changes (domain migrations, DI, testing
infrastructure). Kept here for history. For current engineering standards,
see `docs/architecture/standards/README.md`.

1. Preserve current behavior.
2. Avoid any runtime or business-logic changes in Phase 1.
3. Keep existing code paths intact while adding scaffolding.
4. Use clear module boundaries and naming conventions.
5. Favor simple, incremental migration over large refactors.
6. Document all decisions and create a reusable repository scaffold.
