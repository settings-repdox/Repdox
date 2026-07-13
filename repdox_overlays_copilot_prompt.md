# Copilot Build Prompt — Broadcast Overlay Pages

Paste this into Copilot, pointed at the existing `/backend` directory. This builds the actual browser-source pages that get pointed at from OBS — the piece that's been missing so far. Everything described here connects to the backend that already exists (WebSocket server, Redis schema, REST API).

---

## PROMPT START

You are building the actual overlay pages that OBS will load as Browser Sources during live Repdox Valorant broadcasts. The backend (Express + `ws` + Redis) already exists and is working — you are building the client-side pages that connect to it, not the backend itself.

### How these get served and accessed

- Add a static file server to the existing Express app (`server.js`) serving a new `/overlays` directory — e.g. `app.use("/overlays", express.static(path.join(__dirname, "overlays")))`.
- Each overlay reads `matchId` from its own URL query string (`?matchId=m_0231`), so the final OBS Browser Source URL looks like: `http://localhost:4000/overlays/scoreboard.html?matchId=m_0231`. Keep this URL pattern identical across all overlays — just the filename changes.
- Each overlay opens its own WebSocket connection to `ws://localhost:4000/ws?matchId={matchId}` (reuse the query param, don't hardcode), reads the existing message shape `{ channel, matchId, timestamp, data }`, and only reacts to the channels relevant to it.

### Components to build (`/backend/overlays/`)

1. **`scoreboard.html`** — team names, round score, map score, series score. Subscribes to `score:update`, `match:status`.
2. **`timer.html`** — round/countdown timer. Subscribes to `timer:tick`.
3. **`lower-thirds.html`** — player/caster name + role, animated in/out on trigger. Subscribes to `scene:change` (trigger on relevant scene entries) or a dedicated payload field you add for "who's currently featured."
4. **`bracket.html`** — tournament bracket view. Subscribes to `bracket:update`.
5. **`sponsor.html`** — rotating sponsor logos on interval. Subscribes to `sponsor:rotate`.

Each is a single self-contained HTML file (inline `<style>` and `<script>`, no build step — these need to load directly as static files in an OBS Browser Source with zero compilation). Use plain JS, no framework — keep OBS's Chromium Embedded Framework happy with simple, fast-loading code.

### Non-negotiable technical requirements

- **Transparent background always**: `html, body { background: transparent; margin: 0; }`. Verify this explicitly — a non-transparent background renders as a solid box on stream, this is the single most common broadcast-graphics bug.
- **Never render `undefined`, `NaN`, or blank where a name/score belongs.** Every data field needs a sensible placeholder/fallback state for before the first message arrives or if a field is missing.
- **Reconnect on disconnect.** If the WebSocket drops (backend restart, network blip), retry with backoff and resync from the snapshot the server sends on reconnect — don't just freeze on stale data.
- **No console errors.** OBS Browser Sources fail silently; a JS error can mean a graphic just never appears with no visible cause during a live show. Wrap data handling defensively.
- **Survive a full page reload** (OBS reloading the source) without any manual re-trigger — always resync from the connection snapshot, never assume push-only updates are sufficient.

### Visual direction — read this before writing any HTML/CSS

**Do not produce anything that looks AI-generated or template-y.** Concretely avoid: rounded rectangle cards with soft drop shadows, generic dark-mode-with-one-neon-accent palettes, Inter/system-font-only text with no real hierarchy, gradient text, decorative blur/glass panels, centered-everything layouts with generous whitespace that reads like a SaaS landing page rather than a broadcast graphic.

Instead, build to this concrete design system — define it once as CSS custom properties at the top of a shared stylesheet (or repeated consistently at the top of each file if truly kept single-file), and use it identically across every overlay so they read as one coherent broadcast package, not five separately-styled pages:

```css
:root {
  --bg-panel: #0e1015;       /* near-black, slight cool temperature, not pure black */
  --team-a: #ff4655;          /* placeholder — swap to real team colors per match if available */
  --team-b: #4a9eff;
  --text-primary: #f2f2f0;
  --text-secondary: #9a9ea6;
  --accent-live: #ffd23f;     /* used ONLY for live/active state indicators, never decoration */
  --panel-cut: 12px;          /* the angled-corner cut size, used consistently everywhere */
}
```

- **Sharp, angular geometry, not rounded cards.** Team panels and score containers should use a clipped/cut-corner shape (via `clip-path: polygon(...)`) rather than `border-radius`. This single visual device — the angled cut — should appear consistently across every overlay so they're recognizable as one system.
- **A condensed, technical display typeface** for scores/team names/numbers — load something like Rajdhani, Barlow Condensed, or Titillium Web from Google Fonts (or bundle locally if you want zero external network dependency on show day — safer for a live broadcast, consider self-hosting the font file rather than relying on a live Google Fonts CDN call during the event).
- **Motion with intent, not ambient decoration.** Score changes should feel like a snap/tick (short, sharp, 150–250ms), not a slow fade. Lower thirds slide/wipe in with mechanical timing, not bounce/elastic easing.
- **High information density via strict grid alignment**, not by shrinking text — round number, map score, series score should all read at a glance via consistent, deliberate type sizing across all overlays (same scale used for "team name" everywhere, same scale for "score number" everywhere, etc.) rather than each overlay inventing its own hierarchy.
- **Reference point**: look at how VCT/VALORANT Champions Tour or ESL/BLAST CS overlays actually construct their scoreboard graphics — hard-edged team panels, tight kerning on condensed numerals, sparing use of a single saturated accent reserved for state changes (live indicator, active highlight) rather than used decoratively throughout.

### Build order

1. `scoreboard.html` first (most screen time, sets the visual system for everything else)
2. `timer.html` (reuses the same type scale/colors)
3. `lower-thirds.html`
4. `sponsor.html`
5. `bracket.html` (most complex layout, save for last)
6. Static file serving wired into `server.js`
7. Manual end-to-end test: open each overlay directly in a regular browser tab first (not OBS) with a test `matchId`, fire a test mutation via curl against the backend's REST API, confirm the overlay updates live — only add to OBS as a Browser Source once this works in a plain browser tab.

## PROMPT END
