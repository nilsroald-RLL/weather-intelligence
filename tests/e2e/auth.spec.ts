import { expect, test } from "@playwright/test";

test("login page shows the sign-in form", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByText("Logg inn", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "E-postadresse" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send pålogging-lenke" })).toBeVisible();
});

test("visiting /admin without a session redirects to /login", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
});
