// Lightweight DI/service registry for Phase 2. This is a minimal service locator
// for wiring concrete implementations in Phase 3. Avoid overusing — prefer explicit injection.

const registry = new Map<string, unknown>();

export function registerService<T>(key: string, impl: T): void {
  if (registry.has(key)) {
    throw new Error(`Service already registered: ${key}`);
  }
  registry.set(key, impl);
}

export function resolveService<T>(key: string): T {
  const svc = registry.get(key);
  if (!svc) throw new Error(`Service not registered: ${key}`);
  return svc as T;
}

export function replaceService<T>(key: string, impl: T): void {
  registry.set(key, impl);
}
