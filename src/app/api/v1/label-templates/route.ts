import { z } from "zod";
import { env } from "@/env";
import type { LabelElement } from "@/server/db/schema";
import { DomainError } from "@/server/domain";
import { requireActor } from "@/server/domain/permissions";
import { apiJson, handleApi } from "@/server/http/api";
import {
	createLabelTemplate,
	listLabelTemplates,
} from "@/server/services/label-service";

export const runtime = "nodejs";

const elementSchema = z.array(z.record(z.string(), z.unknown())).min(1).max(50);

export async function GET(request: Request) {
	return handleApi(request, async () => {
		await requireActor(request.headers, "label:manage");
		return apiJson({ items: await listLabelTemplates() });
	});
}

export async function POST(request: Request) {
	return handleApi(request, async () => {
		const actor = await requireActor(request.headers, "label:manage");
		const form = await request.formData();
		const file = form.get("file");
		const name = form.get("name");
		const type = form.get("type");
		const elements = form.get("elements");
		if (
			!(file instanceof File) ||
			typeof name !== "string" ||
			(type !== "identity" && type !== "batch") ||
			typeof elements !== "string"
		) {
			throw new DomainError(
				"VALIDATION_FAILED",
				"Template upload requires name, type, elements, and a PDF file.",
				422,
			);
		}
		if (file.size > env.PDF_UPLOAD_MAX_BYTES) {
			throw new DomainError(
				"UPLOAD_TOO_LARGE",
				"PDF exceeds the configured upload limit.",
				413,
			);
		}
		let parsedElements: unknown;
		try {
			parsedElements = JSON.parse(elements);
		} catch {
			throw new DomainError(
				"VALIDATION_FAILED",
				"elements must be valid JSON.",
				422,
			);
		}
		const elementResult = elementSchema.safeParse(parsedElements);
		if (!elementResult.success) {
			throw new DomainError(
				"VALIDATION_FAILED",
				"Template elements are invalid.",
				422,
			);
		}
		const template = await createLabelTemplate({
			name,
			type,
			backgroundPdf: new Uint8Array(await file.arrayBuffer()),
			elements: elementResult.data as unknown as LabelElement[],
			actorUserId: actor.userId,
			maxBytes: env.PDF_UPLOAD_MAX_BYTES,
		});
		return apiJson(template, 201);
	});
}
