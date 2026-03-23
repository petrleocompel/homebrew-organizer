import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { getPlaywrightDatabaseUrl, loadEnvFile } from "./playwright-env";

export async function resetPlaywrightDb() {
	loadEnvFile();

	const sql = postgres(getPlaywrightDatabaseUrl(), { max: 1 });

	try {
		await sql.unsafe(`
			TRUNCATE TABLE
				ho_batch_bottles,
				ho_bottles,
				ho_batches,
				ho_account,
				ho_session,
				ho_verification,
				ho_user
			RESTART IDENTITY CASCADE
		`);
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
