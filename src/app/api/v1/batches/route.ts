import { requireActor } from "@/server/domain/permissions";
import { apiJson, handleApi } from "@/server/http/api";
import { listBatches } from "@/server/services/batch-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
	return handleApi(request, async () => {
		await requireActor(request.headers);
		const url = new URL(request.url);
		const result = await listBatches({
			assignable: url.searchParams.get("assignable") === "true",
			cursor: url.searchParams.get("cursor"),
			limit: Number(url.searchParams.get("limit") ?? 50),
		});
		return apiJson(result);
	});
}
