# ADR 0004: Gaming Domain Extraction and the `bracket_url` Schema Gap

Date: 2026-07-15 (retroactive)

## Status

Accepted. Fix actually applied and committed in Phase 11 — see note at the
end of Context.

## Context

Esports tournament management (brackets, teams, matches, check-in) started
as ad-hoc logic inside `src/lib/tournamentService.ts` and page components
(`EventTournament.tsx`, `MatchCentre.tsx`, `EventTeams.tsx`). As the event
platform grew to support Hackathon, Workshop, and Gaming event types with
meaningfully different registration and management needs, tournament logic
was extracted into its own domain (`src/domains/gaming`) with DTOs
(`tournament.dto.ts`: `TournamentRecord`, `TournamentTeamRecord`,
`TournamentMatchRecord`), an interface (`IGamingService`), and an
implementation (`GamingServiceImpl`) — following the same shape as the
`events` and `registrations` domains (ADR 0002).

Separately, and only discovered during that work: the organiser-facing
"save bracket link" feature on the Tournament page
(`EventTournament.tsx`) wrote to `events.bracket_url` via Supabase, but no
migration in `supabase/migrations/` had ever created that column — the
`events` table's base schema predates this repo's migration history and
was evidently created directly in the Supabase dashboard. Every save
attempt failed with a Postgres "column does not exist" error
(PGRST204/42703). The code had been written against a type-cast (variously
`as Record<string, unknown>` or `as Partial<Database[...]["Update"]>`
depending on which code path) that satisfied TypeScript but not Postgres,
which is why the bug shipped and stayed live long enough for a user to
report it.

**Timeline note**: this bug was first diagnosed in an earlier working
session, but that session was interrupted (redirected to a different task)
before the fix — the migration file, the `types.ts` update, and the
`EventTournament.tsx` cast removal — was ever actually committed. Phase
10's testing work and early Phase 11 documentation drafts referenced this
fix as already applied, which was inaccurate; the migration file and
`types.ts` changes did not exist in the repository. This was caught by
Phase 11's own "verify documentation matches implementation" pass (the
same discipline this phase is documenting) when a doc cross-reference
check found the migration file didn't exist. The fix described below was
then actually applied and committed as part of Phase 11, not the earlier
session. See `docs/architecture/PHASE11_COMPLIANCE_REPORT.md`, item 7
under "mismatches found and fixed," for the full account — this is
arguably the most important finding in that report, since it's a case of
documentation almost shipping a claim that didn't match reality.

## Decision

1. Gaming/tournament state (`TournamentRecord`, `TournamentTeamRecord`,
   `TournamentMatchRecord`) is a distinct domain (`src/domains/gaming`),
   not a sub-concern of `events`. It has its own DTOs and its own service
   interface (`IGamingService`), resolved via `resolveService("GamingService")`
   like any other domain.
2. `events.bracket_url` is now a real column
   (`supabase/migrations/202607150001_add_bracket_url_to_events.sql`,
   `text`, nullable), and `src/integrations/supabase/types.ts`'s generated
   `events` Row/Insert/Update types include it. `EventTournament.tsx`'s
   `handleSaveBracket` tries the domain-service path first
   (`eventServiceCore().updateEvent(...)`, which now works without a cast
   since `EventDTO` already declared `bracket_url`/`bracket_link` as
   optional fields) and falls back to a direct Supabase update if that
   throws; both casts that previously masked the missing column (`as
   Record<string, unknown>` on one path, `as Partial<Database[...]
   ["Update"]>` on the other, plus `as any` on the domain-service call)
   were removed — the writes are now normal, correctly-typed calls.
3. `TournamentRecord` keeps both `bracket_url` and a legacy `bracket_link`
   field, with `?? ` fallback chains on the read side in
   `EventTournament.tsx`/`EventDetail.tsx`. `bracket_link` is **not** a real
   column — it's a defensive read-only fallback in case older rows or a
   future data source use that name. Do not write to `bracket_link`.

## Consequences

- Bracket-link saving works. This was reported by a user (July 2026) as
  "throwing up a Supabase error" and is now fixed and covered by the schema
  matching the code, though **no automated test exercises the actual save
  path** — see Gaps below.
- The gaming domain's DTOs use `[key: string]: unknown` index signatures on
  every record type (`TournamentRecord`, `TournamentTeamRecord`,
  `TournamentMatchRecord`). This was a pragmatic choice to avoid needing a
  full migration/type audit of every column the esports schema uses, but it
  means TypeScript won't catch a typo'd or genuinely-missing column the way
  it would for a fully-typed interface — the exact class of bug that caused
  the `bracket_url` incident in the first place. A stricter `IGamingService`
  contract (dropping the index signature once the schema is fully audited)
  is worth revisiting; not done in this pass to avoid scope creep beyond
  the reported bug.
- This incident is the concrete motivating example for the "verify
  documentation matches implementation" and schema-drift concerns raised in
  `docs/architecture/PHASE11_COMPLIANCE_REPORT.md` — the `events` table's
  full schema still isn't captured anywhere in `supabase/migrations/`
  (only esports-specific additions are), so there's no single source of
  truth to diff code against. RFC 0002 touches on seeding a known-good
  schema for E2E testing, which would also close this gap.

## Gaps not addressed by this ADR

- No unit or integration test covers `EventTournament.tsx`'s
  "save bracket URL" handler directly — Phase 10's gaming domain tests
  cover `GamingServiceImpl`, not this page-level Supabase call (which,
  per ADR 0002, is itself a `pages → supabase` direct-import violation
  that predates and is unrelated to the schema fix).
- No baseline migration exists for the `events` table's full column set —
  only additive migrations. Anyone recreating the database from
  `supabase/migrations/` alone would get an incomplete schema.
