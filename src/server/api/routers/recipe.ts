import { z } from "zod";
import { env } from "@/env";
import {
	createTRPCRouter,
	recipeProcedure,
	viewerProcedure,
} from "@/server/api/trpc";
import {
	commitRecipeImport,
	createRecipeRevision,
	exportRecipe,
	getRecipe,
	listRecipes,
	previewRecipeImport,
} from "@/server/services/recipe-service";

const jsonObject = z.record(z.string(), z.unknown());

export const recipeRouter = createTRPCRouter({
	list: viewerProcedure.query(listRecipes),

	get: viewerProcedure
		.input(z.object({ id: z.string() }))
		.query(({ input }) => getRecipe(input.id)),

	previewImport: recipeProcedure
		.input(
			z.object({
				fileName: z.string().min(1).max(255),
				content: z.string(),
			}),
		)
		.mutation(({ input }) =>
			previewRecipeImport({
				...input,
				maxBytes: env.RECIPE_UPLOAD_MAX_BYTES,
			}),
		),

	commitImport: recipeProcedure
		.input(
			z.object({
				fileName: z.string().min(1).max(255),
				content: z.string(),
				selectedIndexes: z.array(z.number().int().nonnegative()).min(1),
				revisionMessage: z.string().max(1_000).nullish(),
			}),
		)
		.mutation(({ ctx, input }) => {
			const preview = previewRecipeImport({
				content: input.content,
				fileName: input.fileName,
				maxBytes: env.RECIPE_UPLOAD_MAX_BYTES,
			});
			return commitRecipeImport({
				preview,
				selectedIndexes: input.selectedIndexes,
				actorUserId: ctx.session.user.id,
				originalFileName: input.fileName,
				originalContent: input.content,
				revisionMessage: input.revisionMessage,
			});
		}),

	saveRevision: recipeProcedure
		.input(
			z.object({
				documentId: z.string().optional(),
				name: z.string().trim().min(1).max(255),
				beerJson: jsonObject,
				beerXmlExtensions: jsonObject.optional(),
				revisionMessage: z.string().max(1_000).nullish(),
			}),
		)
		.mutation(({ ctx, input }) =>
			createRecipeRevision({
				...input,
				actorUserId: ctx.session.user.id,
			}),
		),

	export: recipeProcedure
		.input(
			z.object({
				id: z.string(),
				format: z.enum(["beerjson", "beerxml"]),
			}),
		)
		.query(({ input }) => exportRecipe(input.id, input.format)),
});
