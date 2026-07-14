# Phase 3 Migration Plan — Core Services

Date: 2026-07-14

This document lists planned changes for Phase 3: moving true cross-cutting logic into `src/core` while preserving all behavior and creating compatibility shims.

Goals

- Implement core services: Authentication, User, Permission, Notification, Analytics, Asset
- Move shared business logic into `src/core/services/impl/*`
- Add service interfaces in `src/core/services/interfaces/`
- Register default implementations via `src/core/services/registerDefaults.ts`
- Create compatibility shims in `src/lib/*` that delegate to core services so existing imports remain valid
- Preserve existing behavior and API surfaces; no breaking changes

Files to be CREATED

- `src/core/services/interfaces/IAuthService.ts`
- `src/core/services/interfaces/IPermissionService.ts`
- `src/core/services/interfaces/INotificationService.ts`
- `src/core/services/interfaces/IAnalyticsService.ts`
- `src/core/services/interfaces/IAssetService.ts`
- `src/core/services/impl/AuthService.ts`
- `src/core/services/impl/UserServiceImpl.ts`
- `src/core/services/impl/PermissionServiceImpl.ts`
- `src/core/services/impl/NotificationServiceImpl.ts`
- `src/core/services/impl/AnalyticsServiceImpl.ts`
- `src/core/services/impl/AssetServiceImpl.ts`
- `src/core/services/registerDefaults.ts` (registers the above implementations)

Files to be MODIFIED (compatibility shims)

- `src/lib/profileService.ts` — replace internal logic with delegation to `UserService` methods
- `src/lib/storageService.ts` — delegate uploads/signed URL helpers to `AssetService`
- `src/lib/adminService.ts` — delegate notification and permission checks to `NotificationService` and `PermissionService`
- `src/lib/eventImages.ts` — delegate asset mapping and lookup to `AssetService`

Why these changes

- Centralize shared logic to avoid duplication across the codebase and give domains a stable contract to consume
- Preserve existing file-level APIs so domain code and pages keep functioning
- Use a minimal DI/registry (`src/core/services/di.ts`) to allow future wiring of mocks and replacements in tests

Compatibility & Safety

- All modified files will keep the same exported function names and signatures
- Implementations will call the Supabase client and other existing integrations; no change in runtime behavior
- Add `registerDefaults.ts` and import it in compatibility shims to ensure services are registered lazily

Verification plan (post-implementation)

- Type-check entire workspace
- Run unit tests (if present) and a smoke check script that exercises key pages (manual or CI)
- Confirm no changes to UI or routes

Rollback

- Revert the commit(s) that add/modify Phase 3 files
- Verify `git status` is clean and run CI checks

Approval

- Proceeding with implementation now per your instruction. If you want changes to the plan, stop me now and I'll adjust before implementing.
