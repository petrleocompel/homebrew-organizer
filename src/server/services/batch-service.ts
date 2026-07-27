import {
	and,
	asc,
	desc,
	eq,
	gt,
	inArray,
	isNull,
	max,
	notInArray,
	or,
	sql,
} from "drizzle-orm";
import type {
	BatchMeasurementDto,
	BatchSummary,
} from "@/server/contracts/dtos";
import { db } from "@/server/db";
import {
	type BatchStatus,
	type BatchVisibility,
	batchEvents,
	batches,
	batchMeasurements,
	bottleFills,
	bottlePublicCodes,
	bottles,
	type EventSource,
	recipeRevisions,
} from "@/server/db/schema";
import { DomainError } from "@/server/domain";

const ASSIGNABLE_STATUSES: BatchStatus[] = [
	"brewing",
	"fermenting",
	"packaging",
	"conditioning",
	"ready",
];

function toSummary(batch: typeof batches.$inferSelect): BatchSummary {
	return {
		id: batch.id,
		batchNumber: batch.batchNumber,
		name: batch.name,
		publicName: batch.publicName ?? batch.name,
		status: batch.status,
		visibility: batch.visibility,
		style: batch.styleName,
		abv: batch.abv ? Number(batch.abv) : null,
		assignable: ASSIGNABLE_STATUSES.includes(batch.status),
	};
}

export async function listBatches(input?: {
	assignable?: boolean;
	cursor?: string | null;
	limit?: number;
}) {
	const limit = Math.min(Math.max(input?.limit ?? 50, 1), 100);
	const cursorNumber = input?.cursor ? Number(input.cursor) : null;
	if (input?.cursor && !Number.isSafeInteger(cursorNumber)) {
		throw new DomainError(
			"VALIDATION_FAILED",
			"Invalid pagination cursor.",
			400,
		);
	}

	const conditions = [];
	if (input?.assignable) {
		conditions.push(inArray(batches.status, ASSIGNABLE_STATUSES));
	} else {
		conditions.push(notInArray(batches.status, ["archived"]));
	}
	if (cursorNumber !== null) {
		conditions.push(gt(batches.batchNumber, cursorNumber));
	}

	const rows = await db
		.select()
		.from(batches)
		.where(and(...conditions))
		.orderBy(asc(batches.batchNumber))
		.limit(limit + 1);
	const hasMore = rows.length > limit;
	const page = hasMore ? rows.slice(0, limit) : rows;
	return {
		items: page.map(toSummary),
		nextCursor: hasMore ? String(page.at(-1)?.batchNumber) : null,
	};
}

export async function listPrivateBatches() {
	return db
		.select()
		.from(batches)
		.where(notInArray(batches.status, ["archived"]))
		.orderBy(desc(batches.batchNumber));
}

export async function listPublicBatches() {
	const rows = await db
		.select()
		.from(batches)
		.where(
			and(
				eq(batches.visibility, "listed"),
				notInArray(batches.status, ["archived"]),
			),
		)
		.orderBy(desc(batches.batchNumber));
	return rows.map((batch) => ({
		batchNumber: batch.batchNumber,
		publicName: batch.publicName ?? batch.name,
		publicDescription: batch.publicDescription ?? batch.description,
		status: batch.status,
		style: batch.styleName,
		abv: batch.abv ? Number(batch.abv) : null,
	}));
}

export async function getBatch(id: string) {
	const [batch] = await db
		.select()
		.from(batches)
		.where(eq(batches.id, id))
		.limit(1);
	return batch ?? null;
}

export async function getPublicBatch(id: string) {
	const numericLocator = Number(id);
	const locatorCondition = Number.isSafeInteger(numericLocator)
		? or(eq(batches.batchNumber, numericLocator), eq(batches.id, id))
		: eq(batches.id, id);
	const [batch] = await db
		.select()
		.from(batches)
		.where(
			and(
				locatorCondition,
				eq(batches.visibility, "listed"),
				notInArray(batches.status, ["archived"]),
			),
		)
		.limit(1);
	if (!batch) return null;

	const fillRows = await db
		.select({
			bottleNumber: bottles.bottleNumber,
			displayName: bottles.displayName,
			publicCode: bottlePublicCodes.code,
			status: bottleFills.status,
			filledAt: bottleFills.filledAt,
			expectedReadyAt: bottleFills.expectedReadyAt,
			readyAt: bottleFills.readyAt,
			emptiedAt: bottleFills.emptiedAt,
		})
		.from(bottleFills)
		.innerJoin(bottles, eq(bottles.id, bottleFills.bottleId))
		.innerJoin(
			bottlePublicCodes,
			and(
				eq(bottlePublicCodes.bottleId, bottles.id),
				isNull(bottlePublicCodes.revokedAt),
			),
		)
		.where(eq(bottleFills.batchId, batch.id))
		.orderBy(asc(bottles.bottleNumber), desc(bottleFills.filledAt));

	return {
		batchNumber: batch.batchNumber,
		publicName: batch.publicName ?? batch.name,
		publicDescription: batch.publicDescription ?? batch.description,
		status: batch.status,
		style: batch.styleName,
		abv: batch.abv ? Number(batch.abv) : null,
		brewedAt: batch.brewedAt?.toISOString() ?? null,
		packagedAt: batch.packagedAt?.toISOString() ?? null,
		readyAt: batch.readyAt?.toISOString() ?? null,
		bottles: fillRows.map((row) => ({
			...row,
			filledAt: row.filledAt.toISOString(),
			expectedReadyAt: row.expectedReadyAt?.toISOString() ?? null,
			readyAt: row.readyAt?.toISOString() ?? null,
			emptiedAt: row.emptiedAt?.toISOString() ?? null,
		})),
	};
}

export interface BatchInput {
	batchNumber?: number;
	name: string;
	publicName?: string | null;
	description?: string;
	publicDescription?: string | null;
	privateNotes?: string | null;
	status?: BatchStatus;
	visibility?: BatchVisibility;
	recipeRevisionId?: string | null;
	plannedAt?: Date | null;
	brewedAt?: Date | null;
	fermentationStartedAt?: Date | null;
	packagedAt?: Date | null;
	readyAt?: Date | null;
	completedAt?: Date | null;
	targetVolumeMl?: number | null;
	actualVolumeMl?: number | null;
	styleName?: string | null;
	abv?: number | null;
}

export async function createBatch(
	input: BatchInput,
	actorUserId: string,
	source: EventSource = "web",
) {
	return db.transaction(async (tx) => {
		if (!input.recipeRevisionId) {
			throw new DomainError(
				"VALIDATION_FAILED",
				"A new batch must reference an immutable recipe revision.",
				422,
			);
		}
		const [recipeRevision] = await tx
			.select({ id: recipeRevisions.id })
			.from(recipeRevisions)
			.where(eq(recipeRevisions.id, input.recipeRevisionId))
			.limit(1);
		if (!recipeRevision) {
			throw new DomainError(
				"VALIDATION_FAILED",
				"The selected recipe revision does not exist.",
				422,
			);
		}
		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtext('homebrew:batch-number'))`,
		);
		const maximumRows = await tx
			.select({ maximum: max(batches.batchNumber) })
			.from(batches);
		const maximum = maximumRows[0]?.maximum;
		const batchNumber = input.batchNumber ?? (maximum ?? 0) + 1;
		const [batch] = await tx
			.insert(batches)
			.values({
				batchNumber,
				name: input.name,
				publicName: input.publicName ?? input.name,
				description: input.description ?? "",
				publicDescription: input.publicDescription ?? input.description ?? "",
				note: input.privateNotes ?? "",
				privateNotes: input.privateNotes,
				status: input.status ?? "planning",
				visibility: input.visibility ?? "unlisted",
				recipeRevisionId: input.recipeRevisionId,
				plannedAt: input.plannedAt ?? new Date(),
				brewedAt: input.brewedAt,
				fermentationStartedAt: input.fermentationStartedAt,
				packagedAt: input.packagedAt,
				readyAt: input.readyAt,
				completedAt: input.completedAt,
				targetVolumeMl: input.targetVolumeMl,
				actualVolumeMl: input.actualVolumeMl,
				styleName: input.styleName,
				abv: input.abv?.toString(),
			})
			.returning();
		if (!batch) throw new Error("Batch insert returned no row.");
		await tx.insert(batchEvents).values({
			batchId: batch.id,
			eventType: "batch_created",
			actorUserId,
			source,
			metadata: { status: batch.status, visibility: batch.visibility },
		});
		return batch;
	});
}

export async function updateBatch(
	id: string,
	input: BatchInput,
	actorUserId: string,
	source: EventSource = "web",
) {
	return db.transaction(async (tx) => {
		const [previous] = await tx
			.select()
			.from(batches)
			.where(eq(batches.id, id))
			.limit(1)
			.for("update");
		if (!previous) throw new DomainError("NOT_FOUND", "Batch not found.", 404);

		const [batch] = await tx
			.update(batches)
			.set({
				...(input.batchNumber === undefined
					? {}
					: { batchNumber: input.batchNumber }),
				name: input.name,
				publicName: input.publicName,
				description: input.description,
				publicDescription: input.publicDescription,
				...(input.privateNotes === undefined
					? {}
					: { note: input.privateNotes ?? "" }),
				privateNotes: input.privateNotes,
				status: input.status,
				visibility: input.visibility,
				plannedAt: input.plannedAt,
				brewedAt: input.brewedAt,
				fermentationStartedAt: input.fermentationStartedAt,
				packagedAt: input.packagedAt,
				readyAt: input.readyAt,
				completedAt: input.completedAt,
				targetVolumeMl: input.targetVolumeMl,
				actualVolumeMl: input.actualVolumeMl,
				styleName: input.styleName,
				abv: input.abv === undefined ? undefined : input.abv?.toString(),
			})
			.where(eq(batches.id, id))
			.returning();
		if (!batch) throw new Error("Batch update returned no row.");
		await tx.insert(batchEvents).values({
			batchId: batch.id,
			eventType:
				previous.status === batch.status ? "batch_updated" : "status_changed",
			actorUserId,
			source,
			metadata: {
				previousStatus: previous.status,
				status: batch.status,
				visibility: batch.visibility,
			},
		});
		return batch;
	});
}

export async function archiveBatch(
	id: string,
	actorUserId: string,
	source: EventSource = "web",
) {
	const current = await getBatch(id);
	if (!current) throw new DomainError("NOT_FOUND", "Batch not found.", 404);
	return updateBatch(
		id,
		{
			...current,
			abv: current.abv ? Number(current.abv) : null,
			status: "archived",
		},
		actorUserId,
		source,
	);
}

function normalizeMeasurement(
	kind: "gravity" | "temperature" | "ph" | "volume",
	value: number,
	unit: string,
): { value: number; unit: string } {
	const normalizedUnit = unit.trim().toLowerCase();
	if (!Number.isFinite(value)) {
		throw new DomainError(
			"VALIDATION_FAILED",
			"Measurement must be finite.",
			400,
		);
	}
	switch (kind) {
		case "temperature":
			if (normalizedUnit === "c" || normalizedUnit === "°c") {
				return { value, unit: "C" };
			}
			if (normalizedUnit === "f" || normalizedUnit === "°f") {
				return { value: ((value - 32) * 5) / 9, unit: "C" };
			}
			break;
		case "volume":
			if (normalizedUnit === "ml") return { value, unit: "ml" };
			if (normalizedUnit === "l") return { value: value * 1000, unit: "ml" };
			if (normalizedUnit === "gal" || normalizedUnit === "us gal") {
				return { value: value * 3785.411784, unit: "ml" };
			}
			break;
		case "gravity":
			if (normalizedUnit === "sg") return { value, unit: "sg" };
			if (normalizedUnit === "plato" || normalizedUnit === "°p") {
				return {
					value: 1 + value / (258.6 - (value / 258.2) * 227.1),
					unit: "sg",
				};
			}
			break;
		case "ph":
			if (normalizedUnit === "ph" || normalizedUnit === "") {
				return { value, unit: "pH" };
			}
			break;
	}
	throw new DomainError(
		"VALIDATION_FAILED",
		"Unsupported measurement unit.",
		400,
		{ kind, unit },
	);
}

export async function addBatchMeasurement(input: {
	batchId: string;
	kind: "gravity" | "temperature" | "ph" | "volume";
	value: number;
	unit: string;
	measuredAt?: Date;
	note?: string | null;
	actorUserId: string;
	source?: EventSource;
}): Promise<BatchMeasurementDto> {
	const normalized = normalizeMeasurement(input.kind, input.value, input.unit);
	return db.transaction(async (tx) => {
		const [batch] = await tx
			.select({ id: batches.id })
			.from(batches)
			.where(eq(batches.id, input.batchId))
			.limit(1);
		if (!batch) throw new DomainError("NOT_FOUND", "Batch not found.", 404);
		const measuredAt = input.measuredAt ?? new Date();
		const [measurement] = await tx
			.insert(batchMeasurements)
			.values({
				batchId: input.batchId,
				kind: input.kind,
				originalValue: input.value.toString(),
				originalUnit: input.unit,
				normalizedValue: normalized.value.toString(),
				normalizedUnit: normalized.unit,
				measuredAt,
				actorUserId: input.actorUserId,
				note: input.note,
			})
			.returning();
		if (!measurement) throw new Error("Measurement insert returned no row.");
		await tx.insert(batchEvents).values({
			batchId: input.batchId,
			eventType: "measurement_recorded",
			actorUserId: input.actorUserId,
			source: input.source ?? "web",
			metadata: { kind: input.kind },
		});
		return {
			id: measurement.id,
			batchId: measurement.batchId,
			kind: measurement.kind,
			originalValue: Number(measurement.originalValue),
			originalUnit: measurement.originalUnit,
			normalizedValue: Number(measurement.normalizedValue),
			normalizedUnit: measurement.normalizedUnit,
			measuredAt: measurement.measuredAt.toISOString(),
			note: measurement.note,
		};
	});
}

export async function listBatchMeasurements(
	batchId: string,
): Promise<BatchMeasurementDto[]> {
	const rows = await db
		.select()
		.from(batchMeasurements)
		.where(eq(batchMeasurements.batchId, batchId))
		.orderBy(desc(batchMeasurements.measuredAt));
	return rows.map((row) => ({
		id: row.id,
		batchId: row.batchId,
		kind: row.kind,
		originalValue: Number(row.originalValue),
		originalUnit: row.originalUnit,
		normalizedValue: Number(row.normalizedValue),
		normalizedUnit: row.normalizedUnit,
		measuredAt: row.measuredAt.toISOString(),
		note: row.note,
	}));
}
