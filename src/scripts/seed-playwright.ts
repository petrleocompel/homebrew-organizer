import { pathToFileURL } from "node:url";
import { getPlaywrightDatabaseUrl, loadEnvFile } from "./playwright-env";

export const playwrightSeed = {
	admin: {
		email: "admin@example.com",
		password: "change-me-owner",
		name: "Admin",
	},
	viewer: {
		email: "viewer@example.com",
		password: "change-me-viewer",
		name: "Viewer",
	},
	batches: {
		amberAle: {
			batchNumber: 101,
			name: "Playwright Amber Ale",
			description: "Seed batch for public and admin Playwright coverage.",
			note: "Conditioning nicely in the test cellar.",
			status: "fermenting" as const,
		},
		stout: {
			batchNumber: 102,
			name: "Playwright Stout",
			description:
				"Secondary seeded batch used for CRUD and navigation checks.",
			note: "Held for admin-side edits during the suite.",
			status: "planning" as const,
		},
	},
	bottles: {
		assigned: {
			bottleNumber: 1001,
			label: "PW-A1",
			status: "conditioning" as const,
		},
		unassignedOne: {
			bottleNumber: 1002,
			label: "PW-U1",
			status: "empty" as const,
		},
		unassignedTwo: {
			bottleNumber: 1003,
			label: "PW-U2",
			status: "ready" as const,
		},
	},
};

export async function seedPlaywrightData() {
	loadEnvFile();
	process.env.DATABASE_URL = getPlaywrightDatabaseUrl();

	const [
		{ auth },
		{ db, dbConnection },
		{ batches, breweryMembers },
		{ createBottles, assignFill },
		{ createRecipeRevision },
	] = await Promise.all([
		import("@/server/auth"),
		import("@/server/db"),
		import("@/server/db/schema"),
		import("@/server/services/bottle-service"),
		import("@/server/services/recipe-service"),
	]);

	try {
		const signUp = await auth.api.signUpEmail({
			body: {
				email: playwrightSeed.admin.email,
				password: playwrightSeed.admin.password,
				name: playwrightSeed.admin.name,
			},
		});
		const viewerSignUp = await auth.api.signUpEmail({
			body: {
				email: playwrightSeed.viewer.email,
				password: playwrightSeed.viewer.password,
				name: playwrightSeed.viewer.name,
			},
		});
		await db.insert(breweryMembers).values([
			{
				userId: signUp.user.id,
				role: "owner",
			},
			{
				userId: viewerSignUp.user.id,
				role: "viewer",
			},
		]);

		const recipeRevision = await createRecipeRevision({
			name: "Playwright House Recipe",
			actorUserId: signUp.user.id,
			revisionMessage: "Initial deterministic E2E fixture",
			beerJson: {
				beerjson: {
					version: 1,
					recipes: [
						{
							name: "Playwright House Recipe",
							type: "all grain",
							author: "Homebrew Organizer",
							batch_size: { unit: "l", value: 20 },
							efficiency: {
								brewhouse: { unit: "%", value: 72 },
							},
							ingredients: { fermentable_additions: [] },
						},
					],
				},
			},
		});

		const [amberAleBatch] = await db
			.insert(batches)
			.values([
				{
					...playwrightSeed.batches.amberAle,
					publicName: playwrightSeed.batches.amberAle.name,
					publicDescription: playwrightSeed.batches.amberAle.description,
					privateNotes: playwrightSeed.batches.amberAle.note,
					visibility: "listed" as const,
					recipeRevisionId: recipeRevision.id,
				},
				{
					...playwrightSeed.batches.stout,
					publicName: playwrightSeed.batches.stout.name,
					publicDescription: playwrightSeed.batches.stout.description,
					privateNotes: playwrightSeed.batches.stout.note,
					visibility: "listed" as const,
					recipeRevisionId: recipeRevision.id,
				},
			])
			.returning();
		if (!amberAleBatch) throw new Error("Playwright batch insert failed.");

		const createdBottles = await createBottles(
			[
				{
					...playwrightSeed.bottles.assigned,
					displayName: playwrightSeed.bottles.assigned.label,
					legacyLabel: playwrightSeed.bottles.assigned.label,
					legacyStatus: playwrightSeed.bottles.assigned.status,
				},
				{
					...playwrightSeed.bottles.unassignedOne,
					displayName: playwrightSeed.bottles.unassignedOne.label,
					legacyLabel: playwrightSeed.bottles.unassignedOne.label,
					legacyStatus: playwrightSeed.bottles.unassignedOne.status,
				},
				{
					...playwrightSeed.bottles.unassignedTwo,
					displayName: playwrightSeed.bottles.unassignedTwo.label,
					legacyLabel: playwrightSeed.bottles.unassignedTwo.label,
					legacyStatus: playwrightSeed.bottles.unassignedTwo.status,
				},
			],
			signUp.user.id,
		);
		const assignedBottle = createdBottles[0];
		if (!assignedBottle) throw new Error("Playwright bottle insert failed.");
		await db.transaction((tx) =>
			assignFill(
				tx,
				{
					bottleId: assignedBottle.id,
					batchId: amberAleBatch.id,
					status: "conditioning",
				},
				signUp.user.id,
				"web",
			),
		);
	} finally {
		await dbConnection.end();
	}
}

if (process.argv[1]) {
	const isDirectRun = import.meta.url === pathToFileURL(process.argv[1]).href;
	if (isDirectRun) {
		try {
			await seedPlaywrightData();
			process.exit(0);
		} catch (error) {
			console.error(error);
			process.exit(1);
		}
	}
}
