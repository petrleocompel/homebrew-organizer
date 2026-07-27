import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/server/auth";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request: Request) {
	// Account creation is only available through the validated invitation endpoint.
	// Server-side auth.api.signUpEmail calls do not pass through this public handler.
	if (new URL(request.url).pathname.endsWith("/sign-up/email")) {
		return Response.json(
			{
				error: {
					code: "SIGNUP_DISABLED",
					message: "Open registration is disabled.",
				},
			},
			{ status: 403 },
		);
	}
	return handler.POST(request);
}
