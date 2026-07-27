import { createHash } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { idempotencyRequests } from "@/server/db/schema";
import { DomainError } from "./errors";

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function canonicalJson(value: unknown): string {
	if (value === null || typeof value !== "object") {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map(canonicalJson).join(",")}]`;
	}

	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
		.join(",")}}`;
}

export function requestHash(value: unknown): string {
	return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export interface IdempotentResult<T> {
	value: T;
	replayed: boolean;
	status: number;
}

export async function withIdempotency<T>(input: {
	actorUserId: string;
	operation: string;
	key: string;
	request: unknown;
	status?: number;
	execute: (tx: DbTransaction) => Promise<T>;
}): Promise<IdempotentResult<T>> {
	const hash = requestHash(input.request);
	const responseStatus = input.status ?? 200;

	return db.transaction(async (tx) => {
		// Serialize concurrent requests for the same logical operation so the
		// second request can replay the committed result instead of racing the
		// mutation and unique constraint.
		await tx.execute(
			sql`select pg_advisory_xact_lock(
				hashtextextended(${`${input.actorUserId}:${input.operation}:${input.key}`}, 0)
			)`,
		);
		await tx
			.delete(idempotencyRequests)
			.where(lt(idempotencyRequests.expiresAt, new Date()));

		const [existing] = await tx
			.select()
			.from(idempotencyRequests)
			.where(
				and(
					eq(idempotencyRequests.actorUserId, input.actorUserId),
					eq(idempotencyRequests.operation, input.operation),
					eq(idempotencyRequests.key, input.key),
				),
			)
			.limit(1)
			.for("update");

		if (existing) {
			if (existing.requestHash !== hash) {
				throw new DomainError(
					"IDEMPOTENCY_KEY_REUSED",
					"The idempotency key was already used with different input.",
					409,
				);
			}
			return {
				value: existing.responseBody as T,
				replayed: true,
				status: existing.responseStatus,
			};
		}

		const value = await input.execute(tx);
		await tx.insert(idempotencyRequests).values({
			actorUserId: input.actorUserId,
			operation: input.operation,
			key: input.key,
			requestHash: hash,
			responseStatus,
			responseBody: value,
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
		});

		return { value, replayed: false, status: responseStatus };
	});
}
