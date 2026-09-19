import { expect, test } from "@playwright/test";
import {
	assignedBottleCard,
	confirmAlertDialog,
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
		"1 bottle assigned",
	);

	await page.getByTestId("create-bottle-trigger").click();
	await expect(
		page.getByRole("heading", { name: "Create New Bottle" }),
	).toBeVisible();
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
		.getByTestId("assign-bottle-toggle")
		.click();
	await page
		.getByTestId("assign-bottle-card")
		.filter({ hasText: seedData.bottles.unassignedOne.label })
		.first()
		.getByTestId("assign-bottle-toggle")
		.click();
	await page.getByTestId("assign-bottles-submit").click();
	await expect(
		page.getByRole("heading", { name: "Assign Bottle to Batch" }),
	).not.toBeVisible();

	await expect(page.getByTestId("assigned-bottle-count")).toContainText(
		"3 bottles assigned",
	);

	const createdBottleCard = assignedBottleCard(page, "#1004");
	await expect(createdBottleCard).toBeVisible();
	await expect(
		assignedBottleCard(page, seedData.bottles.unassignedOne.label),
	).toBeVisible();

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
	await expect(seededAssignedCard).toContainText("Ready");

	const [publicBottlePage] = await Promise.all([
		page.waitForEvent("popup"),
		createdBottleCard.getByRole("link", { name: "View Public" }).click(),
	]);
	await publicBottlePage.waitForLoadState("domcontentloaded");
	await expect(publicBottlePage).toHaveURL(/\/b\/[a-z2-7]{26}$/);
	await expect(
		publicBottlePage.getByRole("heading", {
			name: "Conditioning in the bottle",
		}),
	).toBeVisible();
	await publicBottlePage.close();

	await seededAssignedCard.getByRole("button", { name: "Remove" }).click();
	await confirmAlertDialog(page, "Remove bottle");
	await expect(seededAssignedCard).not.toBeVisible();
	await expect(page.getByTestId("assigned-bottle-count")).toContainText(
		"2 bottles assigned",
	);

	await page.goto("/admin/bottles");
	await expect(page.getByText(seedData.bottles.assigned.label)).toBeVisible();
	const inventoryCard = page
		.getByTestId("inventory-bottle-card")
		.filter({ hasText: seedData.bottles.assigned.label });
	await expect(inventoryCard).toContainText("Unassigned");

	await page.goBack();
	await page.getByTestId("assign-existing-bottle-trigger").click();
	await expect(
		page.getByRole("heading", { name: "Assign Bottle to Batch" }),
	).toBeVisible();
	await page
		.getByTestId("assign-bottle-card")
		.filter({ hasText: seedData.bottles.assigned.label })
		.first()
		.getByTestId("assign-bottle-toggle")
		.click();
	await page.getByTestId("assign-bottles-submit").click();

	await expect(
		page.getByRole("heading", { name: "Assign Bottle to Batch" }),
	).not.toBeVisible();
	const reassignedBottleCard = assignedBottleCard(
		page,
		seedData.bottles.assigned.label,
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
	await expect(page).toHaveURL(/\/b\/[a-z2-7]{26}$/);
	await expect(
		page.getByText(seedData.batches.amberAle.name).first(),
	).toBeVisible();
});
