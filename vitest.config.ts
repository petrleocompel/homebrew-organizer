import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	test: {
		environment: "node",
		include: ["tests/unit/**/*.test.ts"],
		env: {
			DATABASE_URL:
				"postgresql://postgres:password@127.0.0.1:5432/homebrew-organizer-unit",
			NODE_ENV: "test",
			PUBLIC_APP_URL: "https://brew.example.com",
			ALLOWED_QR_HOSTS: "brew.example.com",
		},
	},
});
