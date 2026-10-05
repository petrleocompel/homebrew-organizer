/**
 * Applies pending Drizzle migrations from ./drizzle.
 * Run with: pnpm db:migrate
 *
 * Uses the drizzle-orm migrator directly so PostgreSQL errors are printed in
 * full; `drizzle-kit migrate` swallows them behind its progress spinner.
 */
import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { loadEnvFile } from "./playwright-env";

export async function runMigrations(databaseUrl?: string) {
	loadEnvFile();
	const url = databaseUrl ?? process.env.DATABASE_URL;
	if (!url) {
		throw new Error("DATABASE_URL is required.");
	}
	const sql = postgres(url, { max: 1, onnotice: () => {} });
	try {
		await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
		console.log("Migrations applied.");
	} finally {
		await sql.end();
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	try {
		await runMigrations();
	} catch (error) {
		console.error("Migration failed:", error);
		process.exit(1);
	}
}
