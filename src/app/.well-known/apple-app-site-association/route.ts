import { env } from "@/env";

export const dynamic = "force-static";

export function GET() {
	const appId = env.APPLE_TEAM_ID
		? `${env.APPLE_TEAM_ID}.${env.APPLE_BUNDLE_ID}`
		: null;
	return Response.json(
		{
			applinks: {
				apps: [],
				details: appId
					? [{ appIDs: [appId], components: [{ "/": "/b/*" }] }]
					: [],
			},
		},
		{
			headers: {
				"content-type": "application/json",
				"cache-control": "public, max-age=3600",
			},
		},
	);
}
