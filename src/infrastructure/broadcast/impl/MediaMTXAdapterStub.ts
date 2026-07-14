import type { IMediaMTXAdapter } from "@/infrastructure/broadcast/interfaces/IMediaMTXAdapter";

export class MediaMTXAdapterStub implements IMediaMTXAdapter {
  async createStream(channelId: string) {
    return { streamId: `mtx_${channelId}`, ingestUrl: null };
  }
  async removeStream(streamId: string) {
    return;
  }
  async getStreamInfo(streamId: string) {
    return { streamId, active: false };
  }
}
