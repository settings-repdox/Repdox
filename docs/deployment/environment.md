# Environment Variables

Every environment variable actually referenced in the codebase (audited via
`grep` across `src/`, `api/`, `functions/`, `supabase/functions/` in
Phase 11), grouped by where it's read. If you add a new one, add it here —
this list is the source of truth for "what needs to be set," since no
`.env.example` exists in the repo.

## Frontend build (Vite — `VITE_` prefix, bundled into the client build, not secret)

| Variable | Used for |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL, read by `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key, same file |
| `VITE_API_URL` | Base URL for calling `api/` routes from the frontend, if not same-origin |

**These are public** — anything prefixed `VITE_` is bundled into the
client-side JavaScript and visible to anyone. Never put a secret key
behind a `VITE_` prefix.

## Vercel API routes (`api/`) — server-side only, real secrets

| Variable | Used for |
|---|---|
| `SUPABASE_URL` | Server-side Supabase project URL (`api/_utils.ts`) |
| `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_KEY`) | Service-role Supabase key — bypasses RLS, used server-side only via `getSupabaseAdmin()`. **Never expose to the client.** |
| `RESEND_API_KEY` | Sends contact-form and RSVP emails via Resend (`api/contact/send.ts`, `api/events/send-rsvp-emails.ts`) |
| `RSVP_CRON_SECRET` | Shared secret for the RSVP-email cron trigger (`X-RSVP-Secret` header, `api/events/send-rsvp-emails.ts`) |
| `VERCEL_URL` | Set automatically by Vercel; used to build absolute links in emails |
| `SUPPORT_EMAIL` | Destination for contact-form submissions |
| `DISCORD_TOKEN`, `CLIENT_ID` | Discord bot integration (verify actual usage — also appear in `repdox-discord-bot/`, which has its own separate `.env`; confirm which surface these belong to before setting) |

## Supabase Edge Functions (`supabase/functions/`, `functions/`) — Deno, server-side

Deployed separately from the Vercel API routes; set these via
`supabase secrets set` or the Supabase dashboard, not Vercel's env config.

| Variable | Used for |
|---|---|
| `SUPABASE_URL` | Same project URL, read via `Deno.env.get()` |
| `SUPABASE_SERVICE_ROLE_KEY` (fallbacks: `SERVICE_ROLE_KEY`, `SERVICE_ROLE`) | Service-role key. Multiple names accepted because some Supabase CLI secret stores reject variables prefixed `SUPABASE_` — set at least one of the three. |
| `SENDGRID_API_KEY`, `SENDGRID_FROM` | Email verification tokens (`send-verification` function) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | SMS/phone verification tokens (`send-verification` function) |
| `DEV_TWILIO_LOG` | Set `"true"` for verbose Twilio debug logging — **do not set in production** |
| `EXPORTS_BUCKET` | Storage bucket name for registration exports (default: `"exports"`) |
| `EXPORTS_SIGNED_URL_EXPIRES` | Signed URL expiry in seconds for exports (default: `3600`) |

## Test environment (Vitest)

Not real secrets — fake values injected via `vitest.config.ts`'s
`test.env`, so the real Supabase client can initialize during tests
without hitting a real project (ADR 0006):

```
VITE_SUPABASE_URL=http://test-supabase.local
VITE_SUPABASE_ANON_KEY=test-anon-key
VITE_API_URL=http://test-api.local
```

Don't point these at a real project — they exist purely to satisfy the
client's "did someone configure this" check at module-load time.

## E2E tests (Playwright)

| Variable | Used for |
|---|---|
| `E2E_BASE_URL` | Dev server URL Playwright targets (default `http://localhost:5173`) |
| `E2E_GAMING_EVENT_SLUG` | Slug of a real/seeded Gaming event, required to run `gaming-registration-form.spec.ts` for real rather than self-skipping — see RFC 0002 |

## Not yet audited

`CI` and `ANALYZE` are read (`process.env.CI` in `playwright.config.ts`
and Vitest retry logic; `ANALYZE=true npm run build:analyze` for a bundle
analysis build) but aren't secrets needing a value set anywhere — listed
for completeness, not because they need configuring.
