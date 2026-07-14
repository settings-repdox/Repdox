// Test setup and mocking configuration (Phase 10)
import { vi, beforeAll, afterEach } from "vitest";

// Set up environment variables before any code that uses them
beforeAll(() => {
  process.env.VITE_SUPABASE_URL = "http://test-supabase.local";
  process.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";
  process.env.VITE_API_URL = "http://test-api.local";
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
});
