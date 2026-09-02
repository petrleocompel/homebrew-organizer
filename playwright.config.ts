import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

function loadEnvFile(fileName = ".env") {
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

loadEnvFile();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const databaseUrl =
	process.env.PLAYWRIGHT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error(
		"Missing PLAYWRIGHT_DATABASE_URL or DATABASE_URL for Playwright execution.",
	);
}

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 60_000,
	expect: {
		timeout: 10_000,
	},
	use: {
		baseURL,
		trace: "on-first-retry",
		video: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	webServer: {
		command: "pnpm test:e2e:prepare && pnpm dev",
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: {
			...process.env,
			DATABASE_URL: databaseUrl,
			PLAYWRIGHT_DATABASE_URL: databaseUrl,
			BETTER_AUTH_URL: baseURL,
			PORT: new URL(baseURL).port || "3000",
		},
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
			},
		},
	],
});
