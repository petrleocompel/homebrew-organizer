import { DomainError } from "@/server/domain";
import { requireActor } from "@/server/domain/permissions";
import { handleApi } from "@/server/http/api";
import { exportRecipe } from "@/server/services/recipe-service";

export const runtime = "nodejs";

export async function GET(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	return handleApi(request, async () => {
		await requireActor(request.headers, "recipe:manage");
		const { id } = await context.params;
		const format =
			new URL(request.url).searchParams.get("format") ?? "beerjson";
		if (format !== "beerjson" && format !== "beerxml") {
			throw new DomainError(
				"VALIDATION_FAILED",
				"format must be beerjson or beerxml.",
				400,
			);
		}
		const exported = await exportRecipe(id, format);
		return new Response(exported.content, {
			headers: {
				"content-type": exported.contentType,
				"content-disposition": `attachment; filename="${exported.fileName}"`,
				"cache-control": "private, no-store",
			},
		});
	});
}
