import { expect, test } from "@playwright/test";
import { loginAsAdmin, resetSeedData } from "./fixtures";

test.beforeEach(() => {
	resetSeedData();
});

test("redirects unauthenticated users to sign-in", async ({ page }) => {
	await page.goto("/admin");
	await expect(page).toHaveURL(/\/sign-in$/);
	await expect(page.getByLabel("Email")).toBeVisible();
	await expect(page.getByLabel("Password")).toBeVisible();
});

test("signs in and opens protected routes", async ({ page }) => {
	await loginAsAdmin(page);

	await page.goto("/admin/bottles");
	await expect(page).toHaveURL(/\/admin\/bottles$/);
	await expect(
		page.getByRole("heading", { name: "Bottles", exact: true }),
	).toBeVisible();
});
