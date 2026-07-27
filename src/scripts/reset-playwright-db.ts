import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { getPlaywrightDatabaseUrl, loadEnvFile } from "./playwright-env";

export async function resetPlaywrightDb() {
	loadEnvFile();
	const sql = postgres(getPlaywrightDatabaseUrl(), { max: 1 });
	try {
		const tables = await sql<{ tablename: string }[]>`
			SELECT tablename
			FROM pg_tables
			WHERE schemaname = 'public'
				AND tablename LIKE 'ho_%'
			ORDER BY tablename
		`;
		if (tables.length > 0) {
			const quoted = tables
				.map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`)
				.join(", ");
			await sql.unsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
		}
	} finally {
		await sql.end();
	}
}

if (process.argv[1]) {
	const isDirectRun = import.meta.url === pathToFileURL(process.argv[1]).href;
	if (isDirectRun) {
		try {
			await resetPlaywrightDb();
			process.exit(0);
		} catch (error) {
			console.error(error);
			process.exit(1);
		}
	}
}
