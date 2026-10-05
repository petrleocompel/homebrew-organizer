import { createHash } from "node:crypto";
import beerSchema from "@beerjson/beerjson/json/beer.json";
import boilSchema from "@beerjson/beerjson/json/boil.json";
import boilStepSchema from "@beerjson/beerjson/json/boil_step.json";
import cultureSchema from "@beerjson/beerjson/json/culture.json";
import equipmentSchema from "@beerjson/beerjson/json/equipment.json";
import fermentableSchema from "@beerjson/beerjson/json/fermentable.json";
import fermentationSchema from "@beerjson/beerjson/json/fermentation.json";
import fermentationStepSchema from "@beerjson/beerjson/json/fermentation_step.json";
import hopSchema from "@beerjson/beerjson/json/hop.json";
import mashSchema from "@beerjson/beerjson/json/mash.json";
import mashStepSchema from "@beerjson/beerjson/json/mash_step.json";
import unitsSchema from "@beerjson/beerjson/json/measureable_units.json";
import miscSchema from "@beerjson/beerjson/json/misc.json";
import packagingSchema from "@beerjson/beerjson/json/packaging.json";
import packagingGraphicSchema from "@beerjson/beerjson/json/packaging_graphic.json";
import packagingVesselSchema from "@beerjson/beerjson/json/packaging_vessel.json";
import recipeSchema from "@beerjson/beerjson/json/recipe.json";
import styleSchema from "@beerjson/beerjson/json/style.json";
import timingSchema from "@beerjson/beerjson/json/timing.json";
import waterSchema from "@beerjson/beerjson/json/water.json";
import Ajv, { type ErrorObject } from "ajv";
import { asc, desc, eq, inArray, max } from "drizzle-orm";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { db } from "@/server/db";
import { recipeDocuments, recipeRevisions } from "@/server/db/schema";
import type { DbTransaction } from "@/server/domain";
import { DomainError } from "@/server/domain";

type JsonObject = Record<string, unknown>;

const ajv = new Ajv({
	allErrors: true,
	strict: false,
	validateFormats: false,
});

for (const schema of [
	boilSchema,
	boilStepSchema,
	cultureSchema,
	equipmentSchema,
	fermentableSchema,
	fermentationSchema,
	fermentationStepSchema,
	hopSchema,
	mashSchema,
	mashStepSchema,
	unitsSchema,
	miscSchema,
	packagingSchema,
	packagingGraphicSchema,
	packagingVesselSchema,
	recipeSchema,
	styleSchema,
	timingSchema,
	waterSchema,
]) {
	ajv.addSchema(schema);
}
const validateOfficialBeerJson = ajv.compile(beerSchema);

const xmlParser = new XMLParser({
	ignoreAttributes: false,
	ignoreDeclaration: true,
	parseTagValue: false,
	parseAttributeValue: false,
	processEntities: false,
	trimValues: true,
});

const xmlBuilder = new XMLBuilder({
	ignoreAttributes: false,
	format: true,
	suppressEmptyNode: false,
});

function asObject(value: unknown): JsonObject {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as JsonObject)
		: {};
}

function asArray(value: unknown): unknown[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
}

function stringValue(value: unknown, fallback = ""): string {
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean")
		return String(value);
	return fallback;
}

function numberValue(value: unknown, fallback = 0): number {
	const number = Number(value);
	return Number.isFinite(number) ? number : fallback;
}

function optionalNumber(value: unknown): number | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	const number = Number(value);
	return Number.isFinite(number) ? number : undefined;
}

function truthyBeerXml(value: unknown): boolean {
	return stringValue(value).toUpperCase() === "TRUE";
}

function percent(value: unknown) {
	return { unit: "%", value: numberValue(value) };
}

function volume(value: unknown) {
	return { unit: "l", value: numberValue(value) };
}

function mass(value: unknown) {
	return { unit: "kg", value: numberValue(value) };
}

function temperature(value: unknown) {
	return { unit: "C", value: numberValue(value) };
}

function duration(value: unknown, unit = "min") {
	return { unit, value: numberValue(value) };
}

function gravity(value: unknown) {
	return { unit: "sg", value: numberValue(value) };
}

function normalizeRecipeType(value: unknown): string {
	const type = stringValue(value).toLowerCase();
	if (type === "all grain" || type === "partial mash" || type === "extract") {
		return type;
	}
	return "other";
}

function oneOf<T extends string>(
	value: unknown,
	values: readonly T[],
	fallback: T,
): T {
	const normalized = stringValue(value).toLowerCase() as T;
	return values.includes(normalized) ? normalized : fallback;
}

function mapBeerXmlFermentable(value: unknown): JsonObject {
	const row = asObject(value);
	const fineGrind = optionalNumber(row.YIELD);
	return {
		name: stringValue(row.NAME, "Unnamed fermentable"),
		type: oneOf(
			row.TYPE,
			[
				"dry extract",
				"extract",
				"grain",
				"sugar",
				"fruit",
				"juice",
				"honey",
				"other",
			] as const,
			"other",
		),
		amount: mass(row.AMOUNT),
		yield:
			fineGrind === undefined
				? {}
				: { fine_grind: { unit: "%", value: fineGrind } },
		color: { unit: "Lovi", value: numberValue(row.COLOR) },
		...(row.ORIGIN ? { origin: stringValue(row.ORIGIN) } : {}),
		...(row.SUPPLIER ? { producer: stringValue(row.SUPPLIER) } : {}),
		...(row.NOTES ? { notes: stringValue(row.NOTES) } : {}),
		...(row.ADD_AFTER_BOIL !== undefined
			? { add_after_boil: truthyBeerXml(row.ADD_AFTER_BOIL) }
			: {}),
	};
}

function timingUse(value: unknown) {
	const use = stringValue(value).toLowerCase();
	if (use.includes("mash")) return "add_to_mash";
	if (use.includes("dry") || use.includes("ferment"))
		return "add_to_fermentation";
	if (use.includes("bottle") || use.includes("package"))
		return "add_to_package";
	return "add_to_boil";
}

function mapBeerXmlHop(value: unknown): JsonObject {
	const row = asObject(value);
	const use = timingUse(row.USE);
	return {
		name: stringValue(row.NAME, "Unnamed hop"),
		alpha_acid: percent(row.ALPHA),
		amount: mass(row.AMOUNT),
		timing: {
			use,
			time: duration(row.TIME, use === "add_to_fermentation" ? "day" : "min"),
		},
		...(row.ORIGIN ? { origin: stringValue(row.ORIGIN) } : {}),
		...(row.FORM
			? {
					form: oneOf(
						row.FORM,
						[
							"extract",
							"leaf",
							"leaf (wet)",
							"pellet",
							"powder",
							"plug",
						] as const,
						"pellet",
					),
				}
			: {}),
		...(optionalNumber(row.BETA) === undefined
			? {}
			: { beta_acid: percent(row.BETA) }),
		...(row.NOTES ? { notes: stringValue(row.NOTES) } : {}),
	};
}

function mapBeerXmlMisc(value: unknown): JsonObject {
	const row = asObject(value);
	const amountUnit = truthyBeerXml(row.AMOUNT_IS_WEIGHT) ? "kg" : "l";
	return {
		name: stringValue(row.NAME, "Unnamed ingredient"),
		type: oneOf(
			row.TYPE,
			[
				"spice",
				"fining",
				"water agent",
				"herb",
				"flavor",
				"wood",
				"other",
			] as const,
			"other",
		),
		amount: { unit: amountUnit, value: numberValue(row.AMOUNT) },
		timing: {
			use: timingUse(row.USE),
			time: duration(row.TIME),
		},
		...(row.NOTES ? { notes: stringValue(row.NOTES) } : {}),
	};
}

function mapBeerXmlCulture(value: unknown): JsonObject {
	const row = asObject(value);
	const amountUnit = truthyBeerXml(row.AMOUNT_IS_WEIGHT) ? "kg" : "l";
	return {
		name: stringValue(row.NAME, "Unnamed culture"),
		type: oneOf(
			row.TYPE,
			[
				"ale",
				"bacteria",
				"brett",
				"champagne",
				"kveik",
				"lacto",
				"lager",
				"malolactic",
				"mixed-culture",
				"other",
				"pedio",
				"spontaneous",
				"wine",
			] as const,
			"other",
		),
		form: oneOf(
			row.FORM,
			["liquid", "dry", "slant", "culture", "dregs"] as const,
			"liquid",
		),
		amount: { unit: amountUnit, value: numberValue(row.AMOUNT) },
		...(optionalNumber(row.ATTENUATION) === undefined
			? {}
			: { attenuation: percent(row.ATTENUATION) }),
		...(row.LABORATORY ? { producer: stringValue(row.LABORATORY) } : {}),
		...(row.PRODUCT_ID ? { product_id: stringValue(row.PRODUCT_ID) } : {}),
		...(row.NOTES ? { notes: stringValue(row.NOTES) } : {}),
	};
}

function mapBeerXmlWater(value: unknown): JsonObject {
	const row = asObject(value);
	return {
		name: stringValue(row.NAME, "Water"),
		amount: volume(row.AMOUNT),
		calcium: numberValue(row.CALCIUM),
		bicarbonate: numberValue(row.BICARBONATE),
		sulfate: numberValue(row.SULFATE),
		chloride: numberValue(row.CHLORIDE),
		sodium: numberValue(row.SODIUM),
		magnesium: numberValue(row.MAGNESIUM),
		...(optionalNumber(row.PH) === undefined
			? {}
			: { acidity: { unit: "pH", value: numberValue(row.PH) } }),
		...(row.NOTES ? { notes: stringValue(row.NOTES) } : {}),
	};
}

function mapBeerXmlMash(value: unknown): JsonObject | undefined {
	const mash = asObject(value);
	if (Object.keys(mash).length === 0) return undefined;
	const stepsNode = asObject(mash.MASH_STEPS).MASH_STEP;
	const steps = asArray(stepsNode).map((stepValue, index) => {
		const step = asObject(stepValue);
		return {
			name: stringValue(step.NAME, `Mash step ${index + 1}`),
			type: oneOf(
				step.TYPE,
				[
					"infusion",
					"temperature",
					"decoction",
					"souring mash",
					"souring wort",
					"drain mash tun",
					"sparge",
				] as const,
				"temperature",
			),
			step_temperature: temperature(step.STEP_TEMP),
			step_time: duration(step.STEP_TIME),
			...(optionalNumber(step.RAMP_TIME) === undefined
				? {}
				: { ramp_time: duration(step.RAMP_TIME) }),
			...(optionalNumber(step.END_TEMP) === undefined
				? {}
				: { end_temperature: temperature(step.END_TEMP) }),
			...(optionalNumber(step.INFUSE_AMOUNT) === undefined
				? {}
				: { amount: volume(step.INFUSE_AMOUNT) }),
		};
	});
	return {
		name: stringValue(mash.NAME, "Mash"),
		grain_temperature: temperature(mash.GRAIN_TEMP),
		mash_steps: steps,
		...(mash.NOTES ? { notes: stringValue(mash.NOTES) } : {}),
	};
}

function mapBeerXmlStyle(value: unknown): JsonObject | undefined {
	const style = asObject(value);
	if (!style.NAME) return undefined;
	const rawType = stringValue(style.TYPE).toLowerCase();
	return {
		name: stringValue(style.NAME),
		category: stringValue(style.CATEGORY, "Other"),
		style_guide: stringValue(style.STYLE_GUIDE, "BeerXML"),
		type:
			rawType === "ale" || rawType === "lager"
				? "beer"
				: oneOf(
						rawType,
						[
							"beer",
							"cider",
							"kombucha",
							"mead",
							"other",
							"soda",
							"wine",
						] as const,
						"other",
					),
	};
}

function mapBeerXmlFermentation(recipe: JsonObject): JsonObject | undefined {
	const stages = Math.max(
		0,
		Math.floor(numberValue(recipe.FERMENTATION_STAGES)),
	);
	const steps: JsonObject[] = [];
	for (let index = 1; index <= Math.min(stages, 3); index += 1) {
		const age = recipe[`FERMENTATION_AGE_${index}`];
		const temp = recipe[`FERMENTATION_TEMP_${index}`];
		if (age === undefined && temp === undefined) continue;
		steps.push({
			name: `Fermentation ${index}`,
			...(age === undefined ? {} : { step_time: duration(age, "day") }),
			...(temp === undefined ? {} : { start_temperature: temperature(temp) }),
		});
	}
	if (steps.length === 0) return undefined;
	return { name: "Fermentation", fermentation_steps: steps };
}

function beerXmlRecipeToBeerJson(recipe: JsonObject): JsonObject {
	const ingredients = {
		fermentable_additions: asArray(
			asObject(recipe.FERMENTABLES).FERMENTABLE,
		).map(mapBeerXmlFermentable),
		hop_additions: asArray(asObject(recipe.HOPS).HOP).map(mapBeerXmlHop),
		miscellaneous_additions: asArray(asObject(recipe.MISCS).MISC).map(
			mapBeerXmlMisc,
		),
		culture_additions: asArray(asObject(recipe.YEASTS).YEAST).map(
			mapBeerXmlCulture,
		),
		water_additions: asArray(asObject(recipe.WATERS).WATER).map(
			mapBeerXmlWater,
		),
	};
	const mapped: JsonObject = {
		name: stringValue(recipe.NAME, "Imported recipe"),
		type: normalizeRecipeType(recipe.TYPE),
		author: stringValue(recipe.BREWER, "Unknown"),
		batch_size: volume(recipe.BATCH_SIZE),
		efficiency: { brewhouse: percent(recipe.EFFICIENCY) },
		ingredients,
	};

	const style = mapBeerXmlStyle(recipe.STYLE);
	const mash = mapBeerXmlMash(recipe.MASH);
	const fermentation = mapBeerXmlFermentation(recipe);
	if (style) mapped.style = style;
	if (mash) mapped.mash = mash;
	if (fermentation) mapped.fermentation = fermentation;
	if (recipe.NOTES) mapped.notes = stringValue(recipe.NOTES);
	if (optionalNumber(recipe.OG) !== undefined)
		mapped.original_gravity = gravity(recipe.OG);
	if (optionalNumber(recipe.FG) !== undefined)
		mapped.final_gravity = gravity(recipe.FG);
	if (optionalNumber(recipe.EST_ABV) !== undefined)
		mapped.alcohol_by_volume = percent(recipe.EST_ABV);
	if (optionalNumber(recipe.BOIL_TIME) !== undefined) {
		mapped.boil = {
			boil_time: duration(recipe.BOIL_TIME),
			...(optionalNumber(recipe.BOIL_SIZE) === undefined
				? {}
				: { pre_boil_size: volume(recipe.BOIL_SIZE) }),
		};
	}
	return { beerjson: { version: 1, recipes: [mapped] } };
}

function beerJsonErrors(errors: ErrorObject[] | null | undefined): string[] {
	return (errors ?? []).map(
		(error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
	);
}

export function validateBeerJson(document: unknown): {
	valid: boolean;
	errors: string[];
} {
	const valid = validateOfficialBeerJson(document);
	return {
		valid: !!valid,
		errors: beerJsonErrors(validateOfficialBeerJson.errors),
	};
}

export interface RecipeImportItem {
	index: number;
	name: string;
	valid: boolean;
	errors: string[];
	warnings: string[];
	document: JsonObject;
	extensions: JsonObject;
}

export interface RecipeImportPreview {
	format: "beerjson" | "beerxml";
	items: RecipeImportItem[];
	checksum: string;
}

function checksum(content: string | Uint8Array): string {
	return createHash("sha256").update(content).digest("hex");
}

export function previewRecipeImport(input: {
	content: string;
	fileName: string;
	maxBytes: number;
	maxRecipes?: number;
}): RecipeImportPreview {
	if (Buffer.byteLength(input.content, "utf8") > input.maxBytes) {
		throw new DomainError(
			"UPLOAD_TOO_LARGE",
			"Recipe file exceeds the configured upload limit.",
			413,
		);
	}
	const maxRecipes = input.maxRecipes ?? 100;
	const trimmed = input.content.trim();
	const looksLikeXml =
		input.fileName.toLowerCase().endsWith(".xml") || trimmed.startsWith("<");

	if (!looksLikeXml) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(trimmed);
		} catch {
			throw new DomainError("RECIPE_INVALID", "Recipe is not valid JSON.", 422);
		}
		const root = asObject(asObject(parsed).beerjson);
		const recipes = asArray(root.recipes);
		if (recipes.length === 0 || recipes.length > maxRecipes) {
			throw new DomainError(
				"RECIPE_INVALID",
				`BeerJSON must contain between 1 and ${maxRecipes} recipes.`,
				422,
			);
		}
		const shared = { ...root };
		delete shared.recipes;
		const items = recipes.map((recipe, index) => {
			const document = {
				beerjson: { ...shared, recipes: [recipe] },
			};
			const validation = validateBeerJson(document);
			return {
				index,
				name: stringValue(asObject(recipe).name, `Recipe ${index + 1}`),
				valid: validation.valid,
				errors: validation.errors,
				warnings: [],
				document,
				extensions: {},
			};
		});
		return { format: "beerjson", items, checksum: checksum(input.content) };
	}

	if (/<!\s*(doctype|entity)\b/i.test(trimmed)) {
		throw new DomainError(
			"RECIPE_INVALID",
			"DTDs and XML entities are not allowed.",
			422,
		);
	}
	let parsed: JsonObject;
	try {
		parsed = asObject(xmlParser.parse(trimmed));
	} catch {
		throw new DomainError("RECIPE_INVALID", "Recipe is not valid XML.", 422);
	}
	const recipeNodes =
		asObject(parsed.RECIPES).RECIPE ?? parsed.RECIPE ?? undefined;
	const recipes = asArray(recipeNodes);
	if (recipes.length === 0 || recipes.length > maxRecipes) {
		throw new DomainError(
			"RECIPE_INVALID",
			`BeerXML must contain between 1 and ${maxRecipes} recipes.`,
			422,
		);
	}
	const items = recipes.map((recipeValue, index) => {
		const original = asObject(recipeValue);
		const document = beerXmlRecipeToBeerJson(original);
		const validation = validateBeerJson(document);
		return {
			index,
			name: stringValue(original.NAME, `Recipe ${index + 1}`),
			valid: validation.valid,
			errors: validation.errors,
			warnings: [
				"BeerXML-only and non-standard fields are preserved in the revision extension data.",
			],
			document,
			extensions: { beerxml: { recipe: original } },
		};
	});
	return { format: "beerxml", items, checksum: checksum(input.content) };
}

export async function commitRecipeImport(input: {
	preview: RecipeImportPreview;
	selectedIndexes: number[];
	actorUserId: string;
	originalFileName: string;
	originalContent: string;
	revisionMessage?: string | null;
	transaction?: DbTransaction;
}) {
	const selected = input.preview.items.filter((item) =>
		input.selectedIndexes.includes(item.index),
	);
	if (
		selected.length === 0 ||
		selected.some((item) => !item.valid) ||
		new Set(input.selectedIndexes).size !== input.selectedIndexes.length
	) {
		throw new DomainError(
			"RECIPE_INVALID",
			"Select at least one valid recipe.",
			422,
		);
	}

	const commit = async (tx: DbTransaction) => {
		const committed = [];
		for (const item of selected) {
			const [document] = await tx
				.insert(recipeDocuments)
				.values({
					name: item.name,
					createdBy: input.actorUserId,
				})
				.returning();
			if (!document) throw new Error("Recipe document insert returned no row.");
			const [revision] = await tx
				.insert(recipeRevisions)
				.values({
					documentId: document.id,
					revision: 1,
					beerJson: item.document,
					beerXmlExtensions: item.extensions,
					schemaVersion: "1.0",
					createdBy: input.actorUserId,
					revisionMessage:
						input.revisionMessage ?? `Imported ${input.originalFileName}`,
					originalFileName: input.originalFileName,
					originalFileBase64: Buffer.from(input.originalContent).toString(
						"base64",
					),
					originalChecksum: input.preview.checksum,
				})
				.returning();
			if (!revision) throw new Error("Recipe revision insert returned no row.");
			await tx
				.update(recipeDocuments)
				.set({ currentRevisionId: revision.id })
				.where(eq(recipeDocuments.id, document.id));
			committed.push({ ...document, currentRevisionId: revision.id, revision });
		}
		return committed;
	};
	return input.transaction ? commit(input.transaction) : db.transaction(commit);
}

export async function createRecipeRevision(input: {
	documentId?: string;
	name: string;
	beerJson: JsonObject;
	beerXmlExtensions?: JsonObject;
	actorUserId: string;
	revisionMessage?: string | null;
}) {
	const validation = validateBeerJson(input.beerJson);
	if (!validation.valid) {
		throw new DomainError(
			"RECIPE_INVALID",
			"BeerJSON does not match the pinned official schema.",
			422,
			{ errors: validation.errors },
		);
	}
	return db.transaction(async (tx) => {
		let documentId = input.documentId;
		if (!documentId) {
			const [document] = await tx
				.insert(recipeDocuments)
				.values({ name: input.name, createdBy: input.actorUserId })
				.returning();
			if (!document) throw new Error("Recipe document insert returned no row.");
			documentId = document.id;
		} else {
			const [document] = await tx
				.select()
				.from(recipeDocuments)
				.where(eq(recipeDocuments.id, documentId))
				.limit(1)
				.for("update");
			if (!document)
				throw new DomainError("NOT_FOUND", "Recipe not found.", 404);
		}

		const maximumRows = await tx
			.select({ maximum: max(recipeRevisions.revision) })
			.from(recipeRevisions)
			.where(eq(recipeRevisions.documentId, documentId));
		const maximum = maximumRows[0]?.maximum;
		const [revision] = await tx
			.insert(recipeRevisions)
			.values({
				documentId,
				revision: (maximum ?? 0) + 1,
				beerJson: input.beerJson,
				beerXmlExtensions: input.beerXmlExtensions ?? {},
				schemaVersion: "1.0",
				createdBy: input.actorUserId,
				revisionMessage: input.revisionMessage,
			})
			.returning();
		if (!revision) throw new Error("Recipe revision insert returned no row.");
		await tx
			.update(recipeDocuments)
			.set({ name: input.name, currentRevisionId: revision.id })
			.where(eq(recipeDocuments.id, documentId));
		return revision;
	});
}

export async function listRecipes() {
	return db
		.select({
			id: recipeDocuments.id,
			name: recipeDocuments.name,
			currentRevisionId: recipeDocuments.currentRevisionId,
			archivedAt: recipeDocuments.archivedAt,
			updatedAt: recipeDocuments.updatedAt,
			revision: recipeRevisions.revision,
		})
		.from(recipeDocuments)
		.leftJoin(
			recipeRevisions,
			eq(recipeRevisions.id, recipeDocuments.currentRevisionId),
		)
		.orderBy(asc(recipeDocuments.name));
}

export async function getRecipe(documentId: string) {
	const [document] = await db
		.select()
		.from(recipeDocuments)
		.where(eq(recipeDocuments.id, documentId))
		.limit(1);
	if (!document) return null;
	const revisions = await db
		.select()
		.from(recipeRevisions)
		.where(eq(recipeRevisions.documentId, document.id))
		.orderBy(desc(recipeRevisions.revision));
	return { ...document, revisions };
}

function measureValue(
	value: unknown,
	_fallbackUnit: string,
): string | number | undefined {
	const object = asObject(value);
	if (object.value === undefined) return undefined;
	return numberValue(object.value);
}

function beerJsonToBeerXmlRecipe(document: JsonObject): JsonObject {
	const recipe = asObject(asArray(asObject(document.beerjson).recipes).at(0));
	const ingredients = asObject(recipe.ingredients);
	const fermentables = asArray(ingredients.fermentable_additions).map(
		(value) => {
			const row = asObject(value);
			return {
				NAME: stringValue(row.name),
				VERSION: 1,
				TYPE: stringValue(row.type, "Other"),
				AMOUNT: measureValue(row.amount, "kg") ?? 0,
				YIELD:
					measureValue(asObject(row.yield).fine_grind, "%") ??
					measureValue(asObject(row.yield).coarse_grind, "%") ??
					0,
				COLOR: measureValue(row.color, "Lovi") ?? 0,
				...(row.origin ? { ORIGIN: stringValue(row.origin) } : {}),
				...(row.producer ? { SUPPLIER: stringValue(row.producer) } : {}),
				...(row.notes ? { NOTES: stringValue(row.notes) } : {}),
			};
		},
	);
	const hops = asArray(ingredients.hop_additions).map((value) => {
		const row = asObject(value);
		const timing = asObject(row.timing);
		return {
			NAME: stringValue(row.name),
			VERSION: 1,
			ALPHA: measureValue(row.alpha_acid, "%") ?? 0,
			AMOUNT: measureValue(row.amount, "kg") ?? 0,
			USE: stringValue(timing.use, "Boil"),
			TIME: measureValue(timing.time, "min") ?? 0,
			...(row.form ? { FORM: stringValue(row.form) } : {}),
			...(row.origin ? { ORIGIN: stringValue(row.origin) } : {}),
			...(row.notes ? { NOTES: stringValue(row.notes) } : {}),
		};
	});
	return {
		NAME: stringValue(recipe.name),
		VERSION: 1,
		TYPE: stringValue(recipe.type, "All Grain"),
		BREWER: stringValue(recipe.author, "Unknown"),
		BATCH_SIZE: measureValue(recipe.batch_size, "l") ?? 0,
		BOIL_SIZE:
			measureValue(asObject(recipe.boil).pre_boil_size, "l") ??
			measureValue(recipe.batch_size, "l") ??
			0,
		BOIL_TIME: measureValue(asObject(recipe.boil).boil_time, "min") ?? 0,
		EFFICIENCY: measureValue(asObject(recipe.efficiency).brewhouse, "%") ?? 0,
		FERMENTABLES: { FERMENTABLE: fermentables },
		HOPS: { HOP: hops },
		...(recipe.notes ? { NOTES: stringValue(recipe.notes) } : {}),
		...(recipe.original_gravity
			? { OG: measureValue(recipe.original_gravity, "sg") }
			: {}),
		...(recipe.final_gravity
			? { FG: measureValue(recipe.final_gravity, "sg") }
			: {}),
	};
}

function xmlCharacterReferences(value: string): string {
	let result = "";
	for (const character of value) {
		const codePoint = character.codePointAt(0);
		result +=
			codePoint !== undefined && codePoint > 255
				? `&#${codePoint};`
				: character;
	}
	return result;
}

export async function exportRecipe(
	documentId: string,
	format: "beerjson" | "beerxml",
): Promise<{ contentType: string; fileName: string; content: string }> {
	const recipe = await getRecipe(documentId);
	const revision = recipe?.revisions[0];
	if (!recipe || !revision) {
		throw new DomainError("NOT_FOUND", "Recipe not found.", 404);
	}
	const safeName =
		recipe.name
			.normalize("NFKD")
			.replace(/[^\p{Letter}\p{Number}._-]+/gu, "-")
			.replace(/^-+|-+$/g, "") || "recipe";
	if (format === "beerjson") {
		const validation = validateBeerJson(revision.beerJson);
		if (!validation.valid) {
			throw new DomainError(
				"RECIPE_INVALID",
				"Stored BeerJSON revision no longer validates.",
				500,
				{ errors: validation.errors },
			);
		}
		return {
			contentType: "application/json; charset=utf-8",
			fileName: `${safeName}.beer.json`,
			content: `${JSON.stringify(revision.beerJson, null, 2)}\n`,
		};
	}

	const originalRecipe = asObject(
		asObject(revision.beerXmlExtensions).beerxml,
	).recipe;
	const beerXmlRecipe =
		originalRecipe && typeof originalRecipe === "object"
			? asObject(originalRecipe)
			: beerJsonToBeerXmlRecipe(revision.beerJson);
	const body = xmlBuilder.build({ RECIPES: { RECIPE: beerXmlRecipe } });
	return {
		contentType: "application/xml; charset=iso-8859-1",
		fileName: `${safeName}.xml`,
		content: `<?xml version="1.0" encoding="ISO-8859-1"?>\n${xmlCharacterReferences(body)}\n`,
	};
}

export async function exportRecipesBeerJson(documentIds: string[]) {
	const documents = await db
		.select({ document: recipeDocuments, revision: recipeRevisions })
		.from(recipeDocuments)
		.innerJoin(
			recipeRevisions,
			eq(recipeRevisions.id, recipeDocuments.currentRevisionId),
		)
		.where(inArray(recipeDocuments.id, documentIds))
		.orderBy(asc(recipeDocuments.name));
	if (documents.length !== new Set(documentIds).size) {
		throw new DomainError(
			"NOT_FOUND",
			"One or more recipes were not found.",
			404,
		);
	}
	const recipes = documents.flatMap(({ revision }) =>
		asArray(asObject(revision.beerJson.beerjson).recipes),
	);
	const result = { beerjson: { version: 1, recipes } };
	const validation = validateBeerJson(result);
	if (!validation.valid) {
		throw new DomainError(
			"RECIPE_INVALID",
			"Combined BeerJSON export is invalid.",
			500,
			{ errors: validation.errors },
		);
	}
	return result;
}
