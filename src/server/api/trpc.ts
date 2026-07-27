/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { breweryMembers } from "@/server/db/schema";
import { isDomainError } from "@/server/domain/errors";
import {
	type Permission,
	roleHasPermission,
} from "@/server/domain/permissions";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
	const session = await auth.api.getSession({ headers: opts.headers });
	const membership = session?.user
		? (
				await db
					.select()
					.from(breweryMembers)
					.where(eq(breweryMembers.userId, session.user.id))
					.limit(1)
			)[0]
		: undefined;

	return {
		db,
		session,
		membership,
		requestId: opts.headers.get("x-request-id") ?? crypto.randomUUID(),
		...opts,
	};
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path, ctx }) => {
	const start = Date.now();

	if (t._config.isDev) {
		// artificial delay in dev
		const waitMs = Math.floor(Math.random() * 400) + 100;
		await new Promise((resolve) => setTimeout(resolve, waitMs));
	}

	const result = await next();

	const end = Date.now();
	console.log(
		JSON.stringify({
			level: "info",
			type: "trpc_request",
			path,
			durationMs: end - start,
			requestId: ctx.requestId,
			actorUserId: ctx.session?.user.id ?? null,
		}),
	);

	return result;
});

const domainErrorMiddleware = t.middleware(async ({ next }) => {
	try {
		return await next();
	} catch (error) {
		if (!isDomainError(error)) throw error;
		const code =
			error.status === 401
				? "UNAUTHORIZED"
				: error.status === 403
					? "FORBIDDEN"
					: error.status === 404
						? "NOT_FOUND"
						: error.status === 409
							? "CONFLICT"
							: error.status === 413
								? "PAYLOAD_TOO_LARGE"
								: "BAD_REQUEST";
		throw new TRPCError({ code, message: error.message, cause: error });
	}
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure
	.use(timingMiddleware)
	.use(domainErrorMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
	.use(timingMiddleware)
	.use(domainErrorMiddleware)
	.use(({ ctx, next }) => {
		if (!ctx.session?.user) {
			throw new TRPCError({ code: "UNAUTHORIZED" });
		}
		if (!ctx.membership || ctx.membership.disabledAt) {
			throw new TRPCError({ code: "FORBIDDEN" });
		}
		return next({
			ctx: {
				// infers the `session` as non-nullable
				session: { ...ctx.session, user: ctx.session.user },
				membership: ctx.membership,
			},
		});
	});

function procedureWithPermission(permission: Permission) {
	return protectedProcedure.use(({ ctx, next }) => {
		if (!roleHasPermission(ctx.membership.role, permission)) {
			throw new TRPCError({ code: "FORBIDDEN" });
		}
		return next({ ctx });
	});
}

export const viewerProcedure = protectedProcedure;
export const cellarProcedure = procedureWithPermission("bottle:fill");
export const brewerProcedure = procedureWithPermission("batch:manage");
export const recipeProcedure = procedureWithPermission("recipe:manage");
export const labelProcedure = procedureWithPermission("label:manage");
export const ownerProcedure = procedureWithPermission("team:manage");
