import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { type BreweryRole, breweryMembers, sessions } from "@/server/db/schema";
import { DomainError } from "./errors";

export type Permission =
	| "private:read"
	| "bottle:fill"
	| "bottle:manage"
	| "batch:manage"
	| "recipe:manage"
	| "label:manage"
	| "team:manage"
	| "security:manage";

const ROLE_PERMISSIONS: Record<BreweryRole, readonly Permission[]> = {
	viewer: ["private:read"],
	cellar: ["private:read", "bottle:fill"],
	brewer: [
		"private:read",
		"bottle:fill",
		"bottle:manage",
		"batch:manage",
		"recipe:manage",
		"label:manage",
	],
	owner: [
		"private:read",
		"bottle:fill",
		"bottle:manage",
		"batch:manage",
		"recipe:manage",
		"label:manage",
		"team:manage",
		"security:manage",
	],
};

export interface Actor {
	userId: string;
	email: string;
	name: string;
	role: BreweryRole;
	source: "web" | "ios";
}

export function permissionsForRole(role: BreweryRole): Permission[] {
	return [...ROLE_PERMISSIONS[role]];
}

export function roleHasPermission(
	role: BreweryRole,
	permission: Permission,
): boolean {
	return ROLE_PERMISSIONS[role].includes(permission);
}

export async function getMembership(userId: string) {
	const [membership] = await db
		.select()
		.from(breweryMembers)
		.where(eq(breweryMembers.userId, userId))
		.limit(1);
	return membership;
}

export async function requireActor(
	headers: Headers,
	permission: Permission = "private:read",
): Promise<Actor> {
	const session = await auth.api.getSession({ headers });
	if (!session?.user) {
		throw new DomainError(
			"AUTHENTICATION_REQUIRED",
			"Authentication is required.",
			401,
		);
	}

	const membership = await getMembership(session.user.id);
	if (!membership) {
		throw new DomainError("FORBIDDEN", "No brewery membership.", 403);
	}

	if (membership.disabledAt) {
		await db.delete(sessions).where(eq(sessions.userId, session.user.id));
		throw new DomainError(
			"MEMBERSHIP_DISABLED",
			"The brewery membership has been disabled.",
			403,
		);
	}

	if (!roleHasPermission(membership.role, permission)) {
		throw new DomainError(
			"FORBIDDEN",
			"The brewery role does not allow this operation.",
			403,
			{ requiredPermission: permission },
		);
	}

	return {
		userId: session.user.id,
		email: session.user.email,
		name: session.user.name,
		role: membership.role,
		source:
			headers.get("x-homebrew-client")?.toLowerCase() === "ios" ? "ios" : "web",
	};
}
