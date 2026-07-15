import { test, expect } from "@playwright/test";

// Phase 10: regression coverage for the bug where a Gaming event's
// registration form showed the Hackathon-only "Team Composition" block
// (Solo/Team picker, GitHub/LinkedIn fields) — fixed in EventRegister.tsx by
// gating that section behind `{!isGaming && (...)}`. The unit-test layer
// can't catch this class of bug because it's a rendering/conditional issue in
// a large page component, not an isolated function — a real browser render
// against a real (or seeded) event is the only way to catch a regression here.
//
// Requires a Gaming-type event to exist in whichever Supabase project the dev
// server (E2E_BASE_URL) points at. Set E2E_GAMING_EVENT_SLUG to its slug to
// run this for real; otherwise it's skipped rather than reported as a false
// failure. See TECHNICAL_DEBT_PHASE10.md for seeding a dedicated E2E dataset.
const gamingSlug = process.env.E2E_GAMING_EVENT_SLUG;

test.describe("Regression: Gaming event registration form", () => {
  test.skip(
    !gamingSlug,
    "Set E2E_GAMING_EVENT_SLUG to a real Gaming event slug to run this against seeded data.",
  );

  test("does not show the Hackathon-only Team Composition section", async ({ page }) => {
    await page.goto(`/events/${gamingSlug}/register`);

    // Gaming-specific copy should be present...
    await expect(page.getByText(/gamer details/i)).toBeVisible();

    // ...and the hackathon-only section should not render at all.
    await expect(page.getByText(/team composition/i)).toHaveCount(0);
    await expect(page.getByLabel(/github profile/i)).toHaveCount(0);
    await expect(page.getByLabel(/linkedin profile/i)).toHaveCount(0);
  });
});
