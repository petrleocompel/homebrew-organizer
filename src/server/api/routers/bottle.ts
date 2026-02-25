import { eq } from "drizzle-orm";
import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "@/server/api/trpc";
import { batchBottles, bottles } from "@/server/db/schema";

export const bottleRouter = createTRPCRouter({
	getAll: publicProcedure.query(async ({ ctx }) => {
		return await ctx.db.select().from(bottles);
	}),

	getById: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const result = await ctx.db
				.select()
				.from(bottles)
				.where(eq(bottles.id, input.id));
			return result[0];
		}),

	getByBatchId: publicProcedure
		.input(z.object({ batchId: z.string() }))
		.query(async ({ ctx, input }) => {
			const batchBottleRecords = await ctx.db
				.select()
				.from(batchBottles)
				.where(eq(batchBottles.batchId, input.batchId));

			const bottleIds = batchBottleRecords.map((bb) => bb.bottleId);
			if (bottleIds.length === 0) return [];

			const bottleRecords = await ctx.db.select().from(bottles);
			return bottleRecords.filter((b) => bottleIds.includes(b.id));
		}),

	create: protectedProcedure
		.input(
			z.object({
				status: z.enum(["empty", "filled", "conditioning", "ready"]),
				bottleNumber: z.number(),
				label: z.string().nullish(),
				currentBatchId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const result = await ctx.db.insert(bottles).values(input).returning();
			return result[0];
		}),

	createMany: protectedProcedure
		.input(
			z.array(
				z.object({
					bottleNumber: z.number(),
					status: z.enum(["empty", "filled", "conditioning", "ready"]),
					label: z.string().nullish(),
				}),
			),
		)
		.mutation(async ({ ctx, input }) => {
			return await ctx.db.insert(bottles).values(input).returning();
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				status: z.enum(["empty", "filled", "conditioning", "ready"]),
				bottleNumber: z.number(),
				label: z.string().nullish(),
				currentBatchId: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...updateData } = input;
			const result = await ctx.db
				.update(bottles)
				.set(updateData)
				.where(eq(bottles.id, id))
				.returning();
			return result[0];
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.delete(bottles).where(eq(bottles.id, input.id));
			return { success: true };
		}),

	assignToBatch: protectedProcedure
		.input(
			z.object({
				bottleId: z.string(),
				batchId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(bottles)
				.set({
					currentBatchId: input.batchId,
				})
				.where(eq(bottles.id, input.bottleId));

			await ctx.db.insert(batchBottles).values({
				batchId: input.batchId,
				bottleId: input.bottleId,
			});

			return { success: true };
		}),

	unassignFromBatch: protectedProcedure
		.input(z.object({ bottleId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db
				.update(bottles)
				.set({
					currentBatchId: null,
				})
				.where(eq(bottles.id, input.bottleId));

			return { success: true };
		}),
});
