# Copilot Build Prompt — Dual-Path Live Score Sync (Stream + Website)

Paste this into Copilot. It assumes the Node.js/Redis backend from the broadcast control system already exists (or is being built alongside this) and that the website repo is the existing Repdox site (React + Vite + TypeScript, shadcn/ui, Supabase, TanStack Query).

---

## PROMPT START

You are extending the Repdox broadcast control backend and the Repdox website (`MatchCentre.tsx` and related files) to support **two live-update paths with different latency requirements from a single write**.

### Why two paths (do not collapse these into one)

- **OBS broadcast overlays** need updates in well under 100ms with no visible lag — this is live, on-air, in front of an audience. They subscribe directly to the Node backend's WebSocket/Redis pub-sub layer. No database round-trip in this path, ever.
- **The website's Match Centre page** can tolerate one to a few seconds of lag — this is fine for a webpage and should use **Supabase Realtime** (Postgres change subscriptions), reusing the site's existing Supabase setup rather than building a second custom live-data system for the website.
- Both paths originate from the **same single write**, issued once by the admin, through the Node.js backend. Never let two independent systems write live match state — that causes drift between what's on stream and what's on the website.

### Part 1 — Node.js backend changes

In the existing backend (Express/Fastify + `ioredis` + `ws`), locate the score/timer/scene/match-state mutation logic (REST routes under something like `routes/match.js`). For every mutation:

1. Write to Redis (existing behavior) and publish to the relevant WebSocket channel immediately — this must remain the very first thing that happens, before anything else, so the fast path is never delayed by what comes next.
2. **After** the Redis write/publish completes (fire-and-forget, do not `await` in a way that blocks the response or delays step 1), push the same state to Supabase via the Supabase JS client (service role key, backend-only, never exposed to the browser). Wrap this in try/catch — a Supabase write failure must never crash the backend or block the fast path; log and continue.
3. Add a small `supabaseSync.js` module that owns this: exports a function like `syncMatchStateToSupabase(matchId, state)` that upserts into the relevant tables (`matches`, `match_maps` — match the existing schema already used by `tournamentService.ts` in the website repo, specifically the `match_status`, and the map-level `team_a_score`/`team_b_score`/`map_status` fields).
4. Use Supabase's JS client `upsert` with the match/map primary key so repeated calls during a live match don't create duplicate rows — this will be called frequently (every score change), so it needs to be idempotent.

### Part 2 — Website changes (`MatchCentre.tsx` and supporting files)

1. Add a Supabase Realtime subscription for the current match. Subscribe to Postgres changes on the relevant tables (matches by `id`, match_maps by `match_id`) scoped to the current `matchId` from the route params. On any change event, update local component state directly from the payload rather than always re-running the full `getMatchCentreData` query — but keep a `refetch()` fallback on reconnect/error so the page self-heals if a realtime event is missed.
2. Set up the subscription in a `useEffect` that mounts when `matchId` is available and cleans up (unsubscribes) on unmount or when `matchId` changes — no leaked subscriptions when navigating between matches.
3. Show a small live-connection indicator in the UI (e.g., a subtle "Live" badge with a pulse when the Realtime channel is connected, and a distinct state — not just silence — if the channel disconnects) so admins/viewers can tell if the page has genuinely gone stale versus the match just not having new events yet.
4. **Decide the fate of the existing website admin form** in `MatchCentre.tsx` (the "Admin Live Controls" card that currently calls `updateTournamentMatch`/`updateMatchMap` directly against Supabase). To prevent two independent write paths during a live match:
   - Either gate this form to only be usable/visible when `match_status` is `upcoming` or `completed` (pre-match setup and post-match corrections), and disable/hide the live-score-editing controls (Start Match, Update Map, live score fields) whenever `match_status === 'live'`, replacing them with a message pointing to the broadcast admin dashboard as the source of truth during live play.
   - Or, if the producer genuinely needs a website-based fallback control during live matches (e.g., no broadcast admin dashboard access in the moment), route those same button actions through the Node backend's REST API instead of writing to Supabase directly, so there remains exactly one write path regardless of which UI triggered it. Prefer this option if there's any chance the website admin form needs to be used live.
5. Ensure the Realtime payload types match what `getMatchCentreData` already returns (`MatchCentreData` type) so you're not maintaining two different shapes of the same data — if the Realtime payload is a raw row change, map it into the same shape the rest of the component already expects, in one shared helper.

### Non-negotiables

- The Node backend's Redis write + WebSocket publish must never be delayed, blocked, or made conditional on the Supabase write succeeding. If Supabase is down, the broadcast must be completely unaffected.
- No polling on the website — use the Realtime subscription, not a `setInterval` refetch. Polling either wastes requests or adds unnecessary lag versus just subscribing properly.
- No polling or Postgres involvement anywhere in the OBS overlay path — overlays only ever talk to the Node backend's WebSocket layer, never Supabase, directly or indirectly.
- Confirm cleanup: Realtime subscriptions and WebSocket connections must both be properly torn down on unmount/navigation to avoid duplicate event handlers stacking up across a long broadcast session (e.g., an admin leaving a tab open across many matches).

## PROMPT END
