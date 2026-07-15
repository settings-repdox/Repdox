import { defineConfig, devices } from "@playwright/test";

// Phase 10: E2E tests run against a real browser and the actual dev server,
// separately from the Vitest unit/integration suite (`npm test`). They are
// NOT run as part of `npm test` — see `npm run test:e2e`.
//
// Requires browser binaries downloaded once via `npx playwright install`.
// That step needs network access to Playwright's CDN, which is not always
// available in sandboxed/CI-restricted environments — see
// TECHNICAL_DEBT_PHASE10.md for the current status in this environment.
export default defineConfig({
  testDir: "./src/tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
