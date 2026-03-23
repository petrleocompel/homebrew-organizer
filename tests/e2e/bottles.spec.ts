import { expect, test } from "@playwright/test";
import {
	acceptNextDialog,
	assignedBottleCard,
	loginAsAdmin,
	resetSeedData,
	seedData,
	selectRadixOption,
} from "./fixtures";

test.beforeEach(() => {
	resetSeedData();
});

test("creates, edits, unassigns, reassigns, and verifies bottle state publicly", async ({
	page,
}) => {
	await loginAsAdmin(page);
	await page.goto("/admin");

	await page
		.getByTestId("admin-batch-card")
		.filter({ hasText: seedData.batches.amberAle.name })
		.first()
		.getByRole("link", { name: /Manage Bottles/ })
		.click();

	await expect(page).toHaveURL(/\/admin\/batch\//);
	await expect(page.getByText(seedData.batches.amberAle.name)).toBeVisible();

	await expect(page.getByTestId("assigned-bottle-count")).toContainText(
		"1 bottles assigned",
	);

	await page.getByTestId("create-bottle-trigger").click();
	await expect(
		page.getByRole("heading", { name: "Create New Bottle" }),
	).toBeVisible();
	await selectRadixOption(page, page.locator("#status"), "Ready");
	await page.getByTestId("create-bottle-submit").click();
	await expect(
		page.getByRole("heading", { name: "Create New Bottle" }),
	).not.toBeVisible();

	await page.getByTestId("assign-existing-bottle-trigger").click();
	await expect(
		page.getByRole("heading", { name: "Assign Bottle to Batch" }),
	).toBeVisible();
	await expect(
		page.getByTestId("assign-bottle-card").filter({ hasText: "#1004" }).first(),
	).toBeVisible();
	await page
		.getByTestId("assign-bottle-card")
		.filter({ hasText: "#1004" })
		.first()
		.getByTestId("assign-bottle-button")
		.click();
	await expect(
		page.getByRole("heading", { name: "Assign Bottle to Batch" }),
	).not.toBeVisible();

	await expect(page.getByTestId("assigned-bottle-count")).toContainText(
		"2 bottles assigned",
	);

	const createdBottleCard = assignedBottleCard(page, "#1004");
	await expect(createdBottleCard).toBeVisible();

	const seededAssignedCard = assignedBottleCard(
		page,
		seedData.bottles.assigned.label,
	);
	await seededAssignedCard.getByRole("button", { name: "Edit" }).click();
	await expect(
		page.getByRole("heading", { name: /Edit Bottle/ }),
	).toBeVisible();
	await selectRadixOption(page, page.locator("#edit-status"), "Ready");
	await page.getByTestId("edit-bottle-submit").click();
	await expect(
		page.getByRole("heading", { name: /Edit Bottle/ }),
	).not.toBeVisible();
	await expect(seededAssignedCard).toContainText("ready");

	const [publicBottlePage] = await Promise.all([
		page.waitForEvent("popup"),
		createdBottleCard.getByRole("link", { name: "View Public" }).click(),
	]);
	await publicBottlePage.waitForLoadState("domcontentloaded");
	await expect(publicBottlePage).toHaveURL(/\/bottle\//);
	await expect(publicBottlePage.getByText("ready")).toBeVisible();
	await publicBottlePage.close();

	await acceptNextDialog(page);
	await seededAssignedCard.getByRole("button", { name: "Remove" }).click();
	await expect(seededAssignedCard).not.toBeVisible();
	await expect(page.getByTestId("assigned-bottle-count")).toContainText(
		"1 bottles assigned",
	);

	await page.goto("/admin/bottles");
	await expect(page.getByText(seedData.bottles.assigned.label)).toBeVisible();
	const inventoryCard = page
		.getByText(seedData.bottles.assigned.label)
		.locator("..")
		.locator("..");
	await expect(inventoryCard).toContainText("Unassigned");

	await page.goBack();
	await page.getByTestId("assign-existing-bottle-trigger").click();
	await expect(
		page.getByRole("heading", { name: "Assign Bottle to Batch" }),
	).toBeVisible();
	await page
		.getByTestId("assign-bottle-card")
		.filter({ hasText: "#1002" })
		.first()
		.getByTestId("assign-bottle-button")
		.click();

	await expect(
		page.getByRole("heading", { name: "Assign Bottle to Batch" }),
	).not.toBeVisible();
	const reassignedBottleCard = assignedBottleCard(
		page,
		seedData.bottles.unassignedOne.label,
	);
	await expect(reassignedBottleCard).toBeVisible();

	await page.goto("/");
	await page
		.getByRole("link", { name: new RegExp(seedData.batches.amberAle.name) })
		.click();
	await expect(
		page.getByText(seedData.bottles.unassignedOne.label),
	).toBeVisible();
	await page
		.getByRole("link", {
			name: new RegExp(seedData.bottles.unassignedOne.label),
		})
		.click();
	await expect(page).toHaveURL(/\/bottle\//);
	await expect(page.getByText("Current Batch")).toBeVisible();
	await expect(page.getByText(seedData.batches.amberAle.name)).toBeVisible();
});
