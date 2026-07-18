# Phase 9 Repository Cleanup — COMPLETED ✅

**Date:** 2026-07-15  
**Status:** ✅ COMPLETE - All objectives achieved, build passing

## What Was Done

### ✅ Consolidated DTOs (Single Source of Truth)

- `src/shared/dtos/event.dto.ts` now comprehensive with all EventDTO fields
- `src/domains/events/dtos/event.dto.ts` re-exports from shared
- `src/domains/gaming/dtos/tournament.dto.ts` created for gaming types
- Gaming service imports now use domain DTO instead of legacy tournamentService

### ✅ Centralized Service Initialization

- `registerDefaults()` moved to `src/App.tsx` (single app-level call in useEffect)
- Removed 9 redundant `registerDefaults()` imports and calls
- Cleaned 13 files: AddEvent, EventDetail, EventRegister, EventTeams, EventTournament, MyEvents, Profile, OrganizerRegistrations, OrganizerTeams, adminService, profileService, eventImages, tournamentService
- All pages/components now use consistent `resolveService()` pattern

### ✅ Build & Verification

- Production build successful (7.06s, 2311 modules)
- No compilation errors
- Dependency rules verified compliant
- No circular dependencies detected

---

## Previous Phase 9 Findings (Context)

**Update (cleanup pass following Phase 11):** `src/lib/eventService.ts`,
`scratch.js`, and `src/domains/production/verifyDependencies.ts` (all
referenced below as still in use) have since been fully migrated away
from and were deleted as dead code — a repo-wide audit found zero
remaining imports of any of them. The findings below are kept for
historical context on how the migration got to that point, not as a
current-state description.

- Found legacy compatibility layers (`src/lib/eventService.ts`) used across many UI, scripts, and functions.
- Direct Supabase table usage of `event_registrations` and dynamic per-event tables is present in server scripts and some functions.
- Several files fallback to legacy queries when core services are unavailable (deferred compatibility behavior).
- Infrastructure and domain boundaries largely respected for new Phase 7/8 work, but legacy code still permeates.

Key findings (examples)

- `src/lib/eventService.ts`: compatibility shim used by pages/components (EventDetail, Profile, OrganizerTeams, EventRegister, etc.) — since fully migrated off and deleted.
- Direct table queries: `event_registrations` appears in `repdox-discord-bot/index.ts`, `scripts/sync-teams.ts`, `functions/export-registrations-xlsx/index.ts`, `api/events/send-rsvp-emails.ts`, and others.
- Dynamic table helpers: `getRegistrationTableName` in `src/lib/utils.ts` used widely as a fallback.
- Legacy scripts and tools referencing direct tables: `sync-teams.ts`, `scratch.js` (deleted — see update above), `registration-portal/main.js`.

Counts

- Files referencing `event_registrations` or dynamic registration tables: 30+ (see repo search for exact list).

Recommendations (Phase 9 roadmap)

1. ~~Replace all imports of `src/lib/eventService.ts` with direct `resolveService('RegistrationService')` or `EventService` usage where appropriate.~~ Done — see update above.
2. ~~Remove `src/lib/eventService.ts` only after all callers are migrated and tests passing.~~ Done.
3. Consolidate direct `.from('event_registrations')` queries into `RegistrationService` APIs; leave server-side scripts until migrated.
4. Standardize DTOs: create central `src/shared/dtos/index.ts` exports and update imports to use `@/shared/dtos` consistently.
5. Standardize logging: adopt the existing app logger (if present) or add a minimal `src/core/logger.ts` and replace console outputs in migrated files.
6. Remove obsolete folders: review `scratch.js`, legacy portal code, and any duplicated services under `src/lib/` after migration.
7. Run automated verifiers (`src/infrastructure/verifyArchitecture.ts`, `src/domains/production/verifyDependencies.ts`) and fix violations.

Automated cleanup approach

- I added a non-destructive dry-run script `scripts/phase9-dry-run.ts` which lists replacements and files to change; run with `--apply` to make edits.

Next steps

- Run the dry-run script and review the proposed edits.
- Migrate callers incrementally per-module and run tests between batches.
