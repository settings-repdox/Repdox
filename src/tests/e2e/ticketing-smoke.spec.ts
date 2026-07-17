import { test, expect } from "@playwright/test";

// Phase: Ticketing & QR Check-in System. Baseline smoke tests, same
// pattern as src/tests/e2e/smoke.spec.ts — no seeded backend data
// required. Deeper flows (an actual check-in, offline queue behavior)
// need a seeded ticket/event and are intentionally out of scope here for
// the same reason src/tests/e2e/gaming-registration-form.spec.ts requires
// E2E_GAMING_EVENT_SLUG — see RFC 0002 for the seeded-environment proposal
// that would unblock writing those.

test.describe("Smoke: ticketing pages", () => {
  test("an invalid ticket token shows a not-found state instead of crashing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/ticket/this-token-does-not-exist");
    await expect(page.getByText(/ticket not found/i)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("scanner route redirects to login when signed out", async ({ page }) => {
    await page.goto("/scanner");
    // ProtectedRoute should redirect an unauthenticated visitor away from
    // /scanner rather than rendering the camera UI for anyone.
    await expect(page).not.toHaveURL(/\/scanner$/);
  });

  test("my-tickets route redirects to login when signed out", async ({ page }) => {
    await page.goto("/my-tickets");
    await expect(page).not.toHaveURL(/\/my-tickets$/);
  });
});
