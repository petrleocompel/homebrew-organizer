import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { LabelElement } from "@/server/db/schema";
import type { DomainError } from "@/server/domain/errors";
import {
	validateBackgroundPdf,
	validateLabelElements,
} from "@/server/services/label-service";
import {
	createQrMatrix,
	QR_QUIET_ZONE_MODULES,
	renderQrPng,
	renderQrSvg,
} from "@/server/services/qr-service";

const qr: LabelElement = {
	id: "qr",
	type: "qr",
	xMm: 50,
	yMm: 5,
	widthMm: 25,
	heightMm: 25,
};

describe("QR output", () => {
	const payload = "https://brew.example.com/b/aaaaaaaaaaaaaaaaaaaaaaaaaa";

	it("renders vector modules with a four-module opaque white quiet zone", () => {
		const matrix = createQrMatrix(payload);
		const total = matrix.size + QR_QUIET_ZONE_MODULES * 2;
		const svg = renderQrSvg(payload);
		expect(svg).toContain(`viewBox="0 0 ${total} ${total}"`);
		expect(svg).toContain(`width="${total}" height="${total}" fill="#fff"`);
		expect(svg).toContain('fill="#000"');
		expect(svg).not.toContain("<image");
	});

	it("renders a high-resolution opaque PNG", async () => {
		const png = await renderQrPng(payload, 512);
		expect(Buffer.from(png).subarray(0, 8).toString("hex")).toBe(
			"89504e470d0a1a0a",
		);
	});
});

describe("label preflight", () => {
	it("accepts one safe QR and identity fields", () => {
		expect(() =>
			validateLabelElements("identity", [
				qr,
				{
					id: "number",
					type: "text",
					token: "bottle.number",
					xMm: 5,
					yMm: 5,
					widthMm: 30,
					heightMm: 8,
					fontFamily: "Noto Sans",
					fontSizePt: 12,
					fontWeight: 700,
					color: "#000000",
					align: "left",
					wrap: false,
					visible: true,
				},
			]),
		).not.toThrow();
	});

	it("rejects unsafe QR sizes and batch fields on identity labels", () => {
		expect(() =>
			validateLabelElements("identity", [{ ...qr, widthMm: 19, heightMm: 19 }]),
		).toThrowError(
			expect.objectContaining<Partial<DomainError>>({ code: "QR_UNSAFE" }),
		);
		expect(() =>
			validateLabelElements("identity", [
				qr,
				{
					id: "beer",
					type: "text",
					token: "beer.name",
					xMm: 5,
					yMm: 35,
					widthMm: 50,
					heightMm: 8,
					fontFamily: "Noto Sans",
					fontSizePt: 10,
					fontWeight: 400,
					color: "#000000",
					align: "left",
					wrap: true,
					visible: true,
				},
			]),
		).toThrowError(
			expect.objectContaining<Partial<DomainError>>({
				code: "VALIDATION_FAILED",
			}),
		);
	});

	it("accepts a one-page square PDF and rejects non-square artwork", async () => {
		const square = await PDFDocument.create();
		square.addPage([200, 200]);
		const squareBytes = await square.save();
		await expect(
			validateBackgroundPdf(squareBytes, 1_000_000),
		).resolves.toMatchObject({ width: 200, height: 200 });

		const rectangle = await PDFDocument.create();
		rectangle.addPage([200, 100]);
		await expect(
			validateBackgroundPdf(await rectangle.save(), 1_000_000),
		).rejects.toMatchObject({ code: "PDF_INVALID" });
	});
});
