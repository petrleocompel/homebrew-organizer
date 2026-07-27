import { z } from "zod";
import { env } from "@/env";
import { DomainError } from "@/server/domain/errors";
import { withIdempotency } from "@/server/domain/idempotency";
import { requireActor } from "@/server/domain/permissions";
import {
	apiJson,
	handleApi,
	idempotencyHeaders,
	parseJson,
	requireIdempotencyKey,
} from "@/server/http/api";
import {
	commitRecipeImport,
	previewRecipeImport,
} from "@/server/services/recipe-service";

export const runtime = "nodejs";

const jsonSchema = z.object({
	fileName: z.string().min(1).max(255),
	content: z.string(),
	commit: z.boolean().default(false),
	selectedIndexes: z.array(z.number().int().nonnegative()).default([]),
	revisionMessage: z.string().max(1_000).nullish(),
});

async function requestBody(
	request: Request,
): Promise<z.infer<typeof jsonSchema>> {
	if (request.headers.get("content-type")?.includes("multipart/form-data")) {
		const form = await request.formData();
		const file = form.get("file");
		if (!(file instanceof File)) {
			throw new DomainError(
				"VALIDATION_FAILED",
				"Multipart request is missing a recipe file.",
				422,
			);
		}
		if (file.size > env.RECIPE_UPLOAD_MAX_BYTES) {
			return {
				fileName: file.name,
				content: "x".repeat(env.RECIPE_UPLOAD_MAX_BYTES + 1),
				commit: false,
				selectedIndexes: [],
				revisionMessage: null,
			};
		}
		const selected = form.get("selectedIndexes");
		let selectedIndexes: unknown = [];
		if (typeof selected === "string") {
			try {
				selectedIndexes = JSON.parse(selected);
			} catch {
				throw new DomainError(
					"VALIDATION_FAILED",
					"selectedIndexes must be valid JSON.",
					422,
				);
			}
		}
		const parsed = jsonSchema.safeParse({
			fileName: file.name,
			content: await file.text(),
			commit: form.get("commit") === "true",
			selectedIndexes,
			revisionMessage: form.get("revisionMessage"),
		});
		if (!parsed.success) {
			throw new DomainError(
				"VALIDATION_FAILED",
				"Multipart recipe import fields are invalid.",
				422,
				{ fields: parsed.error.flatten() },
			);
		}
		return parsed.data;
	}
	return parseJson(request, jsonSchema);
}

export async function POST(request: Request) {
	return handleApi(request, async () => {
		const actor = await requireActor(request.headers, "recipe:manage");
		const body = await requestBody(request);
		const preview = previewRecipeImport({
			content: body.content,
			fileName: body.fileName,
			maxBytes: env.RECIPE_UPLOAD_MAX_BYTES,
		});
		if (!body.commit) return apiJson(preview);

		const key = requireIdempotencyKey(request);
		const result = await withIdempotency({
			actorUserId: actor.userId,
			operation: "recipes.import",
			key,
			request: {
				checksum: preview.checksum,
				selectedIndexes: body.selectedIndexes,
				revisionMessage: body.revisionMessage,
			},
			status: 201,
			execute: (tx) =>
				commitRecipeImport({
					preview,
					selectedIndexes: body.selectedIndexes,
					actorUserId: actor.userId,
					originalFileName: body.fileName,
					originalContent: body.content,
					revisionMessage: body.revisionMessage,
					transaction: tx,
				}),
		});
		return apiJson(
			{ items: result.value },
			result.status,
			idempotencyHeaders(result.replayed),
		);
	});
}
