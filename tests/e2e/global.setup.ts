import { execFileSync } from "node:child_process";
import type { FullConfig } from "@playwright/test";

export default function globalSetup(_config: FullConfig) {
	execFileSync("npm", ["run", "test:e2e:prepare"], {
		cwd: process.cwd(),
		env: process.env,
		stdio: "inherit",
	});
}
