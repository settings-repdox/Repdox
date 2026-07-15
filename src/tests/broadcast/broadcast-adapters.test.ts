// Phase 10: Broadcast infrastructure tests.
import { describe, it, expect, beforeEach } from "vitest";
import {
  registerAdapter,
  resolveAdapter,
  replaceAdapter,
} from "@/infrastructure/di";
import { registerDefaultInfrastructureAdapters } from "@/infrastructure/broadcast/registerAdapters";
import { RunPodAdapterStub } from "@/infrastructure/broadcast/impl/RunPodAdapterStub";
import { MediaMTXAdapterStub } from "@/infrastructure/broadcast/impl/MediaMTXAdapterStub";
import { OBSAdapterStub } from "@/infrastructure/broadcast/impl/OBSAdapterStub";
import { WebSocketAdapterStub } from "@/infrastructure/broadcast/impl/WebSocketAdapterStub";
import { SRTAdapterStub } from "@/infrastructure/broadcast/impl/SRTAdapterStub";
import { WhepAdapterStub } from "@/infrastructure/broadcast/impl/WhepAdapterStub";
import { FFmpegAdapterStub } from "@/infrastructure/broadcast/impl/FFmpegAdapterStub";
import type { IRunPodAdapter } from "@/infrastructure/broadcast/interfaces/IRunPodAdapter";
import {
  createMockRunPodAdapter,
  createMockMediaMTXAdapter,
  createMockOBSAdapter,
  createMockSRTAdapter,
  createMockWhepAdapter,
  createMockFFmpegAdapter,
  createMockWebSocketAdapter,
  createMockBroadcastAdapters,
} from "./broadcast-test-utils";

// The infra registry (src/infrastructure/di.ts) is module-level singleton state,
// same shape as the core DI container. There's no clearAdapters() export yet
// (tracked in the tech debt report), so each test uses a unique key namespace
// to avoid "Adapter already registered" collisions between tests.
let keySuffix = 0;
function uniqueKey(base: string) {
  keySuffix += 1;
  return `${base}__test_${keySuffix}`;
}

describe("Broadcast: adapter registry (src/infrastructure/di.ts)", () => {
  it("registers and resolves an adapter", () => {
    const key = uniqueKey("RunPodAdapter");
    const adapter = createMockRunPodAdapter();
    registerAdapter(key, adapter);
    expect(resolveAdapter<IRunPodAdapter>(key)).toBe(adapter);
  });

  it("throws when resolving an adapter that was never registered", () => {
    expect(() => resolveAdapter(uniqueKey("Unregistered"))).toThrow(
      /Adapter not registered/,
    );
  });

  it("throws when registering the same key twice", () => {
    const key = uniqueKey("DuplicateAdapter");
    registerAdapter(key, createMockRunPodAdapter());
    expect(() => registerAdapter(key, createMockRunPodAdapter())).toThrow(
      /Adapter already registered/,
    );
  });

  it("replaceAdapter overwrites an existing registration without throwing", () => {
    const key = uniqueKey("ReplaceableAdapter");
    const first = createMockRunPodAdapter();
    const second = createMockRunPodAdapter();
    registerAdapter(key, first);
    replaceAdapter(key, second);
    expect(resolveAdapter(key)).toBe(second);
  });

  it("replaceAdapter can register a key that was never registered before", () => {
    const key = uniqueKey("FreshViaReplace");
    const adapter = createMockRunPodAdapter();
    expect(() => replaceAdapter(key, adapter)).not.toThrow();
    expect(resolveAdapter(key)).toBe(adapter);
  });
});

describe("Broadcast: registerDefaultInfrastructureAdapters()", () => {
  // registerAdapter() throws on duplicate keys, and registerDefaults uses the
  // fixed keys ("RunPodAdapter", "MediaMTXAdapter", ...) with no try/catch guard
  // (unlike core registerDefaults(), which swallows duplicate-registration
  // errors — see TECHNICAL_DEBT_PHASE10.md). So this only runs once per process;
  // calling it again in another test file will throw. We assert the one call
  // succeeds and every expected key resolves.
  it("registers every documented broadcast adapter under its expected key", () => {
    expect(() => registerDefaultInfrastructureAdapters()).not.toThrow();

    expect(resolveAdapter("RunPodAdapter")).toBeInstanceOf(RunPodAdapterStub);
    expect(resolveAdapter("MediaMTXAdapter")).toBeInstanceOf(MediaMTXAdapterStub);
    expect(resolveAdapter("OBSAdapter")).toBeInstanceOf(OBSAdapterStub);
    expect(resolveAdapter("WebSocketAdapter")).toBeInstanceOf(WebSocketAdapterStub);
    expect(resolveAdapter("SRTAdapter")).toBeInstanceOf(SRTAdapterStub);
    expect(resolveAdapter("WhepAdapter")).toBeInstanceOf(WhepAdapterStub);
    expect(resolveAdapter("FFmpegAdapter")).toBeInstanceOf(FFmpegAdapterStub);
  });
});

describe("Broadcast: RunPodAdapterStub contract", () => {
  const adapter = new RunPodAdapterStub();

  it("deployPod resolves with a generated podId", async () => {
    const result = await adapter.deployPod("some/image:latest");
    expect(result.podId).toMatch(/^pod_/);
  });

  it("getPodStatus echoes back the requested podId", async () => {
    const result = await adapter.getPodStatus("pod_abc");
    expect(result).toEqual({ podId: "pod_abc", status: "unknown" });
  });

  it("deletePod resolves without throwing", async () => {
    await expect(adapter.deletePod("pod_abc")).resolves.toBeUndefined();
  });
});

describe("Broadcast: MediaMTXAdapterStub contract", () => {
  const adapter = new MediaMTXAdapterStub();

  it("createStream namespaces the streamId to the channel", async () => {
    const result = await adapter.createStream("channel-42");
    expect(result.streamId).toBe("mtx_channel-42");
  });

  it("getStreamInfo reports inactive by default", async () => {
    const result = await adapter.getStreamInfo("mtx_channel-42");
    expect(result).toEqual({ streamId: "mtx_channel-42", active: false });
  });
});

describe("Broadcast: SRTAdapterStub contract", () => {
  const adapter = new SRTAdapterStub();

  it("startSRTSession resolves with a generated sessionId", async () => {
    const result = await adapter.startSRTSession({
      source: "srt://source",
      dest: "srt://dest",
    });
    expect(result.sessionId).toMatch(/^srt_/);
  });
});

describe("Broadcast: WhepAdapterStub contract", () => {
  const adapter = new WhepAdapterStub();

  it("createPublisher resolves with a generated publisherId", async () => {
    const result = await adapter.createPublisher("mock-offer-sdp");
    expect(result.publisherId).toMatch(/^pub_/);
  });
});

describe("Broadcast: FFmpegAdapterStub contract", () => {
  const adapter = new FFmpegAdapterStub();

  it("buildTranscodeArgs produces a valid ffmpeg argument list", () => {
    const args = adapter.buildTranscodeArgs("in.mp4", "out.mp4");
    expect(args).toEqual(["-i", "in.mp4", "-c:v", "libx264", "out.mp4"]);
  });

  it("runCommand resolves with a successful exit code", async () => {
    const result = await adapter.runCommand(["-version"]);
    expect(result.exitCode).toBe(0);
  });
});

describe("Broadcast: WebSocketAdapterStub contract (real pub/sub behavior)", () => {
  let adapter: WebSocketAdapterStub;

  beforeEach(() => {
    adapter = new WebSocketAdapterStub();
  });

  it("delivers a broadcast payload to the subscribed handler", async () => {
    const received: unknown[] = [];
    adapter.subscribe("match:1:score", (payload) => received.push(payload));

    await adapter.broadcast("match:1:score", { home: 1, away: 0 });

    expect(received).toEqual([{ home: 1, away: 0 }]);
  });

  it("does not throw when broadcasting to a topic with no subscribers", async () => {
    await expect(
      adapter.broadcast("match:unknown:score", { home: 0, away: 0 }),
    ).resolves.toBeUndefined();
  });

  it("stops delivering payloads after unsubscribe", async () => {
    const received: unknown[] = [];
    adapter.subscribe("match:2:score", (payload) => received.push(payload));
    adapter.unsubscribe("match:2:score");

    await adapter.broadcast("match:2:score", { home: 3, away: 3 });

    expect(received).toEqual([]);
  });

  it("a later subscribe() on the same topic replaces the earlier handler", async () => {
    const firstCalls: unknown[] = [];
    const secondCalls: unknown[] = [];
    adapter.subscribe("match:3:score", (p) => firstCalls.push(p));
    adapter.subscribe("match:3:score", (p) => secondCalls.push(p));

    await adapter.broadcast("match:3:score", { home: 2, away: 1 });

    expect(firstCalls).toEqual([]);
    expect(secondCalls).toEqual([{ home: 2, away: 1 }]);
  });
});

describe("Broadcast: createMockBroadcastAdapters()", () => {
  it("produces a mock keyed the same way the real registry keys adapters", () => {
    const mocks = createMockBroadcastAdapters();
    expect(Object.keys(mocks).sort()).toEqual(
      [
        "RunPodAdapter",
        "MediaMTXAdapter",
        "OBSAdapter",
        "WebSocketAdapter",
        "SRTAdapter",
        "WhepAdapter",
        "FFmpegAdapter",
      ].sort(),
    );
  });

  it("every mock adapter method is independently spy-able", async () => {
    const mocks = createMockBroadcastAdapters();
    await mocks.RunPodAdapter.deployPod("img");
    expect(mocks.RunPodAdapter.deployPod).toHaveBeenCalledWith("img");
    expect(mocks.MediaMTXAdapter.createStream).not.toHaveBeenCalled();
  });
});

// Sanity check that the individual factory functions exported from
// broadcast-test-utils.ts all produce usable mocks (not just the bundled one).
describe("Broadcast: individual mock factories", () => {
  it("createMockOBSAdapter resolves lifecycle methods without a real OBS connection", async () => {
    const obs = createMockOBSAdapter();
    await expect(obs.connect("ws://localhost:4455")).resolves.toBeUndefined();
    await expect(obs.setScene("Main Camera")).resolves.toBeUndefined();
  });

  it("createMockWebSocketAdapter supports the same subscribe/broadcast contract as the real stub", async () => {
    const ws = createMockWebSocketAdapter();
    const received: unknown[] = [];
    ws.subscribe("topic", (p) => received.push(p));
    await ws.broadcast("topic", "hello");
    expect(received).toEqual(["hello"]);
  });
});
