import { expect, test } from "@playwright/test";
import {
	adminBatchCard,
	confirmAlertDialog,
	loginAsAdmin,
	resetSeedData,
	selectRadixOption,
	uniqueName,
} from "./fixtures";

test.beforeEach(() => {
	resetSeedData();
});

test("creates, edits, and archives a batch across admin and public views", async ({
	page,
}) => {
	const createdName = uniqueName("PW Batch Created");
	const editedName = uniqueName("PW Batch Edited");

	await loginAsAdmin(page);
	await page.goto("/admin");

	await page.getByTestId("create-batch-trigger").click();
	await expect(
		page.getByRole("heading", { name: "Create New Batch" }),
	).toBeVisible();
	await page.locator("#recipe-revision").click();
	await page.getByRole("option", { name: /Playwright House Recipe/ }).click();
	await page.getByLabel("Batch Name").fill(createdName);
	await page
		.getByLabel("Description")
		.fill("Created in Playwright CRUD coverage");
	await page.getByLabel("Notes").fill("Initial note from the E2E suite");
	await selectRadixOption(page, page.locator("#visibility"), "Listed catalog");
	await selectRadixOption(page, page.locator("#status"), "Brewing");
	await page.getByTestId("create-batch-submit").click();
	await expect(
		page.getByRole("heading", { name: "Create New Batch" }),
	).not.toBeVisible();

	const createdCard = adminBatchCard(page, createdName);
	await expect(createdCard).toBeVisible();
	await page.goto("/");
	await expect(page.getByText(createdName)).toBeVisible();

	await page.goto("/admin");
	await createdCard.getByTestId("admin-batch-edit").click();
	await expect(page.getByRole("heading", { name: /Edit Batch/ })).toBeVisible();
	await page.getByLabel("Batch Name").fill(editedName);
	await page.getByLabel("Public beer name").fill(editedName);
	await page
		.getByLabel("Description")
		.fill("Edited in Playwright CRUD coverage");
	await page.getByLabel("Notes").fill("Edited note from the E2E suite");
	await selectRadixOption(page, page.locator("#edit-status"), "Completed");
	await page.getByTestId("edit-batch-submit").click();
	await expect(
		page.getByRole("heading", { name: /Edit Batch/ }),
	).not.toBeVisible();

	const editedCard = adminBatchCard(page, editedName);
	await expect(editedCard).toBeVisible();
	await editedCard.getByRole("link", { name: /Manage Bottles/ }).click();
	await expect(page).toHaveURL(/\/admin\/batch\//);
	await expect(page.getByText(editedName)).toBeVisible();

	await page.goto("/");
	await expect(page.getByText(editedName)).toBeVisible();

	await page.goto("/admin");
	await editedCard.getByTestId("admin-batch-archive").click();
	await confirmAlertDialog(page, "Archive batch");
	await expect(editedCard).not.toBeVisible();

	await page.goto("/");
	await expect(page.getByText(editedName)).not.toBeVisible();
});
