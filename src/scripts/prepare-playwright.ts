import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { getPlaywrightDatabaseUrl, loadEnvFile } from "./playwright-env";
import { resetPlaywrightDb } from "./reset-playwright-db";
import { seedPlaywrightData } from "./seed-playwright";

async function ensurePlaywrightDatabaseExists(databaseUrl: string) {
	const url = new URL(databaseUrl);
	const databaseName = url.pathname.replace(/^\//, "");

	if (!databaseName) {
		throw new Error(
			`Invalid PLAYWRIGHT_DATABASE_URL: missing database name in "${databaseUrl}"`,
		);
	}

	const adminUrl = new URL(databaseUrl);
	adminUrl.pathname = "/postgres";

	const sql = postgres(adminUrl.toString(), { max: 1 });

	try {
		const existing = await sql<{ exists: boolean }[]>`
			SELECT EXISTS(
				SELECT 1
				FROM pg_database
				WHERE datname = ${databaseName}
			) AS "exists"
		`;

		if (!existing[0]?.exists) {
			await sql.unsafe(
				`CREATE DATABASE "${databaseName.replaceAll('"', '""')}"`,
			);
		}
	} finally {
		await sql.end();
	}
}

export async function preparePlaywright() {
	loadEnvFile();

	const databaseUrl = getPlaywrightDatabaseUrl();
	await ensurePlaywrightDatabaseExists(databaseUrl);

	execFileSync(
		"pnpm",
		[
			"exec",
			"drizzle-kit",
			"push",
			"--force",
			"--config=drizzle.config.ts",
			//`--url=${databaseUrl}`,
		],
		{
			cwd: process.cwd(),
			env: {
				...process.env,
				DATABASE_URL: databaseUrl,
			},
			stdio: "inherit",
		},
	);

	await resetPlaywrightDb();
	await seedPlaywrightData();
}

if (process.argv[1]) {
	const isDirectRun = import.meta.url === pathToFileURL(process.argv[1]).href;
	if (isDirectRun) {
		try {
			await preparePlaywright();
			process.exit(0);
		} catch (error) {
			console.error(error);
			process.exit(1);
		}
	}
}
