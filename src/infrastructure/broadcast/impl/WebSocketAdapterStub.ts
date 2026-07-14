import type { IWebSocketAdapter } from "@/infrastructure/broadcast/interfaces/IWebSocketAdapter";

export class WebSocketAdapterStub implements IWebSocketAdapter {
  private handlers = new Map<string, (payload: unknown) => void>();
  async broadcast(topic: string, payload: unknown) {
    const h = this.handlers.get(topic);
    if (h) h(payload);
  }
  subscribe(topic: string, handler: (payload: unknown) => void) {
    this.handlers.set(topic, handler);
  }
  unsubscribe(topic: string) {
    this.handlers.delete(topic);
  }
}
