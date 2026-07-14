# Phase 3 Verification Checklist & Results

Run these checks before merging Phase 3 changes into main.

Pre-merge automated checks

- [ ] `tsc --noEmit` passes across the workspace
- [ ] `npm run lint` (or project linter) passes
- [ ] Unit tests and CI pipeline pass (if present)

Runtime smoke tests (manual or CI script)

1. Sign in and sign out flows (visit `/signin`, `/auth/callback`) — ensure auth flow unchanged.
2. Profile avatar upload and retrieval — use existing UI to upload and view avatar.
3. Event image rendering on `EventDetail` and other pages — ensure images load as before.
4. Admin flows: approve and reject event — verify notifications are sent (Edge Functions or logs).
5. Delete account flow — ensure it still calls Edge Function and signs out.
6. Registration flows — confirm no change in behavior.

What to look for

- Errors or exceptions in browser console or server logs matching newly added files.
- Any change in response times for storage or edge invocations (should be negligible).

Post-merge monitoring

- Add observability for `NotificationService` and `AssetService` errors.
- Monitor frontend error rates for a few days after deploy.

Acceptance criteria

- All automated checks green
- Manual smoke tests pass
- No regressions in auth, profile, event pages

If verification fails

- Revert the Phase 3 commit(s) and investigate failing areas in a feature branch.

Notes

- This is a scaffolding and consolidation phase — no domain migration was performed.
