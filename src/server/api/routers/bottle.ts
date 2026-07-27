import { z } from "zod";
import {
	brewerProcedure,
	cellarProcedure,
	createTRPCRouter,
	viewerProcedure,
} from "@/server/api/trpc";
import { db } from "@/server/db";
import {
	assignFill,
	createBottles,
	createServerAssignedBottleRange,
	emptyFill,
	getActiveFillForBottle,
	getAuthenticatedBottle,
	listBottlesByBatch,
	listBottlesForAdmin,
	retireBottle,
	rotateBottlePublicCode,
	transitionFill,
	updateBottlePhysical,
} from "@/server/services/bottle-service";

const legacyStatus = z.enum(["empty", "filled", "conditioning", "ready"]);

export const bottleRouter = createTRPCRouter({
	getAll: viewerProcedure.query(() => listBottlesForAdmin()),

	getById: viewerProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input }) => {
			const rows = await listBottlesForAdmin();
			return rows.find((bottle) => bottle.id === input.id);
		}),

	getDetail: viewerProcedure
		.input(z.object({ id: z.string() }))
		.query(({ input }) => getAuthenticatedBottle(input.id)),

	getByBatchId: viewerProcedure
		.input(z.object({ batchId: z.string() }))
		.query(({ input }) => listBottlesByBatch(input.batchId)),

	create: brewerProcedure
		.input(
			z.object({
				status: legacyStatus.default("empty"),
				bottleNumber: z.number().int().positive(),
				label: z.string().trim().max(255).nullish(),
				displayName: z.string().trim().max(255).nullish(),
				volumeMl: z.number().int().positive().max(10_000).default(500),
				currentBatchId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [created] = await createBottles(
				[
					{
						bottleNumber: input.bottleNumber,
						displayName: input.displayName,
						volumeMl: input.volumeMl,
						legacyLabel: input.label,
						legacyStatus: input.status,
					},
				],
				ctx.session.user.id,
			);
			if (created && input.currentBatchId) {
				await db.transaction((tx) =>
					assignFill(
						tx,
						{
							bottleId: created.id,
							batchId: input.currentBatchId as string,
							status: input.status === "empty" ? "conditioning" : input.status,
						},
						ctx.session.user.id,
						"web",
					),
				);
			}
			return created;
		}),

	createMany: brewerProcedure
		.input(
			z
				.array(
					z.object({
						bottleNumber: z.number().int().positive(),
						status: legacyStatus.default("empty"),
						label: z.string().trim().max(255).nullish(),
						displayName: z.string().trim().max(255).nullish(),
						volumeMl: z.number().int().positive().max(10_000).default(500),
					}),
				)
				.min(1)
				.max(500),
		)
		.mutation(({ ctx, input }) =>
			createBottles(
				input.map((bottle) => ({
					bottleNumber: bottle.bottleNumber,
					displayName: bottle.displayName,
					volumeMl: bottle.volumeMl,
					legacyLabel: bottle.label,
					legacyStatus: bottle.status,
				})),
				ctx.session.user.id,
			),
		),

	createRange: brewerProcedure
		.input(
			z.object({
				count: z.number().int().min(1).max(500),
			}),
		)
		.mutation(({ ctx, input }) =>
			createServerAssignedBottleRange({
				count: input.count,
				actorUserId: ctx.session.user.id,
				source: "web",
			}),
		),

	update: brewerProcedure
		.input(
			z.object({
				id: z.string(),
				status: legacyStatus.optional(),
				bottleNumber: z.number().int().positive().optional(),
				label: z.string().trim().max(255).nullish(),
				displayName: z.string().trim().max(255).nullish(),
				volumeMl: z.number().int().positive().max(10_000).optional(),
				color: z.string().trim().max(80).nullish(),
				closureType: z.string().trim().max(80).nullish(),
				location: z.string().trim().max(255).nullish(),
				privateNotes: z.string().max(10_000).nullish(),
				currentBatchId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const bottle = await updateBottlePhysical({
				bottleId: input.id,
				actorUserId: ctx.session.user.id,
				source: "web",
				bottleNumber: input.bottleNumber,
				displayName: input.displayName,
				volumeMl: input.volumeMl,
				color: input.color,
				closureType: input.closureType,
				location: input.location,
				privateNotes: input.privateNotes,
				legacyLabel: input.label,
			});
			const active = await getActiveFillForBottle(input.id);
			if (input.status === "empty" && active) {
				await db.transaction((tx) =>
					emptyFill(tx, { fillId: active.id }, ctx.session.user.id, "web"),
				);
			} else if (
				active &&
				(input.status === "conditioning" || input.status === "ready") &&
				active.status !== input.status
			) {
				await db.transaction((tx) =>
					transitionFill(
						tx,
						{
							fillId: active.id,
							status: input.status as "conditioning" | "ready",
						},
						ctx.session.user.id,
						"web",
					),
				);
			} else if (!active && input.currentBatchId && input.status !== "empty") {
				await db.transaction((tx) =>
					assignFill(
						tx,
						{
							bottleId: input.id,
							batchId: input.currentBatchId as string,
							status:
								input.status && input.status !== "empty"
									? input.status
									: "conditioning",
						},
						ctx.session.user.id,
						"web",
					),
				);
			}
			return bottle;
		}),

	delete: brewerProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await retireBottle({
				bottleId: input.id,
				actorUserId: ctx.session.user.id,
				source: "web",
				retired: true,
			});
			return { success: true };
		}),

	retire: brewerProcedure
		.input(z.object({ id: z.string(), retired: z.boolean() }))
		.mutation(({ ctx, input }) =>
			retireBottle({
				bottleId: input.id,
				actorUserId: ctx.session.user.id,
				source: "web",
				retired: input.retired,
			}),
		),

	rotateQr: brewerProcedure
		.input(z.object({ id: z.string() }))
		.mutation(({ ctx, input }) =>
			rotateBottlePublicCode({
				bottleId: input.id,
				actorUserId: ctx.session.user.id,
				source: "web",
			}),
		),

	assignToBatch: cellarProcedure
		.input(z.object({ bottleId: z.string(), batchId: z.string() }))
		.mutation(({ ctx, input }) =>
			db.transaction((tx) =>
				assignFill(
					tx,
					{ ...input, status: "conditioning" },
					ctx.session.user.id,
					"web",
				),
			),
		),

	assignManyToBatch: cellarProcedure
		.input(
			z.object({
				bottleIds: z.array(z.string()).min(1).max(500),
				batchId: z.string(),
				status: z
					.enum(["filled", "conditioning", "ready"])
					.default("conditioning"),
			}),
		)
		.mutation(({ ctx, input }) =>
			db.transaction(async (tx) => {
				const results = [];
				for (const bottleId of [...new Set(input.bottleIds)]) {
					results.push(
						await assignFill(
							tx,
							{
								bottleId,
								batchId: input.batchId,
								status: input.status,
							},
							ctx.session.user.id,
							"web",
						),
					);
				}
				return results;
			}),
		),

	unassignFromBatch: cellarProcedure
		.input(z.object({ bottleId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const fill = await getActiveFillForBottle(input.bottleId);
			if (!fill) return { success: true };
			await db.transaction((tx) =>
				emptyFill(tx, { fillId: fill.id }, ctx.session.user.id, "web"),
			);
			return { success: true };
		}),
});
