import { env } from "@/env";

export const dynamic = "force-dynamic";

export function GET() {
	const appId = `${env.APPLE_TEAM_ID}.${env.APPLE_BUNDLE_ID}`;
	return Response.json(
		{
			applinks: {
				apps: [],
				details: [{ appIDs: [appId], components: [{ "/": "/b/*" }] }],
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
