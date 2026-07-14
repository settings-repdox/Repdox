# Phase 2 Technical Debt Summary

Technical debt removed:

- None removed in Phase 2; Phase 2 is additive and focused on contracts.

Technical debt introduced (intentional, tracked):

- Minimal service locator (`src/core/services/di.ts`) introduces a global registry pattern — keep usage limited and plan removal or replacement with explicit DI in Phase 3.
- Basic validation utilities are simplistic and not schema-driven; recommend adopting a schema library (e.g., Zod) in a later phase.

Mitigation:

- Document registry usage guidelines in `docs/architecture/standards` and add lints or PR checks to prevent overuse.
- Plan to replace lightweight validation with a schema-first strategy when migrating domain DTOs.
