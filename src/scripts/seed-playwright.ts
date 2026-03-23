import { pathToFileURL } from "node:url";
import { getPlaywrightDatabaseUrl, loadEnvFile } from "./playwright-env";

export const playwrightSeed = {
	admin: {
		email: "admin@example.com",
		password: "change-me-owner",
		name: "Admin",
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

	const [{ auth }, { db, dbConnection }, { batchBottles, batches, bottles }] =
		await Promise.all([
			import("@/server/auth"),
			import("@/server/db"),
			import("@/server/db/schema"),
		]);

	try {
		const [amberAleBatch] = await db
			.insert(batches)
			.values([playwrightSeed.batches.amberAle, playwrightSeed.batches.stout])
			.returning();

		const [assignedBottle] = await db
			.insert(bottles)
			.values([
				{
					...playwrightSeed.bottles.assigned,
					currentBatchId: amberAleBatch?.id,
				},
				playwrightSeed.bottles.unassignedOne,
				playwrightSeed.bottles.unassignedTwo,
			])
			.returning();

		if (!amberAleBatch || !assignedBottle) {
			throw new Error("Playwright seed data insert failed.");
		}

		await db.insert(batchBottles).values({
			batchId: amberAleBatch.id,
			bottleId: assignedBottle.id,
		});

		await auth.api.signUpEmail({
			body: {
				email: playwrightSeed.admin.email,
				password: playwrightSeed.admin.password,
				name: playwrightSeed.admin.name,
			},
		});
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
