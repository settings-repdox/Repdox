# Repository Map

Top-level layout and what actually lives where, as of Phase 11. This
supersedes any earlier "future structure" notes in `phase-1-scope.md` /
`phase-2-foundation.md` — those describe the plan; this describes the
result.

```
Repdox/
├── api/                      Vercel serverless API routes — see docs/api/README.md
├── docs/                     This documentation tree
├── functions/                Canonical Supabase Edge Function source for
│                              some functions — see "Function duplication"
│                              in docs/api/README.md before assuming this
│                              or supabase/functions/ is authoritative
├── Gaming_Event_Assets/      Design system notes and build prompts for the
│                              gaming/broadcast admin + overlay UI (not yet
│                              wired into src/ — see its own DESIGN_SYSTEM.md)
├── instagram_assets/         Static marketing image assets
├── public/                   Static assets served as-is by Vite
├── registration-portal/      Standalone vanilla JS/HTML micro-app, not part
│                              of the main React build — see its own files;
│                              no README existed for it before Phase 11
├── repdox-discord-bot/       Standalone Deno/Node Discord bot (account
│                              linking, team roles, moderation) — has its
│                              own README.md, deployed separately (Railway)
├── scripts/                  One-off/maintenance scripts (see below)
├── src/                      Main application — see layer breakdown below
└── supabase/
    ├── functions/            Supabase Edge Functions (deploy target) —
    │                          some are re-exports of functions/, some are
    │                          independent, see docs/api/README.md
    └── migrations/           SQL migrations — currently only covers the
                               esports/gaming schema additions plus the
                               bracket_url fix (ADR 0004). The base `events`
                               table and most core tables predate this
                               migrations folder and were created directly
                               via the Supabase dashboard — there is no
                               single-source-of-truth schema file to diff
                               code against. See PHASE11_COMPLIANCE_REPORT.md.
```

## `src/` layer breakdown (see ADR 0002 for the dependency rules between these)

```
src/
├── core/
│   └── services/
│       ├── di.ts                 Service locator (ADR 0003)
│       ├── registerDefaults.ts   Composition root — see RFC 0001
│       ├── interfaces/           6 of 10 services' contracts (+ 1 stale
│       │                         dead file, + IRegistrationService which
│       │                         belongs to a domains/ implementation —
│       │                         see docs/architecture/service-contracts/)
│       └── impl/                 6 of 10 services' implementations
├── domains/
│   ├── events/        {dtos,interfaces,impl,__tests__}/
│   ├── gaming/         {dtos,interfaces,impl}/
│   ├── production/     {interfaces,impl}/
│   ├── registrations/  {impl}/  (interface lives in core — see service-contracts)
│   └── tickets/        {dtos,interfaces,impl,__tests__}/  (ADR 0007)
├── infrastructure/
│   ├── di.ts                     Separate adapter registry (ADR 0003)
│   ├── verifyArchitecture.ts     Isolation check, run as a Vitest test
│   └── broadcast/       {interfaces,impl}/  — 7 adapters, ADR 0005
├── shared/
│   └── dtos/            Cross-domain DTOs (event, registration,
│                         production, user)
├── integrations/
│   └── supabase/        Client + generated types — see ADR 0002 re: who's
│                         allowed to import this directly (not pages/components)
├── lib/                 Legacy/transitional utilities not yet migrated to
│                         a domain (e.g. tournamentService.ts,
│                         inputValidator.ts) — see technical debt notes
├── pages/                One file per route, React Router — the biggest
│                         source of dependency-rule violations (25 files
│                         import Supabase directly; see compliance report)
├── components/           Shared UI components
├── modules/               Scaffolded in Phase 1 for future platform
│                         capabilities; still largely unpopulated
├── tests/
│   ├── domains/          Unit tests, one file per domain service
│   ├── integration/      DI container + cross-domain workflow tests
│   ├── broadcast/         Adapter registry + stub contract tests
│   ├── architecture/     Dependency-rule verification (replaces old CLI scripts)
│   └── e2e/               Playwright specs (separate from the Vitest run)
└── App.tsx / main.tsx     Entry points
```

## `scripts/`

One-off or maintenance scripts, run manually via `npx tsx scripts/<name>.ts`
(or similar) — not part of the build or test pipeline:

- `sync-teams.ts` — syncs team data (likely with Discord roles; see
  `repdox-discord-bot`'s `/sync` command).
- `create_message_bucket.ts` — provisions the private `messages` Storage
  bucket used by the `send-message` Edge Function.
- `set_db_encryption_key.ts` — sets a database-level encryption key.
- `phase9-dry-run.ts` — a dry-run verification script from the Phase 9
  cleanup; kept for reference, not part of any current workflow.

None of these are seed scripts for test data — see RFC 0002 for the
proposal to add one for E2E fixtures.
