# Broadcast Architecture

Covers live match broadcasting for Gaming events (`src/pages/MatchCentre.tsx`).
See ADR 0005 for the decision record — this doc is the durable reference;
ADR 0005 is the snapshot of why.

## Signal flow (target — not all of this is live yet, see Status)

```
OBS (broadcaster's machine)
   │  WebSocket (obs-websocket plugin)
   ▼
IOBSAdapter  ──────────────►  scene control, start/stop recording
   │
   │  stream output (SRT)
   ▼
ISRTAdapter  ──────────────►  low-latency ingest transport
   │
   ▼
IMediaMTXAdapter  ──────────►  media server: receives the stream,
   │                           re-packages for delivery
   │
   ├─── IWhepAdapter ────────► browser playback (WebRTC/WHEP, low latency)
   │
   └─── IFFmpegAdapter ──────► transcode/record to storage

IRunPodAdapter  ─────────────► provisions the compute (GPU/CPU pod) that
                                the above pipeline actually runs on

IWebSocketAdapter  ───────────► separate from OBS's WebSocket — this is
                                 Repdox's own pub/sub channel for pushing
                                 live match state (scores, round changes,
                                 winner declarations) to connected browser
                                 clients viewing MatchCentre.tsx
```

Every box above is an interface under
`src/infrastructure/broadcast/interfaces/`, resolved through
`src/infrastructure/di.ts` (`resolveAdapter<T>(key)`), registered by
`registerDefaultInfrastructureAdapters()`
(`src/infrastructure/broadcast/registerAdapters.ts`). Application code
(`MatchCentre.tsx`, and any future broadcast control page) depends only on
the interfaces, never on which implementation is registered.

## Status — what's real vs. stubbed

**Everything is currently a stub** (`src/infrastructure/broadcast/impl/*Stub.ts`)
except one piece of internal logic:

| Component | Real? |
|---|---|
| RunPod (compute provisioning) | ❌ Stub — fake pod IDs, no real deploy |
| SRT (ingest transport) | ❌ Stub — fake session IDs |
| MediaMTX (media server) | ❌ Stub — fake stream IDs, always reports inactive |
| OBS (broadcaster control) | ❌ Stub — all calls resolve instantly, no real WS connection |
| WHEP (browser playback) | ❌ Stub — fake publisher IDs, no real SDP negotiation |
| FFmpeg (transcode) | ⚠️ Partial — `buildTranscodeArgs()` produces real, usable ffmpeg argument arrays; `runCommand()` never actually spawns a process |
| Repdox WebSocket (live state push) | ✅ Real in-process pub/sub (topic → handler map, working `subscribe`/`broadcast`/`unsubscribe`) — but not a real WebSocket server, so it only works within a single process, not across separate client connections |

None of this powers a real live broadcast today. It's built so that
`MatchCentre.tsx` and match-state UI can be developed and tested now,
against a stable interface, with real implementations swapped in later
without changing calling code.

## Testing

`src/tests/broadcast/broadcast-adapters.test.ts` (23 tests, Phase 10)
covers:
- The adapter registry itself (`src/infrastructure/di.ts`): register,
  resolve, duplicate-key rejection, `replaceAdapter`.
- `registerDefaultInfrastructureAdapters()` registers all 7 adapters under
  their documented keys.
- Each stub's actual contract/behavior (including the WebSocket stub's
  real pub/sub logic).

`src/tests/broadcast/broadcast-test-utils.ts` provides `vi.fn()`-based
mock factories for all 7 adapters (`createMockRunPodAdapter()`, etc., plus
`createMockBroadcastAdapters()` for all of them at once) — use these in any
future test for code that *consumes* a broadcast adapter, rather than
depending on the stub implementations' specific fake return values.

## Implementing a real adapter

When it's time to replace a stub with a real implementation:

1. Implement the same interface (e.g. `IMediaMTXAdapter`) in a new file
   under `src/infrastructure/broadcast/impl/` (e.g. `MediaMTXAdapter.ts`,
   no `Stub` suffix).
2. Swap the registration in `registerAdapters.ts` — `registerAdapter` (or
   `replaceAdapter`, if the stub is already registered) with the real
   class instead of the stub.
3. Everything upstream (`MatchCentre.tsx`, etc.) needs zero changes — that's
   the point of the interface boundary.
4. Add real-adapter tests alongside the existing stub-contract tests
   (probably a separate file, e.g. `mediamtx-adapter.integration.test.ts`,
   likely requiring the real service to be reachable — consider gating
   behind an env var the way `src/tests/e2e/gaming-registration-form.spec.ts`
   gates on `E2E_GAMING_EVENT_SLUG`).
5. Update the status table above.

## Related

- ADR 0005 — decision record for the adapter pattern.
- `TECHNICAL_DEBT_PHASE10.md` — no `clearAdapters()` on the infra registry
  yet, and `registerDefaultInfrastructureAdapters()` has no
  duplicate-registration guard (inconsistent with `core`'s
  `registerDefaults()`, which does).
