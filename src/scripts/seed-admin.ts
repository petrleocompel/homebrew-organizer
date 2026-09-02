/**
 * Creates the default admin user via better-auth.
 * Run with: pnpm db:seed-admin
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env before importing any project code (env validation runs on import)
const envFile = resolve(process.cwd(), ".env");
if (existsSync(envFile)) {
	for (const line of readFileSync(envFile, "utf8").split("\n")) {
		const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)/);
		if (!m) continue;
		const [, key, raw] = m;
		if (!key || !raw || process.env[key]) continue;
		let v = raw.trim();
		if (
			(v.startsWith('"') && v.endsWith('"')) ||
			(v.startsWith("'") && v.endsWith("'"))
		) {
			v = v.slice(1, -1);
		}
		process.env[key] = v;
	}
}

// Dynamic import so env is set before T3 env validation runs
const { auth } = await import("@/server/auth");
const { db } = await import("@/server/db");
const { breweryMembers, users } = await import("@/server/db/schema");
const { eq } = await import("drizzle-orm");

const email = "admin@example.com";
const password = "change-me-owner";

console.log(`Creating admin user: ${email}`);

try {
	const result = await auth.api.signUpEmail({
		body: { email, password, name: "Admin" },
	});
	await db
		.insert(breweryMembers)
		.values({ userId: result.user.id, role: "owner" })
		.onConflictDoUpdate({
			target: breweryMembers.userId,
			set: { role: "owner", disabledAt: null },
		});
	console.log("Admin user created successfully.");
} catch (err) {
	const msg = err instanceof Error ? err.message : String(err);
	if (/already exist/i.test(msg) || /duplicate/i.test(msg)) {
		const [existing] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, email))
			.limit(1);
		if (existing) {
			await db
				.insert(breweryMembers)
				.values({ userId: existing.id, role: "owner" })
				.onConflictDoUpdate({
					target: breweryMembers.userId,
					set: { role: "owner", disabledAt: null },
				});
		}
		console.log("User already exists — ensured Owner membership.");
	} else {
		console.error("Error:", msg);
		process.exit(1);
	}
}
