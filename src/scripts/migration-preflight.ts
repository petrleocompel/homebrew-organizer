import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { loadEnvFile } from "./playwright-env";

export async function migrationPreflight() {
	loadEnvFile();
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is required.");
	}
	const sql = postgres(process.env.DATABASE_URL, { max: 1 });
	try {
		const [duplicateBottleNumbers, duplicateBatchNumbers, missingNumeric] =
			await Promise.all([
				sql<{ bottleNumber: number; count: number }[]>`
					SELECT
						bottle_number AS "bottleNumber",
						count(*)::integer AS "count"
					FROM ho_bottles
					GROUP BY bottle_number
					HAVING count(*) > 1
					ORDER BY bottle_number
				`,
				sql<{ batchNumber: number; count: number }[]>`
					SELECT
						batch_number AS "batchNumber",
						count(*)::integer AS "count"
					FROM ho_batches
					GROUP BY batch_number
					HAVING count(*) > 1
					ORDER BY batch_number
				`,
				sql<{ bottleNumber: number }[]>`
					SELECT generated AS "bottleNumber"
					FROM generate_series(11, 30) generated
					WHERE NOT EXISTS (
						SELECT 1
						FROM ho_bottles bottle
						WHERE bottle.bottle_number = generated
					)
					ORDER BY generated
				`,
			]);

		const report = {
			ok:
				duplicateBottleNumbers.length === 0 &&
				duplicateBatchNumbers.length === 0,
			duplicateBottleNumbers,
			duplicateBatchNumbers,
			numericBottlesToCreate: missingNumeric.map((row) => row.bottleNumber),
			note: "This command is read-only. The additive migration performs the backfill.",
		};
		console.log(JSON.stringify(report, null, 2));
		if (!report.ok) process.exitCode = 1;
		return report;
	} finally {
		await sql.end();
	}
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	await migrationPreflight();
}
