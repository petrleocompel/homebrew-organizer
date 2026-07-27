import { z } from "zod";
import { DomainError } from "@/server/domain";
import { apiJson, handleApi, parseJson } from "@/server/http/api";
import { acceptInvite, inspectInvite } from "@/server/services/team-service";

export const runtime = "nodejs";

const schema = z.object({
	name: z.string().trim().min(1).max(255),
	password: z.string().min(8).max(128),
});

export async function GET(
	request: Request,
	context: { params: Promise<{ token: string }> },
) {
	return handleApi(request, async () => {
		const { token } = await context.params;
		const invite = await inspectInvite(token);
		if (!invite)
			throw new DomainError("INVITE_INVALID", "Invite is invalid.", 404);
		return apiJson(invite, 200, { "cache-control": "no-store" });
	});
}

export async function POST(
	request: Request,
	context: { params: Promise<{ token: string }> },
) {
	return handleApi(request, async () => {
		const { token } = await context.params;
		const body = await parseJson(request, schema);
		return apiJson(await acceptInvite({ token, ...body }), 201);
	});
}
