import { DomainError } from "@/server/domain";
import { apiJson, handleApi } from "@/server/http/api";
import { getPublicBottleByCode } from "@/server/services/bottle-service";

export const runtime = "nodejs";

export async function GET(
	request: Request,
	context: { params: Promise<{ code: string }> },
) {
	return handleApi(request, async () => {
		const { code } = await context.params;
		const bottle = await getPublicBottleByCode(code);
		if (!bottle) {
			throw new DomainError("NOT_FOUND", "Bottle not found.", 404);
		}
		return apiJson(bottle, 200, {
			"cache-control": "public, max-age=30, stale-while-revalidate=300",
		});
	});
}
