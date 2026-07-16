# Operations Handbook

Routine operational tasks. For *incidents* (something specific broke),
use `docs/runbooks/` instead — this doc is for things you'd do on a normal
day or a normal release, not in response to a page.

## Daily / per-PR

- **Run the test suite before merging anything**: `npm test`. No CI
  enforces this yet (see RFC 0002) — it's on you until that lands.
- **Check `npm run build` succeeds**, not just `npm run dev` working — the
  dev server is more forgiving about type errors than the production
  build.

## Releasing

There's no formal release process/versioning scheme documented in this
repo as of Phase 11 (no CHANGELOG, no version tags observed). In practice:
merging to `main` is what ships, since Vercel auto-deploys from it (see
`docs/deployment/README.md`) and `.github/workflows/deploy-send-verification.yml`
auto-deploys two Edge Functions from it. Treat every merge to `main` as a
production release.

**Before merging to `main`**:
1. `npm test && npm run lint && npm run build` all pass.
2. If your change touches `supabase/migrations/`, apply it
   (`supabase db push`) to production *separately* — merging the migration
   file doesn't apply it automatically; there's no CI step for this. Do
   this **before** merging code that depends on the new schema, not after
   (see the bracket_url incident runbook for what happens when code and
   schema are out of sync).
3. If your change touches `functions/send-verification/` or
   `functions/export-registrations-xlsx/`, know that merging to `main`
   auto-deploys it — there's no staging/review step for these two
   specifically.

## Monitoring

Not documented anywhere in the repo as of Phase 11 — no observability/
error-tracking tool config found (no Sentry, LogRocket, or similar wired
in). If one exists, it's set up entirely outside this repository and
should be documented here. Until then, "monitoring" in practice means:
Vercel's own deployment/function logs, Supabase's dashboard logs, and
users reporting things directly (as happened with both incidents in
`docs/runbooks/`).

## Managing Supabase migrations

```bash
supabase db push        # apply all pending migrations to the linked project
```

Remember: this only applies what's in `supabase/migrations/`, and that
folder does not contain the full schema (see
`docs/architecture/repository/README.md`). There is currently no command
that recreates the database from scratch from this repo alone.

When adding a migration:
- Name it `<timestamp>_<description>.sql`, matching the existing files in
  `supabase/migrations/` (e.g. `202607150001_add_bracket_url_to_events.sql`).
- Prefer `IF NOT EXISTS`/`IF EXISTS` guards on additive/destructive
  changes so the migration is safe to re-run.
- Update `src/integrations/supabase/types.ts` by hand to match (there's no
  automated type-generation step wired into this repo's scripts as of
  Phase 11 — `supabase gen types typescript` would normally do this, but
  isn't in `package.json`'s scripts). Forgetting this step is exactly what
  let the `bracket_url` bug ship in the first place — see ADR 0004.

## Managing broadcast infrastructure

Everything under `src/infrastructure/broadcast/` is currently stubbed
(ADR 0005, `docs/architecture/broadcast/README.md`) — there is no live
broadcast infrastructure to operate yet. When real adapters are built,
this section should be expanded with actual operational procedures
(provisioning RunPod compute, monitoring MediaMTX stream health, etc.).
Nothing to operate here today beyond running the existing stub tests
(`npm test -- src/tests/broadcast`).

## Coverage and technical debt tracking

- `npm run test:coverage` regenerates `coverage/lcov-report/index.html`
  and `coverage/coverage-summary.json`. Not committed to the repo
  (`.gitignore`'d as of Phase 11) — regenerate locally when you need
  current numbers.
- `TECHNICAL_DEBT_PHASE10.md` and
  `docs/architecture/PHASE11_COMPLIANCE_REPORT.md` are point-in-time
  snapshots, not living documents that auto-update. If you fix an item
  from either, update the doc in the same PR — don't leave it claiming a
  problem exists after you've fixed it (this is exactly the kind of drift
  Phase 11 was created to fix in the first place, after Phase 9's
  completion report made a compliance claim that didn't hold up).

## Standalone sub-projects

`repdox-discord-bot/` and `registration-portal/` are operated
independently of the main app (see `docs/deployment/README.md`). Nothing
in the main `npm test`/`npm run build` pipeline covers them — if you
change either, test and deploy them using their own tooling.
