# Runbook: Rolling back a bad deploy or migration

## Frontend / API routes (Vercel)

Vercel keeps every deployment. From the Vercel dashboard, find the last
known-good deployment and promote it to production ("Instant Rollback" —
no rebuild needed). This is the fastest option and should be the default
first move for a bad frontend/API deploy, before trying to fix-forward.

From the CLI: `vercel rollback <deployment-url>`.

## Supabase Edge Functions

No automatic rollback mechanism is configured. To roll back:

1. `git log -- functions/<name>/` (or `supabase/functions/<name>/`) to
   find the last-known-good commit.
2. `git checkout <commit> -- functions/<name>/index.ts`
3. `supabase functions deploy <name>`

For `send-verification` specifically, check
`.github/workflows/deploy-send-verification.yml` — if the bad version was
deployed via that workflow's auto-deploy on push to `main`, reverting the
commit on `main` (rather than deploying manually) will trigger a correct
re-deploy through the same path, which is cleaner than a manual
out-of-band deploy that CI doesn't know about.

## Database migrations

**There is no automated rollback for `supabase/migrations/`.** Migrations
in this repo are additive-only so far (see
`docs/architecture/repository/README.md` — no baseline schema migration
exists, only incremental additions like the `bracket_url` column from ADR
0004). To undo a migration:

1. Write a new migration that reverses it (e.g. `DROP COLUMN IF EXISTS`
   for a bad `ADD COLUMN`) rather than trying to delete or edit the
   original migration file — migrations that have already run against the
   production database should be treated as immutable history.
2. `supabase db push` to apply the reversal.
3. If the migration also involved a data backfill, check whether reversing
   the schema change alone is sufficient or whether data also needs
   correcting — schema rollback and data rollback are not the same thing
   and this repo has no tooling to distinguish them automatically.

**Before writing a reversal migration**, check whether any deployed code
depends on the column/table you're about to drop — a schema rollback that
races against a frontend deploy still expecting the new column will
produce the exact class of error described in
`docs/runbooks/incident-bracket-url-save-failure.md`, just in the opposite
direction.

## Discord bot (Railway)

Railway keeps deployment history; roll back via the Railway dashboard for
the `repdox-discord-bot` service, similar to Vercel's instant rollback.
Not verified against a real Railway project as part of this documentation
pass — confirm the exact UI flow with whoever manages that service.

## After any rollback

Add or update a runbook in this folder if the incident that caused the
rollback doesn't already have one — a rollback without a follow-up runbook
just delays the next occurrence rather than preventing it.
