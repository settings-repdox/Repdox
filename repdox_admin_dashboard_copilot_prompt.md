# Copilot Build Prompt — Broadcast Admin Dashboard

Paste this into Copilot, pointed at the existing `/backend` directory. This builds the last missing piece: the interface a producer actually clicks during a live show to drive score, timer, scene, and bracket updates. The backend (REST API, Redis, WebSocket fan-out, Supabase mirror) and the overlay pages both already exist and work — this dashboard is a client of that same REST API, nothing more.

---

## PROMPT START

You are building the live admin dashboard for Repdox broadcast control. This is used by a producer **during a live match, under time pressure**, to trigger score/timer/scene/bracket updates. Every action here calls the existing backend REST API (`/api/match/:id/score`, `/api/match/:id/scene`, `/api/match/:id/timer`, `/api/match/:id/status`, `/api/bracket/:tournamentId`) with the `Authorization: Bearer` token already implemented in `middleware/auth.js`.

### Where this lives and how it's served

- Serve as static files from `/admin`, the same way overlays are served from `/overlays` (the static route for `/admin` already exists in `server.js` — confirm it points at a real `admin/` directory and build the actual page there; it currently has no content).
- Single page, plain HTML/CSS/JS or a lightweight setup — no build step, same reasoning as the overlays: simple, fast-loading, no compilation required to open in a browser.
- The admin enters the bearer token once (a simple password-style input, stored in `sessionStorage` for the duration of the tab session only, never in a cookie or persisted longer-term) and it's attached to every subsequent API call from that point on.
- Reads `matchId` from its own URL query string (`?matchId=m_0231`), same pattern as the overlays, so there's one consistent way this whole system addresses "which match" across every component.

### Core UI requirements — this is the most important part to get right

This is not a general admin panel — it is a **live-operations tool used under pressure**, and the usability requirements are not optional polish:

1. **Current live state must be shown prominently and must reflect confirmed server state, not just what was clicked.** Read the current state from the WebSocket connection (same `/ws?matchId=` endpoint the overlays use) so the dashboard shows the same live values the overlays and website are showing — never let the admin wonder "did that actually go through." If a button is clicked and the WebSocket confirmation of that change hasn't arrived within ~1.5 seconds, show a distinct pending/unconfirmed state rather than silently assuming success.

2. **Score and round controls: +/- buttons, no confirmation dialogs.** These are used constantly during a match and must be instant — no "are you sure" modal on frequent actions.

3. **Rare/destructive actions: end match, reset bracket, overwrite series score — these DO require confirmation.** A distinct, deliberate confirmation step (not a native browser `confirm()` — build a real in-page confirmation state) before these fire.

4. **Large, unambiguous touch targets.** This may be operated on a laptop trackpad or touchscreen by someone glancing between this and a live feed — buttons need generous hit areas and can't rely on hover states to convey information.

5. **A button's "currently active" state must be visually obvious and distinct from "not active,"** particularly for scene/camera switching — e.g. whichever scene is currently live should look unmistakably different (not just a subtle color shift) from the other options, since this is the one control most likely to be used quickly and under stress mid-broadcast.

6. **Connection status indicator** for both the WebSocket (live state feed) and confirmation the bearer token is valid (a failed auth attempt should show a clear, specific error — not a silent failure or generic network error).

### Components to build

- **Score panel**: team A/B score +/-, round number display, series score +/- (separate, clearly visually distinct from round score so these are never confused with each other — this distinction matters, since the backend already treats these as separate fields specifically to avoid this exact confusion).
- **Timer panel**: start / pause / reset, manual seconds input for corrections.
- **Scene/camera panel**: buttons for each scene, current active one visually unmistakable.
- **Match status panel**: upcoming / live / halftime / paused / completed — changing to "completed" requires confirmation per the destructive-action rule above.
- **Bracket panel**: a simpler editing view for bracket JSON updates — doesn't need to be fancy, but should validate JSON before submitting rather than sending malformed data to the API.
- **Sponsor rotation list**: add/remove/reorder sponsor asset IDs.

### Visual direction — same system as the overlays, do not invent a new one

Reuse the exact design tokens, angled-cut panel geometry (`clip-path`), and self-hosted Rajdhani font already established in the overlay pages (`/overlays/*.html` — read these files first for the CSS custom properties and font-face declarations, copy them exactly rather than approximating). This dashboard should look like it belongs to the same product as the overlays and the broadcast itself — not a generic admin-panel aesthetic bolted on separately. The one deliberate difference: this is a **working tool, not a broadcast graphic**, so information density and clickable affordance take priority over cinematic presentation — but the underlying visual language (color tokens, angled cuts, condensed type for numbers) should stay consistent.

### Non-negotiables

- No native browser `confirm()`/`alert()` dialogs anywhere — build real in-page UI states for confirmations and errors, consistent with the rest of the visual system.
- Bearer token never logged to console, never included in URLs, only ever sent as an `Authorization` header.
- Every API call handles failure explicitly — a failed request must show a clear error state on the specific control that failed, not a generic toast that doesn't say what didn't work.
- Test end-to-end before considering this done: open the dashboard and an overlay side by side in two browser tabs, drive changes from the dashboard, confirm the overlay updates live and the dashboard's own state reflects the same confirmed values.

## PROMPT END
