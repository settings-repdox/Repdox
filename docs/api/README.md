# API Documentation

Repdox has two separate backend surfaces, deployed and invoked differently.
Don't confuse them:

1. **Vercel API routes** (`api/`) — Node serverless functions, deployed
   automatically with the frontend build, reachable at `/api/*` on the
   deployed domain.
2. **Supabase Edge Functions** (`supabase/functions/`, and — confusingly —
   also `functions/` at repo root; see "Function duplication" below) —
   Deno functions, deployed separately via `supabase functions deploy`,
   reachable at `https://<project>.supabase.co/functions/v1/<name>`.

Every route below documents itself in a header comment in its source file —
this doc is a consolidated index generated from those comments, not a
separate source of truth. If code and doc disagree, the code's header
comment wins; fix this file to match, not the other way around.

---

## Vercel API routes (`api/`)

All routes use the shared helpers in `api/_utils.ts`:

- `getSupabaseAdmin()` — a Supabase client authenticated with
  `SUPABASE_SERVICE_ROLE_KEY`, used server-side only (never exposed to the
  client).
- `verifyAuth(token)` — verifies a JWT's signature against Supabase Auth
  (via `supabase.auth.getUser(token)`) and returns the user ID, or `null`.
  This is the only correct way to authenticate a request server-side;
  do not decode the JWT payload without verifying its signature.
- `getClientIP(headers)` — extracts the client IP from
  `x-forwarded-for` for rate-limiting/quota purposes.

### `POST /api/contact/send`

Sends a contact-form submission to `supportrepdox@gmail.com` via Resend.

- **Auth**: none (public endpoint).
- **Security**: runs `performSecurityCheck()` (`src/lib/inputValidator.ts`)
  against the combined input to catch injection attempts; returns `403`
  with `code: "security_anomaly"` if triggered.
- **Body**: `{ name: string, email: string, message: string }`
- **Response**: `{ success: true, message: string }` or `{ error: string }`
- **Env required**: `RESEND_API_KEY`

### `POST /api/events/create`

Creates a new event, with duplicate detection and a quota.

- **Auth**: required (verified via `verifyAuth`).
- **Limits**: 5 events per day per user; blocks/warns on detected
  near-duplicate events (same title/location/date window).
- **Body**: `{ title, description, location, city, start_at, end_at, registration_deadline?, capacity?, roles?, short_blurb? }`
- **Response**: `{ event_id: uuid, message: string }` or
  `{ error: string, code: "quota_exceeded" | "duplicate_detected" | ... }`

### `POST /api/events/register`

Registers a user or guest for an event. This is the API route backing the
form in `src/pages/EventRegister.tsx` (see ADR 0002 re: that page also
writing to Supabase directly in places — this API route is the sanctioned
server-side path, not everything on that page goes through it).

- **Auth**: optional — supports both authenticated (token) and guest
  (name + email) registration.
- **Limits**: 200 registrations per day per user; rejects duplicate
  registration for the same event; uses a Supabase RPC function for
  atomicity (role-capacity checks and insert happen in one transaction).
- **Body**: `{ event_id: uuid, user_id?: uuid, name?: string, email?: string, phone?: string, message?: string, role?: string }`
- **Response**: `{ registration_id: uuid, status: string, message: string }`
  or `{ error: string, code: "quota_exceeded" | "already_registered" | "role_full" | ... }`

### `POST /api/events/rsvp`

Records an RSVP response for an event.

- **Auth**: optional (guest RSVP requires `email`).
- **Body**: `{ event_id: uuid, response: "attending" | "not_attending" | "maybe", email?: string, user_id?: uuid, notes?: string }`
- **Response**: `{ id: uuid, status: "submitted", message: string }` or
  `{ error: string, code: "event_not_found" | "rsvp_closed" | "invalid_response" | ... }`

### `POST /api/events/send-rsvp-emails`

Sends RSVP reminder emails to everyone registered for an event. Designed
to be triggered either by a cron job (via the `X-RSVP-Secret` header,
checked against `RSVP_CRON_SECRET`) or manually by the organiser (via a
user auth token).

- **Auth**: `X-RSVP-Secret` header **or** a user token in the body.
- **Body**: `{ event_id: uuid, user_token?: string }`
- **Response**: `{ success: true, emails_sent: number, failed: number }` or
  `{ error: string, code: string }`
- **Env required**: `RESEND_API_KEY`, `VERCEL_URL` (used to build the RSVP
  link in the email; falls back to `https://repdox.com`), `RSVP_CRON_SECRET`

### `POST /api/profile/create`

Creates or updates the caller's own user profile.

- **Auth**: required. Users may only write their own profile — the route
  does not accept an arbitrary `user_id` in the body.
- **Body**: `{ full_name?, handle?, bio?, avatar_url?, phone?, website?, company?, job_title?, date_of_birth?, linkedin_url?, github_url?, twitter_url?, instagram_url?, portfolio_url? }`
- **Response**: `{ user_id: uuid, message: string }` or
  `{ error: string, code: "handle_taken" | "unauthorized" | ... }`

### `POST /api/profile/verify`

Two-step email/phone verification: request a token, then confirm it.

- **Auth**: required. Users may only verify their own contact info.
- **Limits**: 20 verification requests per user per day.
- **Body (step 1 — request)**: `{ type: "email" | "phone", contact: string }`
  → `{ verification_id: uuid, message: "Token sent", contact: string }`
- **Body (step 2 — confirm)**: `{ type, contact, token: string, verify: true }`
  → `{ verified: true, message: "Verification successful" }` or
  `{ error: string, code: "invalid_token" | "token_expired" | ... }`
- Phone tokens are 6-digit numeric OTPs; email tokens are 32-character
  hex strings.

---

## Supabase Edge Functions

Two locations exist for these — see "Function duplication" below before
editing either. Documenting by **canonical implementation location**:

### `send-verification` (canonical: `functions/send-verification/index.ts`)

Sends the actual verification email (SendGrid) or SMS (Twilio) triggered
by `POST /api/profile/verify`'s step 1.

- **Env required**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or
  `SERVICE_ROLE_KEY`/`SERVICE_ROLE` as fallbacks — some Supabase CLI secret
  stores reject vars prefixed `SUPABASE_`), `SENDGRID_API_KEY`,
  `SENDGRID_FROM`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`.
  Optional: `DEV_TWILIO_LOG=true` for verbose debug logging.
- Deploy: `supabase functions deploy send-verification`

### `export-registrations-xlsx` (canonical: `functions/export-registrations-xlsx/index.ts`)

Generates an `.xlsx` export of an event's registrations (via SheetJS/`xlsx`
loaded from esm.sh), uploads it to a private Storage bucket, and returns a
time-limited signed URL. Requires the requesting user to be authenticated
and (implementation-checked, not just client-trusted) authorized to view
that event's registrations.

- **Env required**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or
  fallbacks as above), `EXPORTS_BUCKET` (default `"exports"`),
  `EXPORTS_SIGNED_URL_EXPIRES` (default `3600` seconds).
- Deploy: `supabase functions deploy export-registrations-xlsx`

### `event-notification` (`supabase/functions/event-notification/index.ts` — no root-level counterpart)

Sends a notification when an event's status changes.

- **Body**: `{ eventId: string, status: string }`
- **Env required**: standard Supabase service-role vars (see `_utils.ts`
  pattern above; this function creates its own client directly rather than
  sharing a helper — Edge Functions can't import from `api/_utils.ts`,
  which runs in the Vercel Node runtime, not Deno).
- Deploy: `supabase functions deploy event-notification`

### `send-message` (`supabase/functions/send-message/index.ts` — no root-level counterpart)

Uploads message attachments to the private `messages` Storage bucket and
calls the `app.send_message` Postgres RPC function. Used by the in-app
messaging feature.

- **Body**: `multipart/form-data` with fields `conversation_id`,
  `sender_id`, `plaintext` (all required), plus optional file attachments.
- **Env required**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or
  fallbacks).
- Deploy: `supabase functions deploy send-message`

---

## Function duplication — read before editing `send-verification` or `export-registrations-xlsx`

Both `functions/` (repo root) and `supabase/functions/` have folders named
`send-verification` and `export-registrations-xlsx`. They are **not**
duplicates of each other in the same way:

- **`export-registrations-xlsx`**: `supabase/functions/export-registrations-xlsx/index.ts`
  is a genuine 3-line re-export —
  `export * from "../../../functions/export-registrations-xlsx/index.ts"` —
  present only so `supabase functions deploy` (which expects code under
  `supabase/functions/`) has something to find. The real implementation is
  the 143-line file under `functions/`. Edit that one.
- **`send-verification`**: **not** a re-export. `functions/send-verification/index.ts`
  (203 lines) and `supabase/functions/send-verification/index.ts` (167
  lines) are two independent implementations that have drifted apart.
  `.github/workflows/deploy-send-verification.yml` auto-deploys
  `functions/send-verification` (the root-level one) to Supabase on every
  push to `main` — so that's very likely the one actually live in
  production, but this is inferred from the CI workflow, not stated
  anywhere explicitly. The `supabase/functions/send-verification/index.ts`
  copy is not deployed by any workflow in this repo, which suggests it's
  either stale/abandoned or deployed manually by someone outside what's
  captured here. This is called out in
  `docs/architecture/PHASE11_COMPLIANCE_REPORT.md`. **Until this is
  resolved, treat any change to verification-sending logic as needing to
  be applied to `functions/send-verification/index.ts` (the one CI
  deploys) at minimum, and confirm with whoever manages the Supabase
  project whether the other copy matters at all.**

---

## Environment variables reference

See `docs/deployment/environment.md` for the full list with descriptions,
consolidated across API routes, Edge Functions, and the frontend build.

---

## Ticketing & QR Check-in (`api/tickets/`)

See ADR 0007 for the design writeup. **All 13 actions below are served by
a single Vercel Serverless Function**, `api/tickets/[action].ts`, using
Vercel's dynamic-route-segment convention — not 13 separate files. This
is a deployment-platform constraint, not a design choice: the Hobby plan
caps a deployment at 12 Serverless Functions total, and the 13
originally-separate route files exceeded that on their own, before even
counting the 7 pre-existing routes elsewhere under `api/`. URLs are
unaffected — `GET /api/tickets/get?token=X` still works exactly as
listed below; Vercel transparently maps the `[action]` segment to
whatever path segment the request actually used. If you need to add a
new ticket action, add a `handleX` function and a `HANDLERS` entry inside
`[action].ts` rather than a new file under `api/tickets/`.

All actions use the same `getSupabaseAdmin()`/`requireAuth()` helpers as
above, plus a ticketing-specific `isAuthorizedTicketStaff()` check
(`api/tickets/_utils.ts`) — event owner, global admin, or an explicit
`event_staff` grant.

| Action (`?action=`) | Method | Auth | Purpose |
|---|---|---|---|
| `get` | GET | None — token is the credential | Resolve a ticket for the `/ticket/:token` page |
| `my` | GET | User | List the caller's own tickets (dashboard access) |
| `generate` | POST | Staff | Manually generate a ticket for one registration |
| `checkin` | POST | Staff, rate-limited | The scanner's core atomic check-in call |
| `sync` | POST | Staff | Batch-upload queued offline scans |
| `validate` | GET | Staff | Read-only "what would this token resolve to" check |
| `cancel` | POST | Staff | Revoke a ticket |
| `reissue` | POST | Staff | Cancel + issue a replacement ticket |
| `search` | GET | Staff | Admin dashboard participant/ticket-code search |
| `stats` | GET | Staff | Live attendance statistics |
| `manifest` | GET | Staff | Offline manifest download for the scanner PWA |
| `enable` | POST | Owner/admin | Turn ticketing on/off for an event, backfill tickets |
| `staff` | POST/DELETE | Owner/admin | Grant/revoke scanner access for a volunteer |

Every mutation (`generate`, `checkin`, `sync`, `cancel`, `reissue`)
delegates to a `SECURITY DEFINER` Postgres RPC
(`supabase/migrations/202607160002_ticketing_rpc_functions.sql`) rather
than a plain table write — see that migration's header comment and ADR
0007 for why (mainly: `check_in_ticket()` must be atomic under concurrent
scans of the same physical ticket, which two volunteers scanning the same
QR code at the same gate at the same moment is a normal event-day
occurrence for, not an edge case).
