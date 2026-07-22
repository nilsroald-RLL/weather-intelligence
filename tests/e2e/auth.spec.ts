import { expect, test } from "@playwright/test";

test("login page shows the email and password form", async ({ page }) => {
  await page.goto("/login");

  await expect(page.locator('[data-slot="card-title"]')).toHaveText("Logg inn");
  await expect(page.getByRole("textbox", { name: "E-postadresse" })).toBeVisible();
  await expect(page.getByLabel("Passord")).toBeVisible();
  await expect(page.getByRole("button", { name: "Logg inn" })).toBeVisible();
});

test("visiting /admin without a session redirects to /login", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
});
