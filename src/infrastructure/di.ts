// Lightweight registry for infrastructure adapters — kept separate from core DI
const infraRegistry = new Map<string, unknown>();

export function registerAdapter<T>(key: string, impl: T): void {
  if (infraRegistry.has(key)) {
    throw new Error(`Adapter already registered: ${key}`);
  }
  infraRegistry.set(key, impl);
}

export function resolveAdapter<T>(key: string): T {
  const svc = infraRegistry.get(key);
  if (!svc) throw new Error(`Adapter not registered: ${key}`);
  return svc as T;
}

export function replaceAdapter<T>(key: string, impl: T): void {
  infraRegistry.set(key, impl);
}
