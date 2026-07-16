# ADR 0005: Broadcast Infrastructure as Swappable Adapters

Date: 2026-07-15 (retroactive)

## Status

Accepted for the interface/registry pattern. Explicitly **not** a decision
to ship any of the current implementations to production — see Status of
each adapter below.

## Context

Live match broadcasting for Gaming events (`MatchCentre.tsx`) needs several
external capabilities: provisioning compute for stream processing (RunPod),
a media server to ingest/relay streams (MediaMTX), a way to script a local
broadcast application (OBS via its WebSocket plugin), reliable low-latency
transport (SRT), browser-based low-latency playback (WHEP), video
transcoding (FFmpeg), and pushing live state (scores, match events) to
connected clients (WebSocket). None of these existed yet when broadcast
support was scoped, and building against real implementations of all seven
simultaneously would have blocked all other broadcast-dependent work on
infrastructure procurement (RunPod account, a deployed MediaMTX instance,
etc.).

## Decision

Define one interface per capability under
`src/infrastructure/broadcast/interfaces/` (`IRunPodAdapter`,
`IMediaMTXAdapter`, `IOBSAdapter`, `ISRTAdapter`, `IWhepAdapter`,
`IFFmpegAdapter`, `IWebSocketAdapter`), and ship a stub implementation of
each under `src/infrastructure/broadcast/impl/*Stub.ts` that satisfies the
interface without touching any real external service. Register all seven
under fixed keys via `registerDefaultInfrastructureAdapters()`
(`src/infrastructure/broadcast/registerAdapters.ts`), resolved through
`src/infrastructure/di.ts` (ADR 0003) — the same key-based resolution
pattern as domain services, just a separate registry to keep infrastructure
isolated from domain code (enforced by
`verifyInfrastructureIsolation()`/`infrastructure-isolation.test.ts`).

This means: application code that needs to, say, start an SRT session calls
`resolveAdapter<ISRTAdapter>("SRTAdapter").startSRTSession(...)` and does
not know or care whether that resolves to a stub or a real adapter talking
to actual infrastructure.

## Status of each adapter (as of Phase 11)

| Adapter | Interface | Current impl | Production-ready? |
|---|---|---|---|
| RunPod | `IRunPodAdapter` | `RunPodAdapterStub` — returns a fake `podId`, no real deploy | No — stub only |
| MediaMTX | `IMediaMTXAdapter` | `MediaMTXAdapterStub` — fake stream IDs, `active: false` always | No — stub only |
| OBS | `IOBSAdapter` | `OBSAdapterStub` — all methods resolve immediately, no real WS connection | No — stub only |
| SRT | `ISRTAdapter` | `SRTAdapterStub` — fake session IDs, static status | No — stub only |
| WHEP | `IWhepAdapter` | `WhepAdapterStub` — fake publisher IDs, no real SDP negotiation | No — stub only |
| FFmpeg | `IFFmpegAdapter` | `FFmpegAdapterStub` — builds real argument arrays (`buildTranscodeArgs` has actual logic), but `runCommand` never spawns a process | Partial — arg-building logic is real, execution is not |
| WebSocket | `IWebSocketAdapter` | `WebSocketAdapterStub` — **this one has real logic**: an in-memory topic→handler map with working `subscribe`/`broadcast`/`unsubscribe` | Functional for same-process pub/sub; not a real WebSocket server, so it doesn't work across separate client connections/processes |

## Consequences

- `MatchCentre.tsx` and any future broadcast UI can be built and tested
  today against the stub registry without any of the seven external
  dependencies existing yet.
- Phase 10 added test coverage for every stub's contract plus the registry
  itself (`src/tests/broadcast/broadcast-adapters.test.ts`, 23 tests) and
  mock factories for use in higher-level tests
  (`src/tests/broadcast/broadcast-test-utils.ts`) — so consumers of these
  interfaces can be tested without depending on the stubs' specific
  (fake) behavior either.
- **Nothing about live broadcasting actually works yet.** Six of seven
  adapters are pure fakes; only the WebSocket stub's pub/sub is real, and
  only within a single process. Anyone reading `MatchCentre.tsx` or the
  interface list without checking the `impl/*Stub.ts` files could
  reasonably assume more is implemented than actually is — this table
  exists specifically to prevent that misreading. See
  `docs/architecture/broadcast/README.md` for the data-flow diagram and
  what a real implementation of each adapter would need to do.
- No ADR previously existed for this pattern despite it touching seven
  interfaces and being architecturally significant (it's the one place in
  the codebase using the adapter pattern for external infrastructure rather
  than the domain-service pattern for business logic) — this ADR closes
  that gap retroactively.
