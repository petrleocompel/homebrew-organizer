import { z } from "zod";
import {
	brewerProcedure,
	createTRPCRouter,
	ownerProcedure,
	publicProcedure,
	viewerProcedure,
} from "@/server/api/trpc";
import {
	addBatchMeasurement,
	archiveBatch,
	createBatch,
	getBatch,
	getPublicBatch,
	listBatchMeasurements,
	listPrivateBatches,
	listPublicBatches,
	updateBatch,
} from "@/server/services/batch-service";

const batchStatus = z.enum([
	"planning",
	"brewing",
	"fermenting",
	"bottled",
	"packaging",
	"conditioning",
	"ready",
	"completed",
	"archived",
]);
const visibility = z.enum(["private", "unlisted", "listed"]);

export const batchRouter = createTRPCRouter({
	getAll: viewerProcedure.query(listPrivateBatches),

	getPublicAll: publicProcedure.query(listPublicBatches),

	getById: viewerProcedure
		.input(z.object({ id: z.string() }))
		.query(({ input }) => getBatch(input.id)),

	getPublicById: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(({ input }) => getPublicBatch(input.id)),

	create: brewerProcedure
		.input(
			z.object({
				batchNumber: z.number().int().positive().optional(),
				name: z.string().trim().min(1).max(255),
				publicName: z.string().trim().max(255).nullish(),
				description: z.string().max(10_000).default(""),
				publicDescription: z.string().max(10_000).nullish(),
				note: z.string().max(10_000).default(""),
				status: batchStatus.default("planning"),
				visibility: visibility.default("unlisted"),
				recipeRevisionId: z.string().min(1),
			}),
		)
		.mutation(({ ctx, input }) =>
			createBatch(
				{
					...input,
					privateNotes: input.note,
					status: input.status === "bottled" ? "packaging" : input.status,
				},
				ctx.session.user.id,
			),
		),

	update: brewerProcedure
		.input(
			z.object({
				id: z.string(),
				batchNumber: z.number().int().positive().optional(),
				name: z.string().trim().min(1).max(255),
				publicName: z.string().trim().max(255).nullish(),
				description: z.string().max(10_000).optional(),
				publicDescription: z.string().max(10_000).nullish(),
				note: z.string().max(10_000).optional(),
				status: batchStatus.optional(),
				visibility: visibility.optional(),
				styleName: z.string().trim().max(255).nullish(),
				abv: z.number().min(0).max(100).nullish(),
			}),
		)
		.mutation(({ ctx, input }) => {
			const { id, note, status, ...rest } = input;
			return updateBatch(
				id,
				{
					...rest,
					privateNotes: note,
					status: status === "bottled" ? "packaging" : status,
				},
				ctx.session.user.id,
			);
		}),

	delete: ownerProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await archiveBatch(input.id, ctx.session.user.id);
			return { success: true };
		}),

	getMeasurements: viewerProcedure
		.input(z.object({ batchId: z.string() }))
		.query(({ input }) => listBatchMeasurements(input.batchId)),

	addMeasurement: brewerProcedure
		.input(
			z.object({
				batchId: z.string(),
				kind: z.enum(["gravity", "temperature", "ph", "volume"]),
				value: z.number(),
				unit: z.string().max(24),
				measuredAt: z.coerce.date().optional(),
				note: z.string().max(2_000).nullish(),
			}),
		)
		.mutation(({ ctx, input }) =>
			addBatchMeasurement({
				...input,
				actorUserId: ctx.session.user.id,
			}),
		),
});
