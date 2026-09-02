import { execFileSync } from "node:child_process";
import { expect, type Locator, type Page } from "@playwright/test";
import { playwrightSeed } from "../../src/scripts/seed-playwright";

export const adminCredentials = playwrightSeed.admin;
export const seedData = playwrightSeed;

export function uniqueName(prefix: string) {
	return `${prefix} ${Date.now()}`;
}

export function resetSeedData() {
	execFileSync("pnpm", ["exec", "tsx", "src/scripts/reset-playwright-db.ts"], {
		cwd: process.cwd(),
		env: process.env,
		stdio: "inherit",
	});
	execFileSync("pnpm", ["exec", "tsx", "src/scripts/seed-playwright.ts"], {
		cwd: process.cwd(),
		env: process.env,
		stdio: "inherit",
	});
}

export async function loginAsAdmin(page: Page) {
	await page.goto("/sign-in", { waitUntil: "networkidle" });
	await page.getByLabel("Email").fill(adminCredentials.email);
	await page.getByLabel("Password").fill(adminCredentials.password);
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL(/\/admin$/);
	await expect(
		page.getByRole("heading", { name: "Dashboard", exact: true }),
	).toBeVisible();
}

export async function acceptNextDialog(page: Page) {
	page.once("dialog", (dialog) => dialog.accept());
}

export async function selectRadixOption(
	page: Page,
	trigger: Locator,
	optionName: string,
) {
	await trigger.click();
	await page.getByRole("option", { name: optionName }).click();
}

export function adminBatchCard(page: Page, batchName: string) {
	return page
		.getByTestId("admin-batch-card")
		.filter({ hasText: batchName })
		.first();
}

export function assignedBottleCard(page: Page, bottleText: string) {
	return page
		.getByTestId("assigned-bottle-card")
		.filter({ hasText: bottleText })
		.first();
}
