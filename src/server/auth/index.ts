import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";

import { env } from "@/env";
import { db } from "@/server/db";
import { accounts, sessions, users, verifications } from "@/server/db/schema";

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL ?? env.PUBLIC_APP_URL,
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: users,
			session: sessions,
			account: accounts,
			verification: verifications,
		},
	}),
	emailAndPassword: {
		enabled: true,
	},
	plugins: [bearer()],
	telemetry: { enabled: false },
});
