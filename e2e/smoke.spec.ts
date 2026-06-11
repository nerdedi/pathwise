import { expect, test } from "@playwright/test";

test.describe("public smoke routes", () => {
  test("landing page renders the hero and primary CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Know what to expect/i })
    ).toBeVisible();
    await expect(
      page.getByRole("navigation").getByRole("link", { name: /Create new profile/i })
    ).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: /Log in/i })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: /System check/i })).toBeVisible();
  });

  test("onboarding page loads its first step", async ({ page }) => {
    await page.goto("/onboarding");

    await expect(
      page.getByRole("heading", { name: /Create your Pathwise profile|Welcome to Pathwise/i })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /skip straight to planning/i })).toBeVisible();
  });

  test("plan page renders the venue URL form", async ({ page }) => {
    await page.goto("/plan");

    await expect(
      page.getByRole("heading", { name: /Where are you heading\?/i })
    ).toBeVisible();
    await expect(page.getByLabel(/Venue website URL/i)).toBeVisible();
    await expect(
      page.getByRole("navigation").getByRole("link", { name: /System check/i })
    ).toBeVisible();
  });

  test("system-check nav link opens setup diagnostics", async ({ page }) => {
    await page.goto("/");

    const systemCheckLink = page.getByRole("navigation").getByRole("link", {
      name: /System check/i,
    });
    await expect(systemCheckLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/setup$/),
      systemCheckLink.click(),
    ]);
    await expect(page.getByRole("heading", { name: /Environment diagnostics/i })).toBeVisible();
  });
  test("setup page renders runtime diagnostics", async ({ page }) => {
    await page.goto("/setup");

    await expect(page.getByRole("heading", { name: /Environment diagnostics/i })).toBeVisible();
    await expect(page.getByText(/runtime checks/i)).toBeVisible();
  });
});
