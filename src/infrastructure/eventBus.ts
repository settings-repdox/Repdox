// Lightweight event bus scaffold for future infrastructure wiring.

export type EventPayload = Record<string, unknown>;

export interface EventMessage<T extends EventPayload = EventPayload> {
  type: string;
  payload: T;
  timestamp: string;
}

export class EventBus {
  private listeners = new Map<string, Array<(payload: EventPayload) => void>>();

  subscribe<T extends EventPayload>(
    eventType: string,
    listener: (payload: T) => void,
  ): void {
    const handlers = this.listeners.get(eventType) ?? [];
    handlers.push(listener as (payload: EventPayload) => void);
    this.listeners.set(eventType, handlers);
  }

  emit<T extends EventPayload>(event: EventMessage<T>): void {
    const handlers = this.listeners.get(event.type) ?? [];
    handlers.forEach((listener) => listener(event.payload));
  }
}
