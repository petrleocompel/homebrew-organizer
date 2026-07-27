import { z } from "zod";
import { env } from "@/env";
import { withIdempotency } from "@/server/domain";
import { requireActor } from "@/server/domain/permissions";
import {
	apiJson,
	handleApi,
	idempotencyHeaders,
	parseJson,
	requireIdempotencyKey,
} from "@/server/http/api";
import { createPrintRuns } from "@/server/services/label-service";

export const runtime = "nodejs";

const schema = z.object({
	templateId: z.string().min(1),
	bottleIds: z.array(z.string().min(1)).min(1).max(5_000),
	batchId: z.string().nullish(),
	confirmDuplicateIdentity: z.boolean().default(false),
});

export async function POST(request: Request) {
	return handleApi(request, async () => {
		const actor = await requireActor(request.headers, "label:manage");
		const key = requireIdempotencyKey(request);
		const body = await parseJson(request, schema);
		const result = await withIdempotency({
			actorUserId: actor.userId,
			operation: "print-runs.create",
			key,
			request: body,
			status: 201,
			execute: (tx) =>
				createPrintRuns({
					...body,
					actorUserId: actor.userId,
					publicAppUrl: env.PUBLIC_APP_URL,
					transaction: tx,
				}),
		});
		return apiJson(
			{ runs: result.value },
			result.status,
			idempotencyHeaders(result.replayed),
		);
	});
}
