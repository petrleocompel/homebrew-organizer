import QRCode from "qrcode";
import { DomainError } from "@/server/domain";

export const QR_QUIET_ZONE_MODULES = 4;

export function createQrMatrix(payload: string) {
	const qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
	return {
		size: qr.modules.size,
		isDark(row: number, column: number): boolean {
			return !!qr.modules.get(row, column);
		},
	};
}

export function renderQrSvg(payload: string): string {
	const matrix = createQrMatrix(payload);
	const total = matrix.size + QR_QUIET_ZONE_MODULES * 2;
	let path = "";
	for (let row = 0; row < matrix.size; row += 1) {
		for (let column = 0; column < matrix.size; column += 1) {
			if (matrix.isDark(row, column)) {
				path += `M${column + QR_QUIET_ZONE_MODULES} ${row + QR_QUIET_ZONE_MODULES}h1v1h-1z`;
			}
		}
	}
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="Bottle QR code">`,
		`<rect width="${total}" height="${total}" fill="#fff"/>`,
		`<path d="${path}" fill="#000"/>`,
		"</svg>",
	].join("");
}

export async function renderQrPng(
	payload: string,
	width = 2048,
): Promise<Uint8Array> {
	if (!Number.isInteger(width) || width < 256 || width > 4096) {
		throw new DomainError(
			"VALIDATION_FAILED",
			"PNG width must be between 256 and 4096 pixels.",
			400,
		);
	}
	return QRCode.toBuffer(payload, {
		errorCorrectionLevel: "M",
		margin: QR_QUIET_ZONE_MODULES,
		width,
		color: { dark: "#000000ff", light: "#ffffffff" },
	});
}
