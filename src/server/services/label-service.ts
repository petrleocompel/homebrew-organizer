import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import JSZip from "jszip";
import { PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import { db } from "@/server/db";
import {
	batches,
	bottleFills,
	bottlePublicCodes,
	bottles,
	type LabelElement,
	labelTemplates,
	labelTemplateVersions,
	printRunItems,
	printRuns,
} from "@/server/db/schema";
import { type DbTransaction, DomainError } from "@/server/domain";
import { createQrMatrix, QR_QUIET_ZONE_MODULES } from "./qr-service";

const NOTO_SANS_REGULAR_PATH = resolve(
	process.cwd(),
	"node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff",
);
const NOTO_SANS_BOLD_PATH = resolve(
	process.cwd(),
	"node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff",
);
const PAGE_MM = 80;
const POINTS_PER_MM = 72 / 25.4;
const PAGE_POINTS = PAGE_MM * POINTS_PER_MM;
const MIN_QR_MM = 20;
const MAX_RUN_ITEMS = 500;
const SUPPORTED_TOKENS = new Set([
	"bottle.number",
	"bottle.displayName",
	"batch.number",
	"beer.name",
	"beer.style",
	"beer.abv",
	"fill.date",
	"fill.expectedReadyDate",
	"qr.shortCode",
]);

interface StickerSnapshot extends Record<string, unknown> {
	bottleId: string;
	bottleNumber: number;
	displayName: string | null;
	publicCode: string;
	shortPublicCode: string;
	canonicalUrl: string;
	batchNumber: number | null;
	beerName: string | null;
	style: string | null;
	abv: number | null;
	fillDate: string | null;
	expectedReadyDate: string | null;
	warnings: string[];
}

function sha256(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex");
}

function assertFiniteGeometry(element: LabelElement) {
	for (const [key, value] of Object.entries({
		xMm: element.xMm,
		yMm: element.yMm,
		widthMm: element.widthMm,
		heightMm: element.heightMm,
	})) {
		if (!Number.isFinite(value)) {
			throw new DomainError(
				"VALIDATION_FAILED",
				`Element ${element.id} has an invalid ${key}.`,
				422,
			);
		}
	}
	if (
		element.xMm < 0 ||
		element.yMm < 0 ||
		element.widthMm <= 0 ||
		element.heightMm <= 0 ||
		element.xMm + element.widthMm > PAGE_MM ||
		element.yMm + element.heightMm > PAGE_MM
	) {
		throw new DomainError(
			"VALIDATION_FAILED",
			`Element ${element.id} must stay within the 80 × 80 mm page.`,
			422,
		);
	}
}

export function validateLabelElements(
	type: "identity" | "batch",
	elements: LabelElement[],
) {
	const ids = new Set<string>();
	const qrElements = elements.filter((element) => element.type === "qr");
	if (qrElements.length !== 1) {
		throw new DomainError(
			"QR_UNSAFE",
			"A template must contain exactly one QR element.",
			422,
		);
	}
	for (const element of elements) {
		if (!element.id || ids.has(element.id)) {
			throw new DomainError(
				"VALIDATION_FAILED",
				"Template element IDs must be unique.",
				422,
			);
		}
		ids.add(element.id);
		assertFiniteGeometry(element);
		if (
			element.type === "qr" &&
			(element.widthMm < MIN_QR_MM ||
				element.heightMm < MIN_QR_MM ||
				Math.abs(element.widthMm - element.heightMm) > 0.01)
		) {
			throw new DomainError(
				"QR_UNSAFE",
				"The QR region must be square and at least 20 mm.",
				422,
			);
		}
		if (element.type === "text") {
			if (!SUPPORTED_TOKENS.has(element.token)) {
				throw new DomainError(
					"VALIDATION_FAILED",
					`Unsupported label token: ${element.token}`,
					422,
				);
			}
			if (
				type === "identity" &&
				(element.token.startsWith("batch.") ||
					element.token.startsWith("beer.") ||
					element.token.startsWith("fill."))
			) {
				throw new DomainError(
					"VALIDATION_FAILED",
					"Identity templates may only use bottle and QR fields.",
					422,
				);
			}
			if (
				element.fontSizePt < 4 ||
				element.fontSizePt > 72 ||
				!/^#[0-9a-f]{6}$/i.test(element.color)
			) {
				throw new DomainError(
					"VALIDATION_FAILED",
					`Text element ${element.id} has invalid typography.`,
					422,
				);
			}
		}
	}
}

export async function validateBackgroundPdf(
	bytes: Uint8Array,
	maxBytes: number,
) {
	if (bytes.byteLength > maxBytes) {
		throw new DomainError(
			"UPLOAD_TOO_LARGE",
			"PDF exceeds the configured upload limit.",
			413,
		);
	}
	let document: PDFDocument;
	try {
		document = await PDFDocument.load(bytes, {
			ignoreEncryption: false,
			updateMetadata: false,
		});
	} catch {
		throw new DomainError(
			"PDF_INVALID",
			"PDF must be readable and unencrypted.",
			422,
		);
	}
	if (document.getPageCount() !== 1) {
		throw new DomainError(
			"PDF_INVALID",
			"PDF must contain exactly one page.",
			422,
		);
	}
	const { width, height } = document.getPage(0).getSize();
	if (
		!Number.isFinite(width) ||
		!Number.isFinite(height) ||
		width <= 0 ||
		height <= 0 ||
		Math.abs(width - height) > 0.5
	) {
		throw new DomainError("PDF_INVALID", "PDF page must be square.", 422);
	}
	return { width, height, checksum: sha256(bytes) };
}

export async function createLabelTemplate(input: {
	name: string;
	type: "identity" | "batch";
	backgroundPdf: Uint8Array;
	elements: LabelElement[];
	actorUserId: string;
	maxBytes: number;
}) {
	validateLabelElements(input.type, input.elements);
	const pdf = await validateBackgroundPdf(input.backgroundPdf, input.maxBytes);
	return db.transaction(async (tx) => {
		const [template] = await tx
			.insert(labelTemplates)
			.values({
				name: input.name,
				type: input.type,
				createdBy: input.actorUserId,
			})
			.returning();
		if (!template) throw new Error("Template insert returned no row.");
		const [version] = await tx
			.insert(labelTemplateVersions)
			.values({
				templateId: template.id,
				version: 1,
				backgroundPdfBase64: Buffer.from(input.backgroundPdf).toString(
					"base64",
				),
				backgroundChecksum: pdf.checksum,
				sourceWidthPt: pdf.width.toString(),
				sourceHeightPt: pdf.height.toString(),
				elements: input.elements,
				createdBy: input.actorUserId,
			})
			.returning();
		if (!version) throw new Error("Template version insert returned no row.");
		await tx
			.update(labelTemplates)
			.set({ currentVersionId: version.id })
			.where(eq(labelTemplates.id, template.id));
		return { ...template, currentVersionId: version.id, version };
	});
}

export async function createLabelTemplateVersion(input: {
	templateId: string;
	backgroundPdf?: Uint8Array;
	elements: LabelElement[];
	actorUserId: string;
	maxBytes: number;
}) {
	return db.transaction(async (tx) => {
		const [current] = await tx
			.select({ template: labelTemplates, version: labelTemplateVersions })
			.from(labelTemplates)
			.innerJoin(
				labelTemplateVersions,
				eq(labelTemplateVersions.id, labelTemplates.currentVersionId),
			)
			.where(eq(labelTemplates.id, input.templateId))
			.limit(1)
			.for("update");
		if (!current)
			throw new DomainError("NOT_FOUND", "Label template not found.", 404);
		validateLabelElements(current.template.type, input.elements);
		const background = input.backgroundPdf
			? input.backgroundPdf
			: Buffer.from(current.version.backgroundPdfBase64, "base64");
		const pdf = await validateBackgroundPdf(background, input.maxBytes);
		const [version] = await tx
			.insert(labelTemplateVersions)
			.values({
				templateId: current.template.id,
				version: current.version.version + 1,
				backgroundPdfBase64: Buffer.from(background).toString("base64"),
				backgroundChecksum: pdf.checksum,
				sourceWidthPt: pdf.width.toString(),
				sourceHeightPt: pdf.height.toString(),
				elements: input.elements,
				createdBy: input.actorUserId,
			})
			.returning();
		if (!version) throw new Error("Template version insert returned no row.");
		await tx
			.update(labelTemplates)
			.set({ currentVersionId: version.id })
			.where(eq(labelTemplates.id, current.template.id));
		return version;
	});
}

export async function listLabelTemplates() {
	return db
		.select({ template: labelTemplates, version: labelTemplateVersions })
		.from(labelTemplates)
		.leftJoin(
			labelTemplateVersions,
			eq(labelTemplateVersions.id, labelTemplates.currentVersionId),
		)
		.where(isNull(labelTemplates.archivedAt))
		.orderBy(asc(labelTemplates.name));
}

async function stickerRows(
	executor: typeof db | DbTransaction,
	bottleIds: string[],
	batchId: string | null | undefined,
) {
	const activeFills = executor
		.select({
			bottleId: bottleFills.bottleId,
			batchId: bottleFills.batchId,
			filledAt: bottleFills.filledAt,
			expectedReadyAt: bottleFills.expectedReadyAt,
		})
		.from(bottleFills)
		.where(isNull(bottleFills.emptiedAt))
		.as("active_fills");
	return executor
		.select({
			bottle: bottles,
			publicCode: bottlePublicCodes.code,
			fillBatchId: activeFills.batchId,
			filledAt: activeFills.filledAt,
			expectedReadyAt: activeFills.expectedReadyAt,
			batch: batches,
		})
		.from(bottles)
		.innerJoin(
			bottlePublicCodes,
			and(
				eq(bottlePublicCodes.bottleId, bottles.id),
				isNull(bottlePublicCodes.revokedAt),
			),
		)
		.leftJoin(activeFills, eq(activeFills.bottleId, bottles.id))
		.leftJoin(batches, eq(batches.id, batchId ? batchId : activeFills.batchId))
		.where(inArray(bottles.id, bottleIds))
		.orderBy(asc(bottles.bottleNumber));
}

function snapshotFromRow(
	row: Awaited<ReturnType<typeof stickerRows>>[number],
	publicAppUrl: string,
): StickerSnapshot {
	const warnings: string[] = [];
	if (row.bottle.retiredAt) warnings.push("Bottle is retired.");
	if (!row.bottle.displayName) warnings.push("Bottle display name is missing.");
	if (!row.batch) warnings.push("Batch/beer fields are missing.");
	return {
		bottleId: row.bottle.id,
		bottleNumber: row.bottle.bottleNumber,
		displayName: row.bottle.displayName,
		publicCode: row.publicCode,
		shortPublicCode: row.publicCode.slice(0, 8),
		canonicalUrl: `${publicAppUrl.replace(/\/$/, "")}/b/${row.publicCode}`,
		batchNumber: row.batch?.batchNumber ?? null,
		beerName: row.batch?.publicName ?? row.batch?.name ?? null,
		style: row.batch?.styleName ?? null,
		abv: row.batch?.abv ? Number(row.batch.abv) : null,
		fillDate: row.filledAt?.toISOString() ?? null,
		expectedReadyDate: row.expectedReadyAt?.toISOString() ?? null,
		warnings,
	};
}

export async function createPrintRuns(input: {
	templateId: string;
	bottleIds: string[];
	batchId?: string | null;
	actorUserId: string;
	publicAppUrl: string;
	confirmDuplicateIdentity?: boolean;
	transaction?: DbTransaction;
}) {
	const uniqueBottleIds = [...new Set(input.bottleIds)];
	if (
		uniqueBottleIds.length === 0 ||
		uniqueBottleIds.length > 5_000 ||
		uniqueBottleIds.length !== input.bottleIds.length
	) {
		throw new DomainError(
			"VALIDATION_FAILED",
			"Select between 1 and 5,000 unique bottles.",
			422,
		);
	}
	const create = async (executor: typeof db | DbTransaction) => {
		const templateRow = await executor
			.select({ template: labelTemplates, version: labelTemplateVersions })
			.from(labelTemplates)
			.innerJoin(
				labelTemplateVersions,
				eq(labelTemplateVersions.id, labelTemplates.currentVersionId),
			)
			.where(eq(labelTemplates.id, input.templateId))
			.limit(1);
		const rows = await stickerRows(executor, uniqueBottleIds, input.batchId);
		const current = templateRow[0];
		if (!current)
			throw new DomainError("NOT_FOUND", "Label template not found.", 404);
		if (rows.length !== uniqueBottleIds.length) {
			throw new DomainError(
				"QR_UNSAFE",
				"Every selected bottle must have an active public QR identity.",
				409,
			);
		}

		if (current.template.type === "identity") {
			const previous = await executor
				.select({ bottleId: printRunItems.bottleId })
				.from(printRunItems)
				.innerJoin(printRuns, eq(printRuns.id, printRunItems.printRunId))
				.innerJoin(
					labelTemplateVersions,
					eq(labelTemplateVersions.id, printRuns.templateVersionId),
				)
				.innerJoin(
					labelTemplates,
					eq(labelTemplates.id, labelTemplateVersions.templateId),
				)
				.where(
					and(
						eq(labelTemplates.type, "identity"),
						inArray(printRunItems.bottleId, uniqueBottleIds),
					),
				)
				.limit(1);
			if (previous.length > 0 && !input.confirmDuplicateIdentity) {
				throw new DomainError(
					"PRINT_CONFIRMATION_REQUIRED",
					"One or more identity labels were printed before.",
					409,
				);
			}
		}

		const snapshots = rows.map((row) =>
			snapshotFromRow(row, input.publicAppUrl),
		);
		const chunks = Array.from(
			{ length: Math.ceil(snapshots.length / MAX_RUN_ITEMS) },
			(_, index) =>
				snapshots.slice(index * MAX_RUN_ITEMS, (index + 1) * MAX_RUN_ITEMS),
		);

		const created = [];
		for (const [runIndex, chunk] of chunks.entries()) {
			const [run] = await executor
				.insert(printRuns)
				.values({
					templateVersionId: current.version.id,
					batchId: input.batchId,
					runNumber: runIndex + 1,
					runCount: chunks.length,
					itemCount: chunk.length,
					duplicateIdentityConfirmed: !!input.confirmDuplicateIdentity,
					createdBy: input.actorUserId,
				})
				.returning();
			if (!run) throw new Error("Print run insert returned no row.");
			await executor.insert(printRunItems).values(
				chunk.map((snapshot, index) => ({
					printRunId: run.id,
					bottleId: snapshot.bottleId,
					pageNumber: index + 1,
					fileName: `bottle-${String(snapshot.bottleNumber).padStart(4, "0")}.pdf`,
					snapshot,
				})),
			);
			created.push({
				...run,
				warnings: chunk.flatMap((item) => item.warnings),
			});
		}
		return created;
	};
	return input.transaction ? create(input.transaction) : db.transaction(create);
}

function tokenValue(token: string, snapshot: StickerSnapshot): string {
	switch (token) {
		case "bottle.number":
			return String(snapshot.bottleNumber);
		case "bottle.displayName":
			return snapshot.displayName ?? "";
		case "batch.number":
			return snapshot.batchNumber === null ? "" : String(snapshot.batchNumber);
		case "beer.name":
			return snapshot.beerName ?? "";
		case "beer.style":
			return snapshot.style ?? "";
		case "beer.abv":
			return snapshot.abv === null ? "" : `${snapshot.abv.toFixed(1)} %`;
		case "fill.date":
			return snapshot.fillDate?.slice(0, 10) ?? "";
		case "fill.expectedReadyDate":
			return snapshot.expectedReadyDate?.slice(0, 10) ?? "";
		case "qr.shortCode":
			return snapshot.shortPublicCode;
		default:
			return "";
	}
}

function parseColor(value: string) {
	const normalized = value.replace("#", "");
	return rgb(
		Number.parseInt(normalized.slice(0, 2), 16) / 255,
		Number.parseInt(normalized.slice(2, 4), 16) / 255,
		Number.parseInt(normalized.slice(4, 6), 16) / 255,
	);
}

function wrapLines(
	text: string,
	font: PDFFont,
	fontSize: number,
	maxWidth: number,
	wrap: boolean,
): string[] {
	if (!wrap) return [text];
	const paragraphs = text.split(/\r?\n/);
	const lines: string[] = [];
	for (const paragraph of paragraphs) {
		const words = paragraph.split(/\s+/).filter(Boolean);
		let current = "";
		for (const word of words) {
			const candidate = current ? `${current} ${word}` : word;
			if (current && font.widthOfTextAtSize(candidate, fontSize) > maxWidth) {
				lines.push(current);
				current = word;
			} else {
				current = candidate;
			}
		}
		lines.push(current);
	}
	return lines;
}

function drawQr(
	page: PDFPage,
	payload: string,
	element: Extract<LabelElement, { type: "qr" }>,
) {
	const matrix = createQrMatrix(payload);
	const totalModules = matrix.size + QR_QUIET_ZONE_MODULES * 2;
	const sizePt = Math.min(element.widthMm, element.heightMm) * POINTS_PER_MM;
	const modulePt = sizePt / totalModules;
	const xPt = element.xMm * POINTS_PER_MM;
	const topPt = PAGE_POINTS - element.yMm * POINTS_PER_MM;
	page.drawRectangle({
		x: xPt,
		y: topPt - sizePt,
		width: sizePt,
		height: sizePt,
		color: rgb(1, 1, 1),
	});
	for (let row = 0; row < matrix.size; row += 1) {
		for (let column = 0; column < matrix.size; column += 1) {
			if (!matrix.isDark(row, column)) continue;
			page.drawRectangle({
				x: xPt + (column + QR_QUIET_ZONE_MODULES) * modulePt,
				y: topPt - (row + QR_QUIET_ZONE_MODULES + 1) * modulePt,
				width: modulePt + 0.02,
				height: modulePt + 0.02,
				color: rgb(0, 0, 0),
			});
		}
	}
}

function drawText(
	page: PDFPage,
	text: string,
	element: Extract<LabelElement, { type: "text" }>,
	font: PDFFont,
) {
	if (!element.visible || !text) return;
	const fontSize = element.fontSizePt;
	const width = element.widthMm * POINTS_PER_MM;
	const height = element.heightMm * POINTS_PER_MM;
	const lineHeight = fontSize * 1.2;
	const lines = wrapLines(text, font, fontSize, width, element.wrap).slice(
		0,
		Math.max(1, Math.floor(height / lineHeight)),
	);
	const baseX = element.xMm * POINTS_PER_MM;
	let y = PAGE_POINTS - element.yMm * POINTS_PER_MM - fontSize;
	for (const line of lines) {
		const textWidth = font.widthOfTextAtSize(line, fontSize);
		const x =
			element.align === "center"
				? baseX + (width - textWidth) / 2
				: element.align === "right"
					? baseX + width - textWidth
					: baseX;
		page.drawText(line, {
			x,
			y,
			size: fontSize,
			font,
			color: parseColor(element.color),
		});
		y -= lineHeight;
	}
}

async function fontBytes(weight: 400 | 700) {
	const path = weight === 700 ? NOTO_SANS_BOLD_PATH : NOTO_SANS_REGULAR_PATH;
	return readFile(path);
}

async function renderStickerPdf(
	version: typeof labelTemplateVersions.$inferSelect,
	items: Array<{ snapshot: StickerSnapshot }>,
): Promise<Uint8Array> {
	const output = await PDFDocument.create();
	output.registerFontkit(fontkit);
	const [regularBytes, boldBytes] = await Promise.all([
		fontBytes(400),
		fontBytes(700),
	]);
	const [regular, bold] = await Promise.all([
		output.embedFont(regularBytes, { subset: true }),
		output.embedFont(boldBytes, { subset: true }),
	]);
	const backgroundBytes = Buffer.from(version.backgroundPdfBase64, "base64");
	// pdf-lib cannot embed a valid blank page that has no Contents entry.
	// Appending an invisible mark normalizes both blank designer canvases and
	// ordinary uploaded artwork without changing its visible output.
	const backgroundDocument = await PDFDocument.load(backgroundBytes);
	const backgroundPage = backgroundDocument.getPage(0);
	backgroundPage.drawRectangle({
		x: 0,
		y: 0,
		width: 0.01,
		height: 0.01,
		color: rgb(1, 1, 1),
		opacity: 0,
	});
	const normalizedBackground = await backgroundDocument.save();
	const [background] = await output.embedPdf(normalizedBackground, [0]);
	if (!background) throw new Error("Unable to embed label background.");

	for (const item of items) {
		const page = output.addPage([PAGE_POINTS, PAGE_POINTS]);
		page.drawPage(background, {
			x: 0,
			y: 0,
			width: PAGE_POINTS,
			height: PAGE_POINTS,
		});
		for (const element of version.elements) {
			if (element.type === "qr") {
				drawQr(page, item.snapshot.canonicalUrl, element);
			} else {
				drawText(
					page,
					tokenValue(element.token, item.snapshot),
					element,
					element.fontWeight === 700 ? bold : regular,
				);
			}
		}
	}
	return output.save({ useObjectStreams: true });
}

function csvCell(value: unknown): string {
	const text = value === null || value === undefined ? "" : String(value);
	return `"${text.replaceAll('"', '""')}"`;
}

async function loadPrintRun(runId: string) {
	const [run] = await db
		.select({ run: printRuns, version: labelTemplateVersions })
		.from(printRuns)
		.innerJoin(
			labelTemplateVersions,
			eq(labelTemplateVersions.id, printRuns.templateVersionId),
		)
		.where(eq(printRuns.id, runId))
		.limit(1);
	if (!run) throw new DomainError("NOT_FOUND", "Print run not found.", 404);
	const items = await db
		.select()
		.from(printRunItems)
		.where(eq(printRunItems.printRunId, runId))
		.orderBy(asc(printRunItems.pageNumber));
	return {
		...run,
		items: items.map((item) => ({
			...item,
			snapshot: item.snapshot as StickerSnapshot,
		})),
	};
}

export async function downloadPrintRun(
	runId: string,
	format: "pdf" | "zip",
): Promise<{
	bytes: Uint8Array;
	contentType: string;
	fileName: string;
}> {
	const data = await loadPrintRun(runId);
	const baseName = `homebrew-labels-${runId.slice(0, 8)}-${data.run.runNumber}`;
	if (format === "pdf") {
		return {
			bytes: await renderStickerPdf(
				data.version,
				data.items.map((item) => ({ snapshot: item.snapshot })),
			),
			contentType: "application/pdf",
			fileName: `${baseName}.pdf`,
		};
	}

	const zip = new JSZip();
	for (const item of data.items) {
		const pdf = await renderStickerPdf(data.version, [
			{ snapshot: item.snapshot },
		]);
		zip.file(item.fileName, pdf);
	}
	const manifest = [
		["page", "file", "bottle_number", "short_public_code", "canonical_url"]
			.map(csvCell)
			.join(","),
		...data.items.map((item) =>
			[
				item.pageNumber,
				item.fileName,
				item.snapshot.bottleNumber,
				item.snapshot.shortPublicCode,
				item.snapshot.canonicalUrl,
			]
				.map(csvCell)
				.join(","),
		),
	].join("\r\n");
	zip.file("manifest.csv", `${manifest}\r\n`);
	return {
		bytes: await zip.generateAsync({
			type: "uint8array",
			compression: "DEFLATE",
			compressionOptions: { level: 6 },
		}),
		contentType: "application/zip",
		fileName: `${baseName}.zip`,
	};
}

export async function listPrintRuns() {
	return db.select().from(printRuns).orderBy(desc(printRuns.createdAt));
}
