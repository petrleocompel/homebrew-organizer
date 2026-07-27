import { z } from "zod";
import { env } from "@/env";
import { createTRPCRouter, labelProcedure } from "@/server/api/trpc";
import {
	createLabelTemplate,
	createPrintRuns,
	listLabelTemplates,
	listPrintRuns,
} from "@/server/services/label-service";

const qrElement = z.object({
	id: z.string().min(1),
	type: z.literal("qr"),
	xMm: z.number(),
	yMm: z.number(),
	widthMm: z.number(),
	heightMm: z.number(),
});
const textElement = z.object({
	id: z.string().min(1),
	type: z.literal("text"),
	token: z.string(),
	xMm: z.number(),
	yMm: z.number(),
	widthMm: z.number(),
	heightMm: z.number(),
	fontFamily: z.literal("Noto Sans"),
	fontSizePt: z.number(),
	fontWeight: z.union([z.literal(400), z.literal(700)]),
	color: z.string(),
	align: z.enum(["left", "center", "right"]),
	wrap: z.boolean(),
	visible: z.boolean(),
});
const element = z.discriminatedUnion("type", [qrElement, textElement]);

export const labelRouter = createTRPCRouter({
	listTemplates: labelProcedure.query(listLabelTemplates),
	listPrintRuns: labelProcedure.query(listPrintRuns),

	createTemplate: labelProcedure
		.input(
			z.object({
				name: z.string().trim().min(1).max(255),
				type: z.enum(["identity", "batch"]),
				backgroundPdfBase64: z.string().min(1),
				elements: z.array(element).min(1).max(50),
			}),
		)
		.mutation(({ ctx, input }) =>
			createLabelTemplate({
				name: input.name,
				type: input.type,
				backgroundPdf: Buffer.from(input.backgroundPdfBase64, "base64"),
				elements: input.elements,
				actorUserId: ctx.session.user.id,
				maxBytes: env.PDF_UPLOAD_MAX_BYTES,
			}),
		),

	createPrintRuns: labelProcedure
		.input(
			z.object({
				templateId: z.string(),
				bottleIds: z.array(z.string()).min(1).max(5_000),
				batchId: z.string().nullish(),
				confirmDuplicateIdentity: z.boolean().default(false),
			}),
		)
		.mutation(({ ctx, input }) =>
			createPrintRuns({
				...input,
				actorUserId: ctx.session.user.id,
				publicAppUrl: env.PUBLIC_APP_URL,
			}),
		),
});
