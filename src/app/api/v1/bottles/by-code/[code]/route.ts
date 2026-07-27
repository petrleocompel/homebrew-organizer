import { DomainError } from "@/server/domain";
import { requireActor } from "@/server/domain/permissions";
import { apiJson, handleApi } from "@/server/http/api";
import { getAuthenticatedBottleByCode } from "@/server/services/bottle-service";

export const runtime = "nodejs";

export async function GET(
	request: Request,
	context: { params: Promise<{ code: string }> },
) {
	return handleApi(request, async () => {
		await requireActor(request.headers);
		const { code } = await context.params;
		const bottle = await getAuthenticatedBottleByCode(code);
		if (!bottle) {
			throw new DomainError("NOT_FOUND", "Bottle not found.", 404);
		}
		return apiJson(bottle, 200, { "cache-control": "private, no-store" });
	});
}
