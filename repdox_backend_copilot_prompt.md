# Copilot Build Prompt — Node.js Backend (Fast Path + Supabase Mirror)

Paste this into Copilot. This builds the backend that the earlier overlay/admin-dashboard prompt and the website's Supabase Realtime integration both depend on. The website side (`MatchCentre.tsx`) is already built and expects match state to eventually land in Supabase's `esports_tournament_matches` and `esports_tournament_maps` tables — this backend is what will write there going forward, alongside driving the OBS overlays.

---

## PROMPT START

You are building the Node.js control-plane backend for Repdox's live broadcast system. This backend is the **single write path** for live match state — it is the only thing that mutates match/score/timer/scene state. Two consumers read from it, with very different latency tolerances:

- **OBS broadcast overlays** (browser sources) need updates in well under 100ms. They connect directly to this backend's WebSocket layer.
- **The Repdox website's Match Centre page** already has a Supabase Realtime subscription built and working — it reads from Postgres changes on `esports_tournament_matches` and `esports_tournament_maps`. It tolerates a few seconds of lag. This backend needs to write to those same tables so the website updates automatically, without the website needing any changes.

### Non-negotiable ordering

For every mutation: **Redis write + WebSocket publish happens first and is never delayed, blocked, or made conditional on anything else.** The Supabase write happens after, fire-and-forget, wrapped in try/catch, and must never crash the process or block the response if it fails. If Supabase is unreachable, the broadcast must be completely unaffected — only the website's live view degrades (it can always fall back to its own refetch/polling on reconnect, which is already handled client-side).

### Project structure

```
/backend
  server.js              -> Express (or Fastify) + ws server bootstrap, health check endpoint
  redis.js                -> ioredis client + pub/sub wrapper (subscribe/publish helpers)
  supabaseSync.js          -> Supabase JS client (service role key), syncMatchStateToSupabase()
  routes/
    match.js               -> REST endpoints: score, timer, scene, status mutations
    bracket.js              -> bracket update endpoint
  ws/
    broadcaster.js           -> subscribes to Redis channels, fans out to connected WS clients, handles reconnect/resync
  obs/
    obsClient.js              -> OBS WebSocket v5 client, triggers scene changes on scene:change
  middleware/
    auth.js                    -> bearer token check for admin-mutating routes
  .env.example
```

### Redis schema (implement exactly this)

```
match:{matchId}:state          HASH   { status, mapNumber, seriesScoreA, seriesScoreB, teamA, teamB }
match:{matchId}:score          HASH   { teamAScore, teamBScore, roundNumber }
match:{matchId}:timer          STRING (seconds remaining)
match:{matchId}:activeScene    STRING
match:{matchId}:activeCamera   STRING
bracket:{tournamentId}         JSON blob
sponsors:rotation              LIST of sponsor asset IDs

Channels: score:update, timer:tick, scene:change, bracket:update, sponsor:rotate, match:status
```

### REST endpoints

```
POST /api/match/:id/score        { teamAScore, teamBScore }
POST /api/match/:id/scene        { scene, activeCamera }
POST /api/match/:id/timer        { action: "start"|"pause"|"reset", seconds }
POST /api/match/:id/status       { status: "upcoming"|"live"|"halftime"|"paused"|"completed" }
POST /api/bracket/:tournamentId  { bracketJson }
GET  /api/health                 -> { ok: true, redis: boolean, supabase: boolean }
```

All mutating routes require a bearer token (a shared secret is fine, checked in `middleware/auth.js`). The health check is unauthenticated.

### For every mutating route, the handler must, in this exact order:

1. Validate input (reject malformed/missing fields with 400 before touching anything else).
2. Write the relevant Redis key(s) via `redis.js`.
3. Publish to the relevant channel via `redis.js` — this triggers `ws/broadcaster.js` to fan out to connected overlay clients.
4. Respond to the REST caller immediately (don't wait on step 5).
5. **After** responding, call `supabaseSync.syncMatchStateToSupabase(matchId, state)` fire-and-forget. Wrap in try/catch, log failures, never throw past this point.

### `supabaseSync.js` — the mirror function

- Use the Supabase JS client with a **service role key** (backend-only environment variable, never exposed to any frontend or committed to the repo — load from `.env`, add `.env` to `.gitignore` if not already there).
- `upsert` into `esports_tournament_matches` (by match id) for score/status/scene changes, and `esports_tournament_maps` (by map id, keyed to `match_id`) for map-level score changes. Match the existing column names already used by the website's `tournamentService.ts` (`match_status`, `team_a_score`, `team_b_score`, `map_status`, etc. — check that file in the website repo for exact field names before writing this, don't guess).
- Use `upsert` specifically (not `insert`) so repeated rapid calls during a live match don't create duplicate rows — this will fire on every single score change.
- This function should be idempotent and safe to call frequently (multiple times per second during an active round).

### `ws/broadcaster.js`

- On new WebSocket client connection: immediately send a full current-state snapshot (read from Redis) before any incremental updates, so a browser source that just loaded gets correct data instantly rather than waiting for the next change event.
- Subscribe to all Redis channels listed above; on any published message, forward it as a JSON WebSocket message to all connected clients with the shape:
  ```json
  { "channel": "score:update", "matchId": "m_0231", "timestamp": 1752400000, "data": { ... } }
  ```
- Handle client disconnect/reconnect cleanly — no memory leaks from stale client references.
- No authentication required for WebSocket connections (overlays are read-only consumers on a local/trusted network alongside OBS).

### `obs/obsClient.js`

- Use `obs-websocket-js` (v5 protocol). Connect to the local OBS instance's WebSocket server.
- Subscribe internally to the `scene:change` Redis channel (via `redis.js`) and trigger the corresponding OBS scene switch when it fires.
- Handle OBS being unreachable or restarting mid-show gracefully: retry connection with backoff, log clearly when disconnected, and never let an OBS connection failure affect the REST API or WebSocket fan-out to overlays — those must keep working independently of whether OBS automation is currently connected.

### Non-negotiables (re-stated, do not skip)

- Redis write + WebSocket publish must never be delayed, blocked, or made conditional on the Supabase write succeeding.
- No polling anywhere in this backend — Redis pub/sub only for internal fan-out.
- `.env` must never be committed; provide `.env.example` with placeholder values (`REDIS_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OBS_WEBSOCKET_URL`, `OBS_WEBSOCKET_PASSWORD`, `ADMIN_BEARER_TOKEN`).
- `/api/health` must accurately reflect real Redis and Supabase connectivity, not just "server is running" — this is what you'll actually check during month-3 load testing and month-4 dry runs to confirm both paths are alive before going live.
- Log every mutation (matchId, action, timestamp) to stdout at minimum — you will want this log during a live event if something desyncs and you need to reconstruct what happened.

## PROMPT END
