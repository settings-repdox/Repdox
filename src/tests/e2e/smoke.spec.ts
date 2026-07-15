import { test, expect } from "@playwright/test";

// Phase 10: baseline E2E smoke tests. These only assert on static
// shell/navigation content, so they don't depend on any seeded Supabase data
// and should pass against any environment the dev server points at.

test.describe("Smoke: core navigation", () => {
  test("homepage loads and shows the hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /think\.\s*build\./i })).toBeVisible();
  });

  test("nav links route to their pages", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /events/i }).first().click();
    await expect(page).toHaveURL(/\/events/);

    await page.goto("/");
    await page.getByRole("link", { name: /join us/i }).first().click();
    await expect(page).toHaveURL(/\/(join|volunteers)/);

    await page.goto("/");
    await page.getByRole("link", { name: /about us/i }).first().click();
    await expect(page).toHaveURL(/\/about/);

    await page.goto("/");
    await page.getByRole("link", { name: /^contact$/i }).first().click();
    await expect(page).toHaveURL(/\/contact/);
  });

  test("all events page renders without a console error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/events");
    await expect(page.getByRole("heading", { name: /all events/i })).toBeVisible();

    expect(errors).toEqual([]);
  });
});
