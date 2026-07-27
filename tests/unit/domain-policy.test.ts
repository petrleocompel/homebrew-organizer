import { describe, expect, it } from "vitest";
import type { BreweryRole } from "@/server/db/schema";
import { requestHash } from "@/server/domain/idempotency";
import {
	type Permission,
	permissionsForRole,
	roleHasPermission,
} from "@/server/domain/permissions";

describe("role policy", () => {
	const expected = {
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
	} satisfies Record<BreweryRole, Permission[]>;
	const roles: BreweryRole[] = ["viewer", "cellar", "brewer", "owner"];

	for (const role of roles) {
		const permissions: readonly Permission[] = expected[role];
		it(`${role} has exactly its documented permissions`, () => {
			expect(permissionsForRole(role)).toEqual(permissions);
			for (const permission of expected.owner) {
				expect(roleHasPermission(role, permission)).toBe(
					permissions.includes(permission),
				);
			}
		});
	}
});

describe("idempotency request hashing", () => {
	it("is independent of object key ordering", () => {
		expect(requestHash({ batchId: "b1", status: "ready" })).toBe(
			requestHash({ status: "ready", batchId: "b1" }),
		);
	});

	it("changes for semantically different input", () => {
		expect(requestHash({ status: "ready" })).not.toBe(
			requestHash({ status: "conditioning" }),
		);
	});
});
