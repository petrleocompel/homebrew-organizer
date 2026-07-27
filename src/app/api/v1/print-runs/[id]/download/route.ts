import { DomainError } from "@/server/domain";
import { requireActor } from "@/server/domain/permissions";
import { handleApi } from "@/server/http/api";
import { downloadPrintRun } from "@/server/services/label-service";

export const runtime = "nodejs";

export async function GET(
	request: Request,
	context: { params: Promise<{ id: string }> },
) {
	return handleApi(request, async () => {
		await requireActor(request.headers, "label:manage");
		const { id } = await context.params;
		const format = new URL(request.url).searchParams.get("format") ?? "pdf";
		if (format !== "pdf" && format !== "zip") {
			throw new DomainError(
				"VALIDATION_FAILED",
				"format must be pdf or zip.",
				400,
			);
		}
		const download = await downloadPrintRun(id, format);
		return new Response(Uint8Array.from(download.bytes).buffer, {
			headers: {
				"content-type": download.contentType,
				"content-disposition": `attachment; filename="${download.fileName}"`,
				"cache-control": "private, no-store",
			},
		});
	});
}
