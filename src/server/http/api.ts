import { z } from "zod";
import { env } from "@/env";
import { DomainError, isDomainError } from "@/server/domain/errors";

export interface ApiRequestContext {
	requestId: string;
}

function requestIdFrom(request: Request): string {
	const supplied = request.headers.get("x-request-id");
	return supplied && z.uuid().safeParse(supplied).success
		? supplied
		: crypto.randomUUID();
}

function auditSafePath(request: Request): string {
	return new URL(request.url).pathname
		.replace(
			/(\/api\/v1\/(?:public\/bottles|bottles\/by-code)\/)[^/]+/g,
			"$1[qr-code]",
		)
		.replace(/(\/api\/v1\/invites\/)[^/]+/g, "$1[token]");
}

export function apiJson(
	body: unknown,
	status = 200,
	headers?: HeadersInit,
): Response {
	return Response.json(body, { status, headers });
}

export async function handleApi(
	request: Request,
	handler: (context: ApiRequestContext) => Promise<Response>,
): Promise<Response> {
	const requestId = requestIdFrom(request);
	const started = Date.now();
	try {
		const response = await handler({ requestId });
		response.headers.set("x-request-id", requestId);
		console.log(
			JSON.stringify({
				level: "info",
				type: "api_request",
				method: request.method,
				path: auditSafePath(request),
				status: response.status,
				durationMs: Date.now() - started,
				requestId,
			}),
		);
		return response;
	} catch (error) {
		const domainError = isDomainError(error)
			? error
			: new DomainError(
					"INTERNAL_ERROR",
					"An unexpected server error occurred.",
					500,
				);
		console.error(
			JSON.stringify({
				level: "error",
				type: "api_error",
				method: request.method,
				path: auditSafePath(request),
				status: domainError.status,
				code: domainError.code,
				durationMs: Date.now() - started,
				requestId,
			}),
		);
		return apiJson(
			{
				error: {
					code: domainError.code,
					message: domainError.message,
					details: domainError.details,
					requestId,
				},
			},
			domainError.status,
			{ "x-request-id": requestId },
		);
	}
}

export async function parseJson<T>(
	request: Request,
	schema: z.ZodType<T>,
): Promise<T> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw new DomainError(
			"VALIDATION_FAILED",
			"Request body must be valid JSON.",
			400,
		);
	}
	const result = schema.safeParse(body);
	if (!result.success) {
		throw new DomainError(
			"VALIDATION_FAILED",
			"Request body is invalid.",
			422,
			{ fields: result.error.flatten() },
		);
	}
	return result.data;
}

export function requireIdempotencyKey(request: Request): string {
	const key = request.headers.get("idempotency-key");
	if (!key || !z.uuid().safeParse(key).success) {
		throw new DomainError(
			"IDEMPOTENCY_KEY_REQUIRED",
			"Idempotency-Key must be a UUID.",
			400,
		);
	}
	return key;
}

export function idempotencyHeaders(replayed: boolean): HeadersInit {
	return { "idempotency-replayed": replayed ? "true" : "false" };
}

export function serverCapabilities() {
	return {
		apiVersion: "v1" as const,
		maxRecipeUploadBytes: env.RECIPE_UPLOAD_MAX_BYTES,
		maxPdfUploadBytes: env.PDF_UPLOAD_MAX_BYTES,
		maxRecipesPerImport: 100,
		maxStickersPerRun: 500,
		allowedQrHosts: env.ALLOWED_QR_HOSTS.split(",")
			.map((host) => host.trim().toLowerCase())
			.filter(Boolean),
		offlineMutations: false as const,
	};
}
