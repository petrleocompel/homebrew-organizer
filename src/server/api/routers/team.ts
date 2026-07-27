import { z } from "zod";
import { env } from "@/env";
import { createTRPCRouter, ownerProcedure } from "@/server/api/trpc";
import {
	createInvite,
	listTeam,
	recentActorActivity,
	setMemberDisabled,
	setMemberRole,
} from "@/server/services/team-service";

const role = z.enum(["owner", "brewer", "cellar", "viewer"]);

export const teamRouter = createTRPCRouter({
	list: ownerProcedure.query(listTeam),
	recentActivity: ownerProcedure.query(recentActorActivity),

	invite: ownerProcedure
		.input(z.object({ email: z.email(), role }))
		.mutation(({ ctx, input }) =>
			createInvite({
				...input,
				createdBy: ctx.session.user.id,
				publicAppUrl: env.PUBLIC_APP_URL,
			}),
		),

	setRole: ownerProcedure
		.input(z.object({ userId: z.string(), role }))
		.mutation(({ ctx, input }) =>
			setMemberRole(input.userId, input.role, ctx.session.user.id),
		),

	setDisabled: ownerProcedure
		.input(z.object({ userId: z.string(), disabled: z.boolean() }))
		.mutation(({ ctx, input }) =>
			setMemberDisabled(input.userId, input.disabled, ctx.session.user.id),
		),
});
