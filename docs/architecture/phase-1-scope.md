# Phase 1 Scope

Phase 1 is a preparation phase only. It should:

- Add new repository structure for architecture migration.
- Create placeholder folders and docs for platform, services, integrations, and infrastructure.
- Include documentation and ADRs for the chosen migration path.
- Keep existing code in `src/lib/`, `src/pages/`, and current deployment configuration untouched.

Phase 1 should not:

- Move existing business logic into the new structure.
- Change application behavior or registration flow.
- Remove or rewrite stable code paths.
