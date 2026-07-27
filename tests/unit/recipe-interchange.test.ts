import { describe, expect, it } from "vitest";
import type { DomainError } from "@/server/domain/errors";
import {
	previewRecipeImport,
	validateBeerJson,
} from "@/server/services/recipe-service";

const validBeerJson = {
	beerjson: {
		version: 1,
		recipes: [
			{
				name: "Žatecký ležák",
				type: "all grain",
				author: "Sládek",
				batch_size: { unit: "l", value: 20 },
				efficiency: { brewhouse: { unit: "%", value: 72 } },
				ingredients: { fermentable_additions: [] },
			},
		],
	},
};

describe("BeerJSON import", () => {
	it("validates a pinned BeerJSON document and preserves Czech text", () => {
		expect(validateBeerJson(validBeerJson)).toEqual({
			valid: true,
			errors: [],
		});
		const preview = previewRecipeImport({
			content: JSON.stringify(validBeerJson),
			fileName: "lezak.beer.json",
			maxBytes: 5_242_880,
		});
		expect(preview.format).toBe("beerjson");
		expect(preview.items).toHaveLength(1);
		expect(preview.items[0]).toMatchObject({
			name: "Žatecký ležák",
			valid: true,
		});
	});

	it("rejects invalid versions and oversized files", () => {
		const invalid = structuredClone(validBeerJson);
		invalid.beerjson.version = "1" as unknown as number;
		expect(validateBeerJson(invalid).valid).toBe(false);
		expect(() =>
			previewRecipeImport({
				content: JSON.stringify(validBeerJson),
				fileName: "recipe.json",
				maxBytes: 5,
			}),
		).toThrowError(
			expect.objectContaining<Partial<DomainError>>({
				code: "UPLOAD_TOO_LARGE",
			}),
		);
	});
});

describe("BeerXML import hardening and preservation", () => {
	const beerXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<RECIPES>
  <RECIPE>
    <NAME>Český ležák</NAME>
    <VERSION>1</VERSION>
    <TYPE>All Grain</TYPE>
    <BREWER>Sládek</BREWER>
    <BATCH_SIZE>20</BATCH_SIZE>
    <BOIL_SIZE>24</BOIL_SIZE>
    <BOIL_TIME>60</BOIL_TIME>
    <EFFICIENCY>72</EFFICIENCY>
    <FERMENTABLES />
    <VENDOR_EXTENSION>retained-value</VENDOR_EXTENSION>
  </RECIPE>
</RECIPES>`;

	it("maps standard fields and retains the complete source recipe extension", () => {
		const preview = previewRecipeImport({
			content: beerXml,
			fileName: "lezak.xml",
			maxBytes: 5_242_880,
		});
		expect(preview.format).toBe("beerxml");
		expect(preview.items[0]).toMatchObject({
			name: "Český ležák",
			valid: true,
			extensions: {
				beerxml: {
					recipe: {
						VENDOR_EXTENSION: "retained-value",
					},
				},
			},
		});
	});

	it("rejects DTD and entity declarations", () => {
		expect(() =>
			previewRecipeImport({
				content:
					'<!DOCTYPE RECIPES [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><RECIPES />',
				fileName: "unsafe.xml",
				maxBytes: 5_242_880,
			}),
		).toThrowError(
			expect.objectContaining<Partial<DomainError>>({
				code: "RECIPE_INVALID",
			}),
		);
	});
});
