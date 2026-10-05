import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Hostname of a URL, or undefined when the URL is missing or invalid.
 * @param {string | undefined} url
 */
function hostnameOf(url) {
	try {
		return url ? new URL(url).hostname : undefined;
	} catch {
		return undefined;
	}
}

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		BETTER_AUTH_SECRET: isProduction ? z.string() : z.string().optional(),
		BETTER_AUTH_URL: z.string().url().optional(),
		DATABASE_URL: z.string().url(),
		PUBLIC_APP_URL: isProduction
			? z.string().url()
			: z.string().url().default("http://localhost:3000"),
		/** Comma-separated; defaults to the PUBLIC_APP_URL hostname. */
		ALLOWED_QR_HOSTS: z.string().default("localhost"),
		RECIPE_UPLOAD_MAX_BYTES: z.coerce
			.number()
			.int()
			.positive()
			.default(5_242_880),
		PDF_UPLOAD_MAX_BYTES: z.coerce
			.number()
			.int()
			.positive()
			.default(10_485_760),
		/** Universal Links are served only when both Apple values are set. */
		APPLE_TEAM_ID: z
			.string()
			.regex(/^[A-Z0-9]{10}$/)
			.optional(),
		APPLE_BUNDLE_ID: z.string().optional(),
		/** Shown on the public footer, privacy, and support pages. */
		OPERATOR_NAME: z.string().optional(),
		SUPPORT_EMAIL: z.string().email().optional(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		// NEXT_PUBLIC_CLIENTVAR: z.string(),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
		DATABASE_URL: process.env.DATABASE_URL,
		PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
		ALLOWED_QR_HOSTS:
			process.env.ALLOWED_QR_HOSTS || hostnameOf(process.env.PUBLIC_APP_URL),
		RECIPE_UPLOAD_MAX_BYTES: process.env.RECIPE_UPLOAD_MAX_BYTES,
		PDF_UPLOAD_MAX_BYTES: process.env.PDF_UPLOAD_MAX_BYTES,
		APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
		APPLE_BUNDLE_ID: process.env.APPLE_BUNDLE_ID,
		OPERATOR_NAME: process.env.OPERATOR_NAME,
		SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
		NODE_ENV: process.env.NODE_ENV,
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});
