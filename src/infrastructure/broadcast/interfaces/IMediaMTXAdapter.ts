export interface IMediaMTXAdapter {
  createStream(
    channelId: string,
    opts?: Record<string, unknown>,
  ): Promise<{ streamId: string; ingestUrl?: string }>;
  removeStream(streamId: string): Promise<void>;
  getStreamInfo(streamId: string): Promise<Record<string, unknown>>;
}
