// Phase 10: Broadcast infrastructure test utilities.
//
// The broadcast adapters (RunPod, MediaMTX, OBS, SRT, WHEP, FFmpeg, WebSocket)
// wrap external processes/services that can't run in a test environment. These
// factories produce vi.fn()-based mocks matching each adapter's real interface
// so domain/production code that depends on them can be tested without touching
// the real stubs (which are themselves no-ops meant for local/dev use) or any
// live infrastructure.

import { vi } from "vitest";
import type { IRunPodAdapter } from "@/infrastructure/broadcast/interfaces/IRunPodAdapter";
import type { IMediaMTXAdapter } from "@/infrastructure/broadcast/interfaces/IMediaMTXAdapter";
import type { IOBSAdapter } from "@/infrastructure/broadcast/interfaces/IOBSAdapter";
import type { ISRTAdapter } from "@/infrastructure/broadcast/interfaces/ISRTAdapter";
import type { IWhepAdapter } from "@/infrastructure/broadcast/interfaces/IWhepAdapter";
import type { IFFmpegAdapter } from "@/infrastructure/broadcast/interfaces/IFFmpegAdapter";
import type { IWebSocketAdapter } from "@/infrastructure/broadcast/interfaces/IWebSocketAdapter";

export function createMockRunPodAdapter(): IRunPodAdapter {
  return {
    deployPod: vi
      .fn()
      .mockResolvedValue({ podId: "pod_mock123", endpoint: "https://mock.runpod/endpoint" }),
    deletePod: vi.fn().mockResolvedValue(undefined),
    getPodStatus: vi
      .fn()
      .mockResolvedValue({ podId: "pod_mock123", status: "running" }),
  };
}

export function createMockMediaMTXAdapter(): IMediaMTXAdapter {
  return {
    createStream: vi
      .fn()
      .mockResolvedValue({ streamId: "mtx_mock123", ingestUrl: "rtmp://mock/live" }),
    removeStream: vi.fn().mockResolvedValue(undefined),
    getStreamInfo: vi
      .fn()
      .mockResolvedValue({ streamId: "mtx_mock123", active: true }),
  };
}

export function createMockOBSAdapter(): IOBSAdapter {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    startRecording: vi.fn().mockResolvedValue(undefined),
    stopRecording: vi.fn().mockResolvedValue(undefined),
    setScene: vi.fn().mockResolvedValue(undefined),
  };
}

export function createMockSRTAdapter(): ISRTAdapter {
  return {
    startSRTSession: vi.fn().mockResolvedValue({ sessionId: "srt_mock123" }),
    stopSRTSession: vi.fn().mockResolvedValue(undefined),
    getSRTStatus: vi
      .fn()
      .mockResolvedValue({ sessionId: "srt_mock123", status: "connected" }),
  };
}

export function createMockWhepAdapter(): IWhepAdapter {
  return {
    createPublisher: vi
      .fn()
      .mockResolvedValue({ publisherId: "pub_mock123", answer: "mock-sdp-answer" }),
    removePublisher: vi.fn().mockResolvedValue(undefined),
  };
}

export function createMockFFmpegAdapter(): IFFmpegAdapter {
  return {
    runCommand: vi
      .fn()
      .mockResolvedValue({ pid: 1234, exitCode: 0, stdout: "", stderr: "" }),
    buildTranscodeArgs: vi
      .fn()
      .mockImplementation((input: string, output: string) => [
        "-i",
        input,
        "-c:v",
        "libx264",
        output,
      ]),
  };
}

export function createMockWebSocketAdapter(): IWebSocketAdapter {
  const handlers = new Map<string, (payload: unknown) => void>();
  return {
    broadcast: vi.fn(async (topic: string, payload: unknown) => {
      handlers.get(topic)?.(payload);
    }),
    subscribe: vi.fn((topic: string, handler: (payload: unknown) => void) => {
      handlers.set(topic, handler);
    }),
    unsubscribe: vi.fn((topic: string) => {
      handlers.delete(topic);
    }),
  };
}

/** Builds a mock for every broadcast adapter in one call, keyed the same way
 * registerDefaultInfrastructureAdapters() keys them in the real DI registry. */
export function createMockBroadcastAdapters() {
  return {
    RunPodAdapter: createMockRunPodAdapter(),
    MediaMTXAdapter: createMockMediaMTXAdapter(),
    OBSAdapter: createMockOBSAdapter(),
    WebSocketAdapter: createMockWebSocketAdapter(),
    SRTAdapter: createMockSRTAdapter(),
    WhepAdapter: createMockWhepAdapter(),
    FFmpegAdapter: createMockFFmpegAdapter(),
  };
}
