/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	output: "standalone",
	allowedDevOrigins: ["127.0.0.1"],
	outputFileTracingIncludes: {
		"/*": ["./node_modules/@fontsource/noto-sans/files/*.woff"],
	},
};

export default config;
