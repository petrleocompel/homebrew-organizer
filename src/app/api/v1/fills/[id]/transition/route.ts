import { z } from "zod";
import { withIdempotency } from "@/server/domain";
import { requireActor } from "@/server/domain/permissions";
import {
	apiJson,
	handleApi,
	idempotencyHeaders,
	parseJson,
	requireIdempotencyKey,
} from "@/server/http/api";
import { transitionFill } from "@/server/services/bottle-service";

export const runtime = "nodejs";

const schema = z.object({
	status: z.enum(["conditioning", "ready"]),
	at: z.string().datetime({ offset: true }).optional(),
});

export async function POST(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	return handleApi(request, async () => {
		const actor = await requireActor(request.headers, "bottle:fill");
		const key = requireIdempotencyKey(request);
		const body = await parseJson(request, schema);
		const { id: fillId } = await context.params;
		const result = await withIdempotency({
			actorUserId: actor.userId,
			operation: "fills.transition",
			key,
			request: { fillId, ...body },
			execute: (tx) =>
				transitionFill(
					tx,
					{
						fillId,
						status: body.status,
						at: body.at ? new Date(body.at) : undefined,
					},
					actor.userId,
					actor.source,
				),
		});
		return apiJson(
			result.value,
			result.status,
			idempotencyHeaders(result.replayed),
		);
	});
}
