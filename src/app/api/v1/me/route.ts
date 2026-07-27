import { env } from "@/env";
import { permissionsForRole, requireActor } from "@/server/domain/permissions";
import { apiJson, handleApi, serverCapabilities } from "@/server/http/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
	return handleApi(request, async () => {
		const actor = await requireActor(request.headers);
		return apiJson({
			user: { id: actor.userId, name: actor.name, email: actor.email },
			role: actor.role,
			permissions: permissionsForRole(actor.role),
			capabilities: {
				...serverCapabilities(),
				allowedQrHosts: env.ALLOWED_QR_HOSTS.split(",")
					.map((host) => host.trim().toLowerCase())
					.filter(Boolean),
			},
		});
	});
}
