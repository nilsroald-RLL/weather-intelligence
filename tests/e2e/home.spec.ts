import { expect, test } from "@playwright/test";

test("home page shows the Weather Intelligence placeholder", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Weather Intelligence", { exact: true })).toBeVisible();
});
