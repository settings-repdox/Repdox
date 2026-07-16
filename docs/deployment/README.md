# Deployment

Repdox has three independently-deployed pieces. Deploying one does not
deploy the others — don't assume a `git push` covers everything.

## 1. Frontend + Vercel API routes (main deploy)

Deployed via Vercel, configured by `vercel.json` at the repo root:

- Build command: `npm run build` (→ `vite build`)
- Output directory: `dist`
- `api/*` routes are deployed automatically as Vercel serverless functions
  — no separate deploy step needed for these; they ship with the same
  build as the frontend.
- Security headers (`X-Frame-Options`, `Strict-Transport-Security`, etc.)
  are set in `vercel.json`, not in application code — if you need to
  change CSP/frame policy, edit there.
- SPA routing: `vercel.json` rewrites all non-`/api` paths to
  `/index.html`, so React Router handles routing client-side.

**To deploy**: push to the branch Vercel is configured to auto-deploy from
(check the Vercel project dashboard — not specified in-repo), or trigger a
manual deploy from the Vercel dashboard/CLI (`vercel --prod`).

**Required env vars**: see `docs/deployment/environment.md` — at minimum
the `VITE_*` frontend vars and the `api/` server-side vars (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RSVP_CRON_SECRET`,
`SUPPORT_EMAIL`), set in the Vercel project's environment settings.

## 2. Supabase (database + Edge Functions)

Two separate things live in Supabase, deployed differently:

### Database migrations

```bash
supabase db push        # applies supabase/migrations/*.sql to the linked project
```

**Read this before assuming migrations capture the full schema**: only
esports/gaming-related tables and the `bracket_url` fix (ADR 0004) are
covered by files in `supabase/migrations/`. The base `events` table and
most core tables were created directly in the Supabase dashboard before
this migrations folder existed and are **not** reproducible from
`supabase db push` alone. There is no single command that recreates the
full schema from scratch. See
`docs/architecture/PHASE11_COMPLIANCE_REPORT.md` for this gap.

### Edge Functions

```bash
supabase functions deploy <name>
# e.g.
supabase functions deploy send-verification
supabase functions deploy export-registrations-xlsx
supabase functions deploy event-notification
supabase functions deploy send-message
```

**Read `docs/api/README.md`'s "Function duplication" section before
touching `send-verification` or `export-registrations-xlsx`** —
`export-registrations-xlsx` deploys a thin re-export of the canonical
implementation under `functions/`, but `send-verification` has two
genuinely independent implementations (`functions/` vs
`supabase/functions/`) that have drifted apart, and it's not documented
anywhere which one is actually live. Confirm before shipping a fix to
verification-sending logic.

Set function secrets via:

```bash
supabase secrets set SENDGRID_API_KEY=... SENDGRID_FROM=... # etc — see environment.md
```

### Existing CI: automatic deploy for two functions

`.github/workflows/deploy-send-verification.yml` runs on every push to
`main` that touches `functions/send-verification/**` or
`functions/export-registrations-xlsx/**`, and deploys both automatically
via the Supabase CLI (needs `SUPABASE_ACCESS_TOKEN` and
`SUPABASE_PROJECT_REF` set as GitHub Actions secrets — not covered in
`docs/deployment/environment.md`, which only covers app-runtime vars, not
CI secrets). This is the **only** existing CI automation in the
repository — no workflow runs the test suite, lints, or checks the build
(see RFC 0002). `event-notification` and `send-message` have no CI
deploy step and must be deployed manually with the `supabase functions
deploy` commands above.

## 3. Standalone sub-projects (deployed independently of the above)

- **`repdox-discord-bot/`** — deployed to Railway (`railway.toml` present
  in that folder). Has its own `package.json`, its own env vars (Discord
  token, client ID — see that folder's README), and its own deploy
  pipeline entirely separate from Vercel/Supabase.
- **`registration-portal/`** — a standalone static HTML/JS micro-app
  (`index.html`, `main.js`, `style.css`, `env-config.js`,
  `setup-registration-portal.sh`). No build step visible in-repo beyond
  its own setup script; deploy target not documented anywhere in the repo
  as of Phase 11 — check with whoever set it up, or treat
  `setup-registration-portal.sh` as the starting point for figuring out
  how it's hosted.

## Local development

```bash
npm install
npm run dev          # Vite dev server, http://localhost:5173
npm test              # Vitest — unit/integration/broadcast/architecture (~10-15s)
npm run test:coverage # same, with coverage report
npm run test:e2e      # Playwright — needs `npx playwright install` first, and
                       # ideally E2E_GAMING_EVENT_SLUG set (see RFC 0002)
npm run lint
npm run build          # production build, same as what Vercel runs
```

For the Discord bot and registration portal, see their own folders — they
are not started by any of the commands above.

## Related

- `docs/deployment/environment.md` — full environment variable reference.
- `docs/api/README.md` — what each API route/function does and what it
  needs configured.
- `docs/runbooks/` — what to do when something in this list breaks.
- `docs/operations/handbook.md` — routine operational tasks beyond initial
  deployment.
