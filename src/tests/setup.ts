// Test setup and mocking configuration (Phase 10)
import { vi, beforeAll, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";

// Set up environment variables before any code that uses them
beforeAll(() => {
  process.env.VITE_SUPABASE_URL = "http://test-supabase.local";
  process.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";
  process.env.VITE_API_URL = "http://test-api.local";
});

// framer-motion's `whileInView` (used throughout the app, e.g.
// EventRegister.tsx) relies on IntersectionObserver, which jsdom does not
// implement. Stub it so components using whileInView/viewport can mount
// in tests without throwing; this doesn't attempt to simulate real
// viewport intersection.
class IntersectionObserverMock {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
});
Object.defineProperty(global, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
});

// Mock localStorage for browser environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  cleanup();
});
