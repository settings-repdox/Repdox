# Runbook: "Save bracket link" throws a Supabase error

## Symptom

On the Tournament page (`src/pages/EventTournament.tsx`) for a Gaming
event, an organiser enters a bracket URL and clicks save. The request
fails with a Supabase/Postgres error rather than saving. This was reported
by a user in July 2026.

## Root cause

`EventTournament.tsx` wrote to `events.bracket_url`, but no migration in
`supabase/migrations/` had ever created that column — the `events` table's
base schema predates this repo's migration history (see
`docs/architecture/repository/README.md` — it was created directly in the
Supabase dashboard). Every save attempt failed with a Postgres "column
does not exist" error (PGRST204/42703). The code had been written against
`{ bracket_url: ... } as Record<string, unknown>` — a TypeScript cast that
silenced the compiler without making the column actually exist in the
database. Full writeup: ADR 0004.

## Fix applied

1. `supabase/migrations/202607150001_add_bracket_url_to_events.sql` — adds
   `events.bracket_url text`, nullable, with `IF NOT EXISTS` so it's safe
   to run against a database that might already have it.
2. `src/integrations/supabase/types.ts` — added `bracket_url` to the
   `events` table's Row/Insert/Update types.
3. `src/pages/EventTournament.tsx` — removed the `as Record<string,
   unknown>` cast; the update is now a normally-typed Supabase call.

## How to recognize this again

Any Supabase write that fails with an error mentioning a column name and
`PGRST204` or Postgres error code `42703` ("column ... does not exist") is
this exact class of bug: the code (and possibly its TypeScript types) say
a column exists, but the actual database doesn't have it. Check:

```bash
grep -rn "as Record<string, unknown>" src/pages src/domains
```

Any hit is a place where a TypeScript cast may be hiding a schema mismatch
the same way this one did — worth auditing if you see a similar error.

## Prevention (not yet done)

`docs/architecture/repository/README.md` and
`docs/architecture/PHASE11_COMPLIANCE_REPORT.md` both flag that the
`events` table's full schema isn't captured in `supabase/migrations/` —
only additive changes since Phase 9-ish are. Without a baseline migration
or a schema-diffing step in CI, there's no automated way to catch "code
references a column that isn't actually in the database" before a user
hits it in production. RFC 0002's seed-environment proposal would help
for E2E testing, but doesn't by itself solve schema-drift detection — that
would need a separate check (e.g. `supabase db diff` run in CI against a
linked project, or a generated-types freshness check). Not scoped as an
RFC yet; worth doing before another instance of this class of bug ships.
