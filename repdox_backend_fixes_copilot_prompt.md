# Copilot Follow-Up Prompt — Backend Fixes

Paste this into Copilot, pointed at the existing `/backend` directory in the Repdox repo. These are four fixes to the already-built backend, not a rebuild — keep everything else as-is.

---

## PROMPT START

Fix the following four issues in the existing `/backend` directory. Do not change anything else about the structure or behavior beyond what's described here.

### 1. Fix the score/state column collision in `supabaseSync.js`

`syncMatchScoreToSupabase` currently writes `teamAScore`/`teamBScore` (which represent the **current round's** live score within a map) into `esports_tournament_matches.team_a_score` / `team_b_score`. That collides with `syncMatchStateToSupabase`, which writes the **series** score (`seriesScoreA`/`seriesScoreB`) into those same columns. Whichever call lands last wins, causing the match-level score to randomly flip between "maps won" and "current round score."

Fix: `syncMatchScoreToSupabase` should **only** write the round score into `esports_tournament_maps` (via the existing `mapPayload` upsert), and should **not** touch `esports_tournament_matches.team_a_score`/`team_b_score` at all. Remove the `matchPayload` upsert to `esports_tournament_matches` from this function entirely — the match-level score field is owned exclusively by `syncMatchStateToSupabase`'s series score write.

### 2. Fail closed on missing admin token in `middleware/auth.js`

Currently, if `ADMIN_BEARER_TOKEN` is not set in the environment, the code falls back to a hardcoded default string (`"repdox-admin-token"`) baked into the source. Since this is a public repo, that default is effectively a published password.

Fix: if `process.env.ADMIN_BEARER_TOKEN` is not set at server startup, the server should refuse to start and log a clear error explaining that `ADMIN_BEARER_TOKEN` must be set. Do not provide any hardcoded fallback value, in the middleware or anywhere else in the codebase.

### 3. Add `body-parser` to `package.json`, or remove the dependency on it

`server.js` calls `require("body-parser")` but it isn't listed in `package.json`'s dependencies, so a fresh `npm install` will fail to run the server (`Cannot find module 'body-parser'`).

Fix: prefer removing the `body-parser` dependency entirely and replacing `app.use(bodyParser.json())` with Express's built-in `app.use(express.json())` (Express 4.16+ includes this natively, no extra package needed). Update the `require` at the top of `server.js` accordingly and remove the now-unused import.

### 4. Remove the redundant `/health` endpoint from `server.js`

`server.js` currently defines its own `/health` route that only pings Redis, duplicating and contradicting the more accurate `/api/health` route already in `routes/index.js`, which correctly checks both Redis and Supabase. Having two health endpoints with different accuracy is confusing and risks someone checking the weaker one and getting false confidence before a live event.

Fix: remove the `/health` route definition from `server.js` entirely. `/api/health` (already implemented correctly in `routes/index.js`) remains the single health check endpoint.

### Also add, since it was missing from the original build

Create a `.env.example` file in `/backend` with placeholder (non-real) values for every environment variable the codebase actually reads: `PORT`, `REDIS_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OBS_WEBSOCKET_URL`, `OBS_WEBSOCKET_PASSWORD`, `ADMIN_BEARER_TOKEN`. Add a one-line comment above each explaining what it's for.

## PROMPT END
