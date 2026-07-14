export interface IWebSocketAdapter {
  broadcast(topic: string, payload: unknown): Promise<void>;
  subscribe(topic: string, handler: (payload: unknown) => void): void;
  unsubscribe(topic: string): void;
}
