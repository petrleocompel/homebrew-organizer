import {
	and,
	asc,
	count,
	desc,
	eq,
	inArray,
	isNull,
	max,
	sql,
} from "drizzle-orm";
import type {
	AuthenticatedBottle,
	AuthenticatedFill,
	FillMutationResult,
	PublicBottle,
	PublicFillSummary,
} from "@/server/contracts/dtos";
import { db } from "@/server/db";
import {
	batchBottles,
	batches,
	bottleAliases,
	bottleEvents,
	bottleFills,
	bottlePublicCodes,
	bottles,
	type EventSource,
	printRunItems,
	printRuns,
} from "@/server/db/schema";
import {
	type DbTransaction,
	DomainError,
	generatePublicCode,
	isPublicCode,
	shortPublicCode,
} from "@/server/domain";

type Executor = typeof db | DbTransaction;

export interface BottleCreateInput {
	bottleNumber: number;
	displayName?: string | null;
	volumeMl?: number;
	color?: string | null;
	closureType?: string | null;
	location?: string | null;
	privateNotes?: string | null;
	legacyLabel?: string | null;
	legacyStatus?: "empty" | "filled" | "conditioning" | "ready";
}

export interface FillCreateInput {
	bottleId: string;
	batchId: string;
	status?: "filled" | "conditioning" | "ready";
	filledAt?: Date;
	expectedReadyAt?: Date | null;
	privateNotes?: string | null;
}

function iso(value: Date | null | undefined): string | null {
	return value ? value.toISOString() : null;
}

function bottleState(
	retiredAt: Date | null,
	activeFill: unknown | null,
): "available" | "in_use" | "retired" {
	if (retiredAt) return "retired";
	return activeFill ? "in_use" : "available";
}

function toPublicFill(row: {
	fill: typeof bottleFills.$inferSelect;
	batch: typeof batches.$inferSelect;
}): PublicFillSummary {
	const publicBeer = row.batch.visibility !== "private";
	return {
		beerName: publicBeer ? (row.batch.publicName ?? row.batch.name) : null,
		batchNumber: publicBeer ? row.batch.batchNumber : null,
		style: publicBeer ? row.batch.styleName : null,
		abv: publicBeer && row.batch.abv ? Number(row.batch.abv) : null,
		status: row.fill.status,
		filledAt: row.fill.filledAt.toISOString(),
		expectedReadyAt: iso(row.fill.expectedReadyAt),
		readyAt: iso(row.fill.readyAt),
		emptiedAt: iso(row.fill.emptiedAt),
		...(row.fill.historyApproximate ? { historyApproximate: true } : {}),
	};
}

function toAuthenticatedFill(row: {
	fill: typeof bottleFills.$inferSelect;
	batch: typeof batches.$inferSelect;
}): AuthenticatedFill {
	return {
		id: row.fill.id,
		batchId: row.batch.id,
		batchNumber: row.batch.batchNumber,
		beerName: row.batch.publicName ?? row.batch.name,
		status: row.fill.status,
		filledAt: row.fill.filledAt.toISOString(),
		expectedReadyAt: iso(row.fill.expectedReadyAt),
		readyAt: iso(row.fill.readyAt),
		emptiedAt: iso(row.fill.emptiedAt),
		privateNotes: row.fill.privateNotes,
		historyApproximate: row.fill.historyApproximate,
	};
}

async function unusedPublicCodes(
	executor: Executor,
	count: number,
): Promise<string[]> {
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const candidates = [
			...new Set(Array.from({ length: count }, () => generatePublicCode())),
		];
		if (candidates.length !== count) continue;
		const existing = await executor
			.select({ code: bottlePublicCodes.code })
			.from(bottlePublicCodes)
			.where(inArray(bottlePublicCodes.code, candidates));
		if (existing.length === 0) return candidates;
	}
	throw new DomainError(
		"CONFLICT",
		"Unable to allocate unique public bottle identities.",
		409,
	);
}

export async function createBottles(
	inputs: BottleCreateInput[],
	actorUserId: string,
	source: EventSource = "web",
) {
	validateBottleCreateInputs(inputs);
	return db.transaction((tx) =>
		createBottlesTx(tx, inputs, actorUserId, source),
	);
}

function validateBottleCreateInputs(inputs: BottleCreateInput[]) {
	if (inputs.length === 0 || inputs.length > 500) {
		throw new DomainError(
			"VALIDATION_FAILED",
			"Create between 1 and 500 bottles at a time.",
			400,
		);
	}
	const numbers = inputs.map((input) => input.bottleNumber);
	if (
		numbers.some((number) => !Number.isSafeInteger(number) || number < 1) ||
		new Set(numbers).size !== numbers.length
	) {
		throw new DomainError(
			"VALIDATION_FAILED",
			"Bottle numbers must be unique positive integers.",
			422,
		);
	}
	for (const input of inputs) {
		const volumeMl = input.volumeMl ?? 500;
		if (!Number.isSafeInteger(volumeMl) || volumeMl < 1 || volumeMl > 100_000) {
			throw new DomainError(
				"VALIDATION_FAILED",
				"Bottle volume must be a positive whole number of millilitres.",
				422,
			);
		}
	}
}

async function createBottlesTx(
	tx: DbTransaction,
	inputs: BottleCreateInput[],
	actorUserId: string,
	source: EventSource,
) {
	const codes = await unusedPublicCodes(tx, inputs.length);
	const created: Array<typeof bottles.$inferSelect & { publicCode: string }> =
		[];

	for (const [index, input] of inputs.entries()) {
		const publicCode = codes[index];
		if (!publicCode) throw new Error("Missing generated public code.");

		const [bottle] = await tx
			.insert(bottles)
			.values({
				bottleNumber: input.bottleNumber,
				displayName: input.displayName,
				volumeMl: input.volumeMl ?? 500,
				color: input.color,
				closureType: input.closureType,
				location: input.location,
				privateNotes: input.privateNotes,
				label: input.legacyLabel,
				status: input.legacyStatus ?? "empty",
			})
			.returning();
		if (!bottle) throw new Error("Bottle insert returned no row.");

		await tx.insert(bottlePublicCodes).values({
			bottleId: bottle.id,
			code: publicCode,
			issuedBy: actorUserId,
		});
		await tx.insert(bottleAliases).values({
			bottleId: bottle.id,
			locator: String(bottle.bottleNumber),
			kind: "numeric",
		});
		if (input.legacyLabel?.trim()) {
			await tx
				.insert(bottleAliases)
				.values({
					bottleId: bottle.id,
					locator: input.legacyLabel.trim(),
					kind: /^[0-9a-f-]{36}$/i.test(input.legacyLabel)
						? "old_uuid"
						: "old_label",
				})
				.onConflictDoNothing();
		}
		await tx.insert(bottleEvents).values({
			bottleId: bottle.id,
			eventType: "bottle_created",
			actorUserId,
			source,
			visibility: "private",
			metadata: { bottleNumber: bottle.bottleNumber },
		});
		created.push({ ...bottle, publicCode });
	}
	return created;
}

export async function createServerAssignedBottleRange(input: {
	count: number;
	actorUserId: string;
	source?: EventSource;
	defaults?: Omit<BottleCreateInput, "bottleNumber">;
}) {
	if (!Number.isInteger(input.count) || input.count < 1 || input.count > 500) {
		throw new DomainError(
			"VALIDATION_FAILED",
			"Range size must be between 1 and 500.",
			400,
		);
	}

	return db.transaction(async (tx) => {
		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtext('homebrew:bottle-number-range'))`,
		);
		const maximumRows = await tx
			.select({ maximum: max(bottles.bottleNumber) })
			.from(bottles);
		const maximum = maximumRows[0]?.maximum;
		const start = (maximum ?? 0) + 1;
		const values = Array.from({ length: input.count }, (_, index) => ({
			...input.defaults,
			bottleNumber: start + index,
		}));
		validateBottleCreateInputs(values);
		return createBottlesTx(
			tx,
			values,
			input.actorUserId,
			input.source ?? "web",
		);
	});
}

async function fillRowsForBottle(executor: Executor, bottleId: string) {
	return executor
		.select({ fill: bottleFills, batch: batches })
		.from(bottleFills)
		.innerJoin(batches, eq(batches.id, bottleFills.batchId))
		.where(eq(bottleFills.bottleId, bottleId))
		.orderBy(desc(bottleFills.filledAt));
}

export async function getPublicBottleByCode(
	code: string,
): Promise<PublicBottle | null> {
	if (!isPublicCode(code)) return null;
	const [identity] = await db
		.select({ bottle: bottles })
		.from(bottlePublicCodes)
		.innerJoin(bottles, eq(bottles.id, bottlePublicCodes.bottleId))
		.where(
			and(
				eq(bottlePublicCodes.code, code),
				isNull(bottlePublicCodes.revokedAt),
			),
		)
		.limit(1);
	if (!identity) return null;

	const rows = await fillRowsForBottle(db, identity.bottle.id);
	const publicRows = rows.filter((row) => row.batch.visibility !== "private");
	const active = rows.find((row) => row.fill.emptiedAt === null) ?? null;
	const current = active ? toPublicFill(active) : null;

	return {
		bottleNumber: identity.bottle.bottleNumber,
		displayName: identity.bottle.displayName,
		state: bottleState(identity.bottle.retiredAt, active),
		currentFill: current,
		timeline: publicRows.map(toPublicFill),
		serverTimestamp: new Date().toISOString(),
	};
}

export async function getCanonicalCodeForLegacyLocator(
	locator: string,
): Promise<string | null> {
	if (!locator || locator.length > 255) return null;
	const [row] = await db
		.select({ code: bottlePublicCodes.code })
		.from(bottleAliases)
		.innerJoin(
			bottlePublicCodes,
			and(
				eq(bottlePublicCodes.bottleId, bottleAliases.bottleId),
				isNull(bottlePublicCodes.revokedAt),
			),
		)
		.where(eq(bottleAliases.locator, locator))
		.limit(1);
	return row?.code ?? null;
}

export async function getAuthenticatedBottleByCode(
	code: string,
): Promise<AuthenticatedBottle | null> {
	if (!isPublicCode(code)) return null;
	const [identity] = await db
		.select({ bottle: bottles, publicCode: bottlePublicCodes.code })
		.from(bottlePublicCodes)
		.innerJoin(bottles, eq(bottles.id, bottlePublicCodes.bottleId))
		.where(
			and(
				eq(bottlePublicCodes.code, code),
				isNull(bottlePublicCodes.revokedAt),
			),
		)
		.limit(1);
	if (!identity) return null;
	return getAuthenticatedBottle(identity.bottle.id);
}

export async function getAuthenticatedBottle(
	bottleId: string,
): Promise<AuthenticatedBottle | null> {
	const [identity] = await db
		.select({ bottle: bottles, publicCode: bottlePublicCodes.code })
		.from(bottles)
		.innerJoin(
			bottlePublicCodes,
			and(
				eq(bottlePublicCodes.bottleId, bottles.id),
				isNull(bottlePublicCodes.revokedAt),
			),
		)
		.where(eq(bottles.id, bottleId))
		.limit(1);
	if (!identity) return null;

	const [rows, events] = await Promise.all([
		fillRowsForBottle(db, bottleId),
		db
			.select()
			.from(bottleEvents)
			.where(eq(bottleEvents.bottleId, bottleId))
			.orderBy(desc(bottleEvents.occurredAt)),
	]);
	const fills = rows.map(toAuthenticatedFill);
	const currentFill = fills.find((fill) => !fill.emptiedAt) ?? null;

	return {
		id: identity.bottle.id,
		bottleNumber: identity.bottle.bottleNumber,
		displayName: identity.bottle.displayName,
		volumeMl: identity.bottle.volumeMl,
		color: identity.bottle.color,
		closureType: identity.bottle.closureType,
		location: identity.bottle.location,
		privateNotes: identity.bottle.privateNotes,
		retiredAt: iso(identity.bottle.retiredAt),
		state: bottleState(identity.bottle.retiredAt, currentFill),
		publicCode: identity.publicCode,
		currentFill,
		fills,
		events: events.map((event) => ({
			id: event.id,
			type: event.eventType,
			fillId: event.fillId,
			batchId: event.batchId,
			actorUserId: event.actorUserId,
			source: event.source,
			visibility: event.visibility,
			timestamp: event.occurredAt.toISOString(),
			metadata: event.metadata,
		})),
		serverTimestamp: new Date().toISOString(),
	};
}

export async function listBottlesForAdmin() {
	const [rows, printedRows] = await Promise.all([
		db
			.select({
				bottle: bottles,
				fill: bottleFills,
				batch: batches,
				publicCode: bottlePublicCodes.code,
			})
			.from(bottles)
			.leftJoin(
				bottleFills,
				and(
					eq(bottleFills.bottleId, bottles.id),
					isNull(bottleFills.emptiedAt),
				),
			)
			.leftJoin(batches, eq(batches.id, bottleFills.batchId))
			.leftJoin(
				bottlePublicCodes,
				and(
					eq(bottlePublicCodes.bottleId, bottles.id),
					isNull(bottlePublicCodes.revokedAt),
				),
			)
			.orderBy(asc(bottles.bottleNumber)),
		db
			.select({
				bottleId: printRunItems.bottleId,
				printCount: count(),
				lastPrintedAt: max(printRuns.createdAt),
			})
			.from(printRunItems)
			.innerJoin(printRuns, eq(printRuns.id, printRunItems.printRunId))
			.groupBy(printRunItems.bottleId),
	]);
	const printMap = new Map(
		printedRows.map((row) => [row.bottleId, row] as const),
	);

	return rows.map(({ bottle, fill, batch, publicCode }) => ({
		...bottle,
		status: (fill?.status ?? "empty") as
			| "empty"
			| "filled"
			| "conditioning"
			| "ready",
		currentBatchId: fill?.batchId ?? null,
		currentBatchName: batch?.publicName ?? batch?.name ?? null,
		state: bottleState(bottle.retiredAt, fill),
		publicCode: publicCode ?? null,
		shortPublicCode: publicCode ? shortPublicCode(publicCode) : null,
		printCount: printMap.get(bottle.id)?.printCount ?? 0,
		lastPrintedAt: printMap.get(bottle.id)?.lastPrintedAt ?? null,
	}));
}

export async function listBottlesByBatch(batchId: string) {
	const rows = await db
		.select({
			bottle: bottles,
			fill: bottleFills,
			publicCode: bottlePublicCodes.code,
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
		.where(and(eq(bottleFills.batchId, batchId), isNull(bottleFills.emptiedAt)))
		.orderBy(asc(bottles.bottleNumber));
	return rows.map(({ bottle, fill, publicCode }) => ({
		...bottle,
		status: fill.status,
		currentBatchId: fill.batchId,
		fillId: fill.id,
		publicCode,
	}));
}

async function assignFillTx(
	tx: DbTransaction,
	input: FillCreateInput,
	actorUserId: string,
	source: EventSource,
): Promise<FillMutationResult> {
	const [bottle] = await tx
		.select()
		.from(bottles)
		.where(eq(bottles.id, input.bottleId))
		.limit(1)
		.for("update");
	if (!bottle) {
		throw new DomainError("NOT_FOUND", "Bottle not found.", 404);
	}
	if (bottle.retiredAt) {
		throw new DomainError("BOTTLE_RETIRED", "Bottle is retired.", 409);
	}

	const [batch] = await tx
		.select()
		.from(batches)
		.where(eq(batches.id, input.batchId))
		.limit(1);
	if (!batch || batch.status === "archived") {
		throw new DomainError("NOT_FOUND", "Assignable batch not found.", 404);
	}

	const [active] = await tx
		.select()
		.from(bottleFills)
		.where(
			and(eq(bottleFills.bottleId, bottle.id), isNull(bottleFills.emptiedAt)),
		)
		.limit(1)
		.for("update");
	if (active) {
		throw new DomainError(
			"BOTTLE_ALREADY_FILLED",
			"Bottle already has an active fill.",
			409,
			{ activeFillId: active.id, activeBatchId: active.batchId },
		);
	}

	const fillStatus = input.status ?? "conditioning";
	const filledAt = input.filledAt ?? new Date();
	const [fill] = await tx
		.insert(bottleFills)
		.values({
			bottleId: bottle.id,
			batchId: batch.id,
			status: fillStatus,
			filledAt,
			expectedReadyAt: input.expectedReadyAt,
			readyAt: fillStatus === "ready" ? filledAt : null,
			privateNotes: input.privateNotes,
			source,
			createdBy: actorUserId,
		})
		.returning();
	if (!fill) throw new Error("Fill insert returned no row.");

	await tx
		.update(bottles)
		.set({ currentBatchId: batch.id, status: fillStatus })
		.where(eq(bottles.id, bottle.id));
	await tx.insert(batchBottles).values({
		bottleId: bottle.id,
		batchId: batch.id,
	});
	await tx.insert(bottleEvents).values({
		bottleId: bottle.id,
		fillId: fill.id,
		batchId: batch.id,
		eventType: "bottle_filled",
		actorUserId,
		source,
		visibility: batch.visibility === "private" ? "private" : "public",
		metadata: { status: fillStatus },
	});

	return {
		bottleId: bottle.id,
		bottleNumber: bottle.bottleNumber,
		bottleState: "in_use",
		fill: toAuthenticatedFill({ fill, batch }),
		serverTimestamp: new Date().toISOString(),
	};
}

export async function assignFill(
	tx: DbTransaction,
	input: FillCreateInput,
	actorUserId: string,
	source: EventSource,
) {
	return assignFillTx(tx, input, actorUserId, source);
}

export async function transitionFill(
	tx: DbTransaction,
	input: { fillId: string; status: "conditioning" | "ready"; at?: Date },
	actorUserId: string,
	source: EventSource,
): Promise<FillMutationResult> {
	const [row] = await tx
		.select({ fill: bottleFills, bottle: bottles, batch: batches })
		.from(bottleFills)
		.innerJoin(bottles, eq(bottles.id, bottleFills.bottleId))
		.innerJoin(batches, eq(batches.id, bottleFills.batchId))
		.where(eq(bottleFills.id, input.fillId))
		.limit(1)
		.for("update");
	if (!row) throw new DomainError("NOT_FOUND", "Fill not found.", 404);
	if (row.fill.emptiedAt || row.fill.status === "emptied") {
		throw new DomainError(
			"FILL_ALREADY_EMPTIED",
			"An emptied fill cannot transition.",
			409,
		);
	}

	const allowed =
		(row.fill.status === "filled" &&
			(input.status === "conditioning" || input.status === "ready")) ||
		(row.fill.status === "conditioning" && input.status === "ready");
	if (!allowed) {
		throw new DomainError(
			"INVALID_FILL_TRANSITION",
			"Fill status transition is not allowed.",
			409,
			{ from: row.fill.status, to: input.status },
		);
	}

	const at = input.at ?? new Date();
	const [fill] = await tx
		.update(bottleFills)
		.set({
			status: input.status,
			readyAt: input.status === "ready" ? at : row.fill.readyAt,
		})
		.where(eq(bottleFills.id, row.fill.id))
		.returning();
	if (!fill) throw new Error("Fill update returned no row.");
	await tx
		.update(bottles)
		.set({ status: input.status })
		.where(eq(bottles.id, row.bottle.id));
	await tx.insert(bottleEvents).values({
		bottleId: row.bottle.id,
		fillId: row.fill.id,
		batchId: row.batch.id,
		eventType:
			input.status === "ready" ? "fill_marked_ready" : "fill_conditioning",
		actorUserId,
		source,
		visibility: row.batch.visibility === "private" ? "private" : "public",
		metadata: { from: row.fill.status, to: input.status },
		occurredAt: at,
	});

	return {
		bottleId: row.bottle.id,
		bottleNumber: row.bottle.bottleNumber,
		bottleState: "in_use",
		fill: toAuthenticatedFill({ fill, batch: row.batch }),
		serverTimestamp: new Date().toISOString(),
	};
}

async function emptyFillTx(
	tx: DbTransaction,
	input: { fillId: string; emptiedAt?: Date },
	actorUserId: string,
	source: EventSource,
): Promise<FillMutationResult> {
	const [row] = await tx
		.select({ fill: bottleFills, bottle: bottles, batch: batches })
		.from(bottleFills)
		.innerJoin(bottles, eq(bottles.id, bottleFills.bottleId))
		.innerJoin(batches, eq(batches.id, bottleFills.batchId))
		.where(eq(bottleFills.id, input.fillId))
		.limit(1)
		.for("update");
	if (!row) throw new DomainError("NOT_FOUND", "Fill not found.", 404);
	if (row.fill.emptiedAt) {
		throw new DomainError(
			"FILL_ALREADY_EMPTIED",
			"Fill is already emptied.",
			409,
		);
	}

	const emptiedAt = input.emptiedAt ?? new Date();
	const [fill] = await tx
		.update(bottleFills)
		.set({ status: "emptied", emptiedAt })
		.where(eq(bottleFills.id, row.fill.id))
		.returning();
	if (!fill) throw new Error("Fill update returned no row.");
	await tx
		.update(bottles)
		.set({ status: "empty", currentBatchId: null })
		.where(eq(bottles.id, row.bottle.id));
	await tx.insert(bottleEvents).values({
		bottleId: row.bottle.id,
		fillId: row.fill.id,
		batchId: row.batch.id,
		eventType: "fill_emptied",
		actorUserId,
		source,
		visibility: row.batch.visibility === "private" ? "private" : "public",
		metadata: {},
		occurredAt: emptiedAt,
	});

	return {
		bottleId: row.bottle.id,
		bottleNumber: row.bottle.bottleNumber,
		bottleState: row.bottle.retiredAt ? "retired" : "available",
		fill: toAuthenticatedFill({ fill, batch: row.batch }),
		serverTimestamp: new Date().toISOString(),
	};
}

export async function emptyFill(
	tx: DbTransaction,
	input: { fillId: string; emptiedAt?: Date },
	actorUserId: string,
	source: EventSource,
) {
	return emptyFillTx(tx, input, actorUserId, source);
}

export async function reassignBottle(
	tx: DbTransaction,
	input: FillCreateInput & { emptiedAt?: Date },
	actorUserId: string,
	source: EventSource,
) {
	const [active] = await tx
		.select()
		.from(bottleFills)
		.where(
			and(
				eq(bottleFills.bottleId, input.bottleId),
				isNull(bottleFills.emptiedAt),
			),
		)
		.limit(1)
		.for("update");
	if (active) {
		await emptyFillTx(
			tx,
			{ fillId: active.id, emptiedAt: input.emptiedAt },
			actorUserId,
			source,
		);
	}
	return assignFillTx(tx, input, actorUserId, source);
}

export async function retireBottle(input: {
	bottleId: string;
	actorUserId: string;
	source: EventSource;
	retired: boolean;
}) {
	return db.transaction(async (tx) => {
		const [bottle] = await tx
			.select()
			.from(bottles)
			.where(eq(bottles.id, input.bottleId))
			.limit(1)
			.for("update");
		if (!bottle) throw new DomainError("NOT_FOUND", "Bottle not found.", 404);
		const retiredAt = input.retired ? new Date() : null;
		await tx
			.update(bottles)
			.set({ retiredAt })
			.where(eq(bottles.id, bottle.id));
		await tx.insert(bottleEvents).values({
			bottleId: bottle.id,
			eventType: input.retired ? "bottle_retired" : "bottle_restored",
			actorUserId: input.actorUserId,
			source: input.source,
			visibility: "public",
			metadata: {},
		});
		return { ...bottle, retiredAt };
	});
}

export async function updateBottlePhysical(input: {
	bottleId: string;
	actorUserId: string;
	source: EventSource;
	bottleNumber?: number;
	displayName?: string | null;
	volumeMl?: number;
	color?: string | null;
	closureType?: string | null;
	location?: string | null;
	privateNotes?: string | null;
	legacyLabel?: string | null;
}) {
	return db.transaction(async (tx) => {
		const [current] = await tx
			.select()
			.from(bottles)
			.where(eq(bottles.id, input.bottleId))
			.limit(1)
			.for("update");
		if (!current) throw new DomainError("NOT_FOUND", "Bottle not found.", 404);
		const [bottle] = await tx
			.update(bottles)
			.set({
				bottleNumber: input.bottleNumber,
				displayName: input.displayName,
				volumeMl: input.volumeMl,
				color: input.color,
				closureType: input.closureType,
				location: input.location,
				privateNotes: input.privateNotes,
				label: input.legacyLabel,
			})
			.where(eq(bottles.id, input.bottleId))
			.returning();
		if (!bottle) throw new Error("Bottle update returned no row.");
		if (
			input.bottleNumber !== undefined &&
			input.bottleNumber !== current.bottleNumber
		) {
			await tx
				.insert(bottleAliases)
				.values({
					bottleId: bottle.id,
					locator: String(input.bottleNumber),
					kind: "numeric",
				})
				.onConflictDoNothing();
		}
		await tx.insert(bottleEvents).values({
			bottleId: bottle.id,
			eventType: "bottle_updated",
			actorUserId: input.actorUserId,
			source: input.source,
			visibility: "private",
			metadata: {},
		});
		return bottle;
	});
}

export async function getActiveFillForBottle(bottleId: string) {
	const [fill] = await db
		.select()
		.from(bottleFills)
		.where(
			and(eq(bottleFills.bottleId, bottleId), isNull(bottleFills.emptiedAt)),
		)
		.limit(1);
	return fill ?? null;
}

export async function rotateBottlePublicCode(input: {
	bottleId: string;
	actorUserId: string;
	source: EventSource;
}) {
	return db.transaction(async (tx) => {
		const [bottle] = await tx
			.select()
			.from(bottles)
			.where(eq(bottles.id, input.bottleId))
			.limit(1)
			.for("update");
		if (!bottle) throw new DomainError("NOT_FOUND", "Bottle not found.", 404);
		const [code] = await unusedPublicCodes(tx, 1);
		if (!code) throw new Error("Missing generated public code.");
		await tx
			.update(bottlePublicCodes)
			.set({ revokedAt: new Date() })
			.where(
				and(
					eq(bottlePublicCodes.bottleId, bottle.id),
					isNull(bottlePublicCodes.revokedAt),
				),
			);
		await tx.insert(bottlePublicCodes).values({
			bottleId: bottle.id,
			code,
			issuedBy: input.actorUserId,
		});
		await tx.insert(bottleEvents).values({
			bottleId: bottle.id,
			eventType: "qr_rotated",
			actorUserId: input.actorUserId,
			source: input.source,
			visibility: "private",
			metadata: {},
		});
		return { bottleId: bottle.id, publicCode: code };
	});
}
