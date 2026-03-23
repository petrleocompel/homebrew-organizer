import { expect, test } from "@playwright/test";
import { resetSeedData, seedData } from "./fixtures";

test.beforeEach(() => {
	resetSeedData();
});

test("renders public home, batch, and bottle pages from seeded data", async ({
	page,
}) => {
	await page.goto("/");

	await expect(
		page.getByRole("heading", { name: "Homebrew Organizer" }),
	).toBeVisible();
	await expect(page.getByText(seedData.batches.amberAle.name)).toBeVisible();

	await page
		.getByRole("link", { name: new RegExp(seedData.batches.amberAle.name) })
		.click();
	await expect(page).toHaveURL(/\/batch\//);
	await expect(
		page.getByRole("heading", { name: seedData.batches.amberAle.name }),
	).toBeVisible();
	await expect(page.getByText("Bottles")).toBeVisible();
	await expect(page.getByText(seedData.bottles.assigned.label)).toBeVisible();

	await page
		.getByRole("link", { name: new RegExp(seedData.bottles.assigned.label) })
		.click();
	await expect(page).toHaveURL(/\/bottle\//);
	await expect(
		page.getByRole("heading", {
			name: `Bottle ${seedData.bottles.assigned.label}`,
		}),
	).toBeVisible();
	await expect(page.getByText("Current Batch")).toBeVisible();
	await expect(page.getByText(seedData.batches.amberAle.name)).toBeVisible();
});
