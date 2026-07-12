## PROMPT START

You are building the control plane and broadcast overlays for **Repdox**, a student-run esports tournament platform running live Valorant broadcasts. This is NOT a hobby project or a demo — it is production software that will run live, on-air, in front of an audience, so treat reliability and clarity of code as seriously as visual polish.

### System context (do not skip)

- A cloud GPU node (RunPod) handles all video ingest/routing/sync via MediaMTX and outputs Program/Active Camera/Preview feeds directly into OBS Studio running on a MacBook. **You are not building anything video-related.** Your job is the control plane: the backend that holds live match state, and the browser-source overlays OBS renders on top of the video.
- The backend and overlays run locally on the production MacBook alongside OBS. Keep resource usage low — OBS needs headroom for encoding.
- Everything communicates through one backend so that the website, the OBS overlays, and the admin dashboard all update from a single source of truth. An admin updates a score → API → Redis → WebSocket → overlay updates automatically → website updates automatically.

### Components to build

1. **Node.js backend** (`/backend`)
   - Express (or Fastify) REST API + WebSocket server (use `ws`, not Socket.IO — keep the wire protocol plain JSON, no framework magic)
   - Redis for state storage and pub/sub (use `ioredis`)
   - Endpoints: match score, timer control, scene/active-camera state, bracket updates, sponsor rotation
   - On any state mutation: write to Redis, publish to the relevant channel, WebSocket layer fans out to subscribed clients
   - OBS WebSocket client module (use `obs-websocket-js` v5 protocol) that can trigger scene changes when `scene:change` is published
   - Structure: `server.js`, `redis.js`, `routes/`, `ws/broadcaster.js`, `obs/obsClient.js`
   - Add basic auth (a shared bearer token is fine — this is not public-facing) on all admin-mutating REST routes. Overlay WebSocket connections are read-only and don't need auth.
   - Add reconnect logic on both the WebSocket server (handle client drop/reconnect gracefully, resend current state snapshot on connect) and the OBS WebSocket client (OBS might restart mid-show).

2. **Browser source overlays** (`/overlays`) — separate small apps/pages, one per component, each meant to be added as an individual OBS Browser Source:
   - **Scoreboard** (team names, logos, round score, map score, series score)
   - **Bracket** (tournament bracket view, updates on match completion)
   - **Lower thirds** (player/caster name + role, animated in/out)
   - **Timer** (round timer / countdown)
   - **Sponsor rotation** (rotating sponsor logos on interval, pulled from backend list)
   - Each overlay: plain HTML/CSS/JS (or a lightweight framework if you prefer, but no build-step-heavy framework that complicates OBS's browser source loading — keep it simple to load a static bundle), connects to the backend WebSocket, subscribes only to the channels it needs, renders on `transparent` background (this is critical — OBS composites over video, any non-transparent background will show as a solid box on stream)
   - Reduced-motion-safe animations: enter/exit transitions should be smooth but must never block or delay showing correct data — never animate for animation's sake

3. **Admin dashboard** (`/admin`) — the interface a producer/admin uses live, during the broadcast, likely while stressed and needing to act fast:
   - Score +/- controls, timer start/pause/reset, scene/active-camera switch buttons, bracket editor, sponsor list management
   - This is the most important UI to get right for usability under pressure: large touch targets, unambiguous button states (a button that's currently "live" must look obviously different from one that isn't), no confirmation dialogs on frequent actions (score +/-) but DO require confirmation on destructive/rare actions (ending a match, resetting bracket)
   - Show current live state prominently at all times so the admin never has to guess "did that update actually go through" — reflect the WebSocket-confirmed state, not just what they clicked

### Visual direction — this is the part to get right

**Do not produce anything that looks AI-generated or "vibe-coded."** Concretely, that means avoid: cream/off-white backgrounds with a warm terracotta accent color, near-black backgrounds with a single generic neon-green or violet accent and nothing else considered, generic SaaS-dashboard card grids with soft shadows and rounded-everything, Inter/system-font-only typography with no real type hierarchy, numbered "01 / 02 / 03" decorative markers that don't mean anything, gradient text, glassmorphism blur panels used decoratively rather than functionally.

Instead: look at how actual professional FPS esports broadcasts design their on-stream graphics and admin tooling — VALORANT Champions Tour, ESL/BLAST CS broadcasts, Riot's own in-house tools. The visual language of that world is specific and worth actually using as material, not just "esports-flavored":
- **Sharp, angular geometry** — cut corners, diagonal dividers, chevrons, not rounded cards. Team panels in VCT-style scoreboards use hard-edged parallelogram shapes, not rectangles with border-radius.
- **High information density done cleanly** — round number, kill/econ indicators, map score, series score all visible at once without feeling cluttered, via strict grid alignment and a real type scale (not "make the important number bigger," but a deliberate hierarchy: team names, score, round indicator, timer all sit at distinct, consistent weights/sizes across every overlay so they read as one system).
- **A tight, saturated accent color tied to team colors where relevant, and a disciplined neutral base** — broadcast graphics use a dark neutral (not pure black — a deep charcoal or near-black with slight color temperature) with one or two saturated accents used only for state (live indicator, active team highlight, alert states), not decoration everywhere.
- **A condensed, technical display typeface for scores/names** (something like a condensed grotesk — e.g. in the style of Titillium, Rajdhani, Barlow Condensed, or similar — pick one and use it deliberately) paired with a clean, highly legible body/UI face for the admin dashboard where information density and speed-of-reading under pressure matters more than character.
- **Motion with intent, not ambient decoration**: a scoreboard update should feel like a snap/tick, not a slow fade. Lower thirds should slide/wipe in with the kind of snappy, mechanical timing broadcast graphics use — short duration (150-250ms), sharp easing, not bouncy or elastic.

Before writing any UI code: define an actual small design system first — a short token set (background, surface, 2 accent colors tied to team-color slots, text hierarchy colors), the two typefaces you're using and why, and the one signature visual device this system will be recognized by (e.g., a consistent angled-cut panel shape used across every overlay and the dashboard). State this plan explicitly in a comment block or README before building the components, and build every component from that plan consistently rather than styling each one ad hoc.

### Build order (use this to resume across sessions)

1. Backend skeleton — Express/WS server boots, Redis connects, health check endpoint responds
2. Redis schema + pub/sub channels wired (see below)
3. REST endpoints for score/timer/scene/bracket/sponsor, tested with curl/Postman before any UI exists
4. WebSocket fan-out from Redis pub/sub to connected clients, with reconnect + state-resync on connect
5. Design system definition (tokens, type, signature element) — write this down before step 6
6. Scoreboard overlay (highest priority — this is the one that will be on screen most)
7. Timer overlay
8. Lower thirds overlay
9. Sponsor rotation overlay
10. Bracket overlay
11. Admin dashboard
12. OBS WebSocket integration for scene triggers
13. End-to-end test: run backend + all overlays as actual OBS Browser Sources, drive state from the admin dashboard, confirm every overlay updates within one WebSocket round-trip with no visible lag or flash-of-wrong-state

### Redis schema and channels to implement exactly

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

### Non-negotiables

- Overlay backgrounds must be transparent — verify this explicitly, it's the single most common broadcast-graphics bug.
- Every piece of on-screen text must have a defined fallback for missing/late data (never render `undefined`, `NaN`, or an empty string where a name/score should be — show a sensible placeholder state instead).
- No console errors in the browser sources — OBS browser sources fail silently and a JS error can mean a graphic just never appears with no obvious cause during a live show.
- Everything must survive a browser source refresh (OBS reloading the page) without losing sync — always re-fetch current state on connect rather than assuming push-only updates are sufficient.

## PROMPT END
