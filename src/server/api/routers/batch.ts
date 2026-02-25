import { eq } from "drizzle-orm";
import { z } from "zod";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "@/server/api/trpc";
import { batches } from "@/server/db/schema";

export const batchRouter = createTRPCRouter({
	getAll: publicProcedure.query(async ({ ctx }) => {
		return await ctx.db.select().from(batches);
	}),

	getById: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const result = await ctx.db
				.select()
				.from(batches)
				.where(eq(batches.id, input.id));
			return result[0];
		}),

	create: protectedProcedure
		.input(
			z.object({
				batchNumber: z.number(),
				name: z.string(),
				description: z.string(),
				note: z.string(),
				status: z.enum([
					"planning",
					"brewing",
					"fermenting",
					"bottled",
					"completed",
				]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const result = await ctx.db.insert(batches).values(input).returning();
			return result[0];
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				batchNumber: z.number(),
				name: z.string(),
				description: z.string(),
				note: z.string(),
				status: z.enum([
					"planning",
					"brewing",
					"fermenting",
					"bottled",
					"completed",
				]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, ...updateData } = input;
			const result = await ctx.db
				.update(batches)
				.set(updateData)
				.where(eq(batches.id, id))
				.returning();
			return result[0];
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.delete(batches).where(eq(batches.id, input.id));
			return { success: true };
		}),
});
