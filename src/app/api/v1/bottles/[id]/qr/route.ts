import { env } from "@/env";
import { DomainError } from "@/server/domain";
import { requireActor } from "@/server/domain/permissions";
import { handleApi } from "@/server/http/api";
import { getAuthenticatedBottle } from "@/server/services/bottle-service";
import { renderQrPng, renderQrSvg } from "@/server/services/qr-service";

export const runtime = "nodejs";

export async function GET(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	return handleApi(request, async () => {
		await requireActor(request.headers);
		const { id } = await context.params;
		const bottle = await getAuthenticatedBottle(id);
		if (!bottle) throw new DomainError("NOT_FOUND", "Bottle not found.", 404);
		const payload = `${env.PUBLIC_APP_URL.replace(/\/$/, "")}/b/${bottle.publicCode}`;
		const format = new URL(request.url).searchParams.get("format") ?? "svg";
		if (format === "svg") {
			return new Response(renderQrSvg(payload), {
				headers: {
					"content-type": "image/svg+xml; charset=utf-8",
					"content-disposition": `attachment; filename="bottle-${bottle.bottleNumber}-qr.svg"`,
				},
			});
		}
		if (format === "png") {
			const width = Number(
				new URL(request.url).searchParams.get("width") ?? 2048,
			);
			const png = await renderQrPng(payload, width);
			return new Response(Uint8Array.from(png).buffer, {
				headers: {
					"content-type": "image/png",
					"content-disposition": `attachment; filename="bottle-${bottle.bottleNumber}-qr.png"`,
				},
			});
		}
		throw new DomainError(
			"VALIDATION_FAILED",
			"format must be svg or png.",
			400,
		);
	});
}
