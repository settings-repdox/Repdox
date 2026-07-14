import type { ISRTAdapter } from "@/infrastructure/broadcast/interfaces/ISRTAdapter";

export class SRTAdapterStub implements ISRTAdapter {
  async startSRTSession(params: {
    source: string;
    dest: string;
    options?: Record<string, unknown>;
  }) {
    return { sessionId: `srt_${Math.random().toString(36).slice(2, 9)}` };
  }
  async stopSRTSession(sessionId: string) {
    return;
  }
  async getSRTStatus(sessionId: string) {
    return { sessionId, status: "unknown" };
  }
}
