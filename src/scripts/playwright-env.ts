import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvFile(fileName = ".env") {
	const envFile = resolve(process.cwd(), fileName);
	if (!existsSync(envFile)) {
		return;
	}

	for (const line of readFileSync(envFile, "utf8").split("\n")) {
		const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)/);
		if (!match) continue;

		const [, key, raw] = match;
		if (!key || !raw || process.env[key]) continue;

		let value = raw.trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		process.env[key] = value;
	}
}

export function getPlaywrightDatabaseUrl() {
	const databaseUrl =
		process.env.PLAYWRIGHT_DATABASE_URL ?? process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error(
			"Missing PLAYWRIGHT_DATABASE_URL. Set it in your environment or .env before running E2E tests.",
		);
	}

	return databaseUrl;
}
