import { expect, test } from "@playwright/test";

test("visiting the home page without a session redirects to /login", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login\?next=\/$/);
});
