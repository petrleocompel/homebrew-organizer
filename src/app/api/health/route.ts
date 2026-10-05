export const dynamic = "force-dynamic";

/** Liveness probe for container health checks. */
export function GET() {
	return Response.json({ status: "ok" });
}
