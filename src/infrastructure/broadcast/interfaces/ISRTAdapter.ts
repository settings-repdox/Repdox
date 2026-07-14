export interface ISRTAdapter {
  startSRTSession(params: {
    source: string;
    dest: string;
    options?: Record<string, unknown>;
  }): Promise<{ sessionId: string }>;
  stopSRTSession(sessionId: string): Promise<void>;
  getSRTStatus(sessionId: string): Promise<Record<string, unknown>>;
}
