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
import { assignFill } from "@/server/services/bottle-service";

export const runtime = "nodejs";

const schema = z.object({
	batchId: z.string().min(1),
	status: z.enum(["filled", "conditioning", "ready"]).default("conditioning"),
	filledAt: z.string().datetime({ offset: true }).optional(),
	expectedReadyAt: z.string().datetime({ offset: true }).nullish(),
	privateNotes: z.string().max(10_000).nullish(),
});

export async function POST(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	return handleApi(request, async () => {
		const actor = await requireActor(request.headers, "bottle:fill");
		const key = requireIdempotencyKey(request);
		const body = await parseJson(request, schema);
		const { id: bottleId } = await context.params;
		const result = await withIdempotency({
			actorUserId: actor.userId,
			operation: "bottles.fill",
			key,
			request: { bottleId, ...body },
			status: 201,
			execute: (tx) =>
				assignFill(
					tx,
					{
						bottleId,
						batchId: body.batchId,
						status: body.status,
						filledAt: body.filledAt ? new Date(body.filledAt) : undefined,
						expectedReadyAt:
							body.expectedReadyAt == null
								? body.expectedReadyAt
								: new Date(body.expectedReadyAt),
						privateNotes: body.privateNotes,
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
