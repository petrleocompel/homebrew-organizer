import { createHash, randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import {
	accounts,
	auditEvents,
	type BreweryRole,
	batchEvents,
	bottleEvents,
	breweryInvites,
	breweryMembers,
	sessions,
	users,
} from "@/server/db/schema";
import { DomainError } from "@/server/domain/errors";
import type { DbTransaction } from "@/server/domain/idempotency";

function tokenHash(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

export async function createInvite(input: {
	email: string;
	role: BreweryRole;
	createdBy: string;
	publicAppUrl: string;
}) {
	const token = randomBytes(32).toString("base64url");
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
	const [invite] = await db.transaction(async (tx) => {
		const rows = await tx
			.insert(breweryInvites)
			.values({
				tokenHash: tokenHash(token),
				intendedEmail: input.email.trim().toLowerCase(),
				role: input.role,
				createdBy: input.createdBy,
				expiresAt,
			})
			.returning();
		const created = rows[0];
		if (created) {
			await tx.insert(auditEvents).values({
				eventType: "team_invite_created",
				entityType: "brewery_invite",
				entityId: created.id,
				actorUserId: input.createdBy,
				metadata: { role: created.role },
			});
		}
		return rows;
	});
	if (!invite) throw new Error("Invite insert returned no row.");
	return {
		id: invite.id,
		email: invite.intendedEmail,
		role: invite.role,
		expiresAt: invite.expiresAt.toISOString(),
		url: `${input.publicAppUrl.replace(/\/$/, "")}/invite/${token}`,
	};
}

export async function inspectInvite(token: string) {
	if (!token || token.length > 256) return null;
	const [invite] = await db
		.select({
			id: breweryInvites.id,
			email: breweryInvites.intendedEmail,
			role: breweryInvites.role,
			expiresAt: breweryInvites.expiresAt,
			acceptedAt: breweryInvites.acceptedAt,
		})
		.from(breweryInvites)
		.where(eq(breweryInvites.tokenHash, tokenHash(token)))
		.limit(1);
	if (!invite || invite.acceptedAt || invite.expiresAt <= new Date())
		return null;
	return {
		...invite,
		expiresAt: invite.expiresAt.toISOString(),
		acceptedAt: null,
	};
}

export async function acceptInvite(input: {
	token: string;
	name: string;
	password: string;
}) {
	const hash = tokenHash(input.token);
	const [invite] = await db
		.select()
		.from(breweryInvites)
		.where(
			and(
				eq(breweryInvites.tokenHash, hash),
				isNull(breweryInvites.acceptedAt),
			),
		)
		.limit(1);
	if (!invite) {
		throw new DomainError("INVITE_INVALID", "Invite is invalid.", 404);
	}
	if (invite.expiresAt <= new Date()) {
		throw new DomainError("INVITE_EXPIRED", "Invite has expired.", 410);
	}
	const [existing] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, invite.intendedEmail))
		.limit(1);
	if (existing) {
		throw new DomainError(
			"CONFLICT",
			"An account already exists for this email.",
			409,
		);
	}

	const signUp = await auth.api.signUpEmail({
		body: {
			email: invite.intendedEmail,
			password: input.password,
			name: input.name,
		},
	});
	const userId = signUp.user.id;
	try {
		await db.transaction(async (tx) => {
			const [locked] = await tx
				.select()
				.from(breweryInvites)
				.where(
					and(
						eq(breweryInvites.id, invite.id),
						isNull(breweryInvites.acceptedAt),
						gt(breweryInvites.expiresAt, new Date()),
					),
				)
				.limit(1)
				.for("update");
			if (!locked) {
				throw new DomainError(
					"INVITE_INVALID",
					"Invite was already used or expired.",
					409,
				);
			}
			await tx.insert(breweryMembers).values({
				userId,
				role: locked.role,
			});
			await tx
				.update(breweryInvites)
				.set({ acceptedAt: new Date(), acceptedBy: userId })
				.where(eq(breweryInvites.id, locked.id));
			// The internal sign-up call creates a session that was never exposed
			// to the invitee. Require an explicit sign-in after acceptance.
			await tx.delete(sessions).where(eq(sessions.userId, userId));
			await tx.insert(auditEvents).values({
				eventType: "team_invite_accepted",
				entityType: "brewery_member",
				entityId: userId,
				actorUserId: userId,
				metadata: { role: locked.role, inviteId: locked.id },
			});
		});
	} catch (error) {
		await db.transaction(async (tx) => {
			await tx.delete(sessions).where(eq(sessions.userId, userId));
			await tx.delete(accounts).where(eq(accounts.userId, userId));
			await tx.delete(users).where(eq(users.id, userId));
		});
		throw error;
	}
	return { userId, email: invite.intendedEmail, role: invite.role };
}

export async function listTeam() {
	const [members, invites] = await Promise.all([
		db
			.select({
				userId: users.id,
				name: users.name,
				email: users.email,
				role: breweryMembers.role,
				createdAt: breweryMembers.createdAt,
				disabledAt: breweryMembers.disabledAt,
			})
			.from(breweryMembers)
			.innerJoin(users, eq(users.id, breweryMembers.userId))
			.orderBy(asc(users.name)),
		db
			.select({
				id: breweryInvites.id,
				email: breweryInvites.intendedEmail,
				role: breweryInvites.role,
				expiresAt: breweryInvites.expiresAt,
				acceptedAt: breweryInvites.acceptedAt,
				createdAt: breweryInvites.createdAt,
			})
			.from(breweryInvites)
			.orderBy(desc(breweryInvites.createdAt))
			.limit(100),
	]);
	return { members, invites };
}

async function assertAnotherOwner(tx: DbTransaction, targetUserId: string) {
	const [result] = await tx
		.select({ value: count() })
		.from(breweryMembers)
		.where(
			and(eq(breweryMembers.role, "owner"), isNull(breweryMembers.disabledAt)),
		);
	const [target] = await tx
		.select()
		.from(breweryMembers)
		.where(eq(breweryMembers.userId, targetUserId))
		.limit(1);
	if (target?.role === "owner" && (result?.value ?? 0) <= 1) {
		throw new DomainError(
			"CONFLICT",
			"The brewery must retain at least one active owner.",
			409,
		);
	}
}

export async function setMemberRole(
	userId: string,
	role: BreweryRole,
	actorUserId: string,
) {
	return db.transaction(async (tx) => {
		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtext('homebrew:active-owner'))`,
		);
		await assertAnotherOwner(tx, userId);
		const [previous] = await tx
			.select()
			.from(breweryMembers)
			.where(eq(breweryMembers.userId, userId))
			.limit(1)
			.for("update");
		if (!previous) throw new DomainError("NOT_FOUND", "Member not found.", 404);
		const [member] = await tx
			.update(breweryMembers)
			.set({ role })
			.where(eq(breweryMembers.userId, userId))
			.returning();
		if (!member) throw new DomainError("NOT_FOUND", "Member not found.", 404);
		await tx.insert(auditEvents).values({
			eventType: "team_member_role_changed",
			entityType: "brewery_member",
			entityId: userId,
			actorUserId,
			metadata: { from: previous.role, to: role },
		});
		return member;
	});
}

export async function setMemberDisabled(
	userId: string,
	disabled: boolean,
	actorUserId: string,
) {
	return db.transaction(async (tx) => {
		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtext('homebrew:active-owner'))`,
		);
		if (disabled) await assertAnotherOwner(tx, userId);
		const [member] = await tx
			.update(breweryMembers)
			.set({ disabledAt: disabled ? new Date() : null })
			.where(eq(breweryMembers.userId, userId))
			.returning();
		if (!member) throw new DomainError("NOT_FOUND", "Member not found.", 404);
		if (disabled) {
			await tx.delete(sessions).where(eq(sessions.userId, userId));
		}
		await tx.insert(auditEvents).values({
			eventType: disabled ? "team_member_disabled" : "team_member_enabled",
			entityType: "brewery_member",
			entityId: userId,
			actorUserId,
			metadata: {},
		});
		return member;
	});
}

export async function recentActorActivity() {
	const [bottleActivity, batchActivity, auditActivity] = await Promise.all([
		db
			.select({
				id: bottleEvents.id,
				type: bottleEvents.eventType,
				actorUserId: bottleEvents.actorUserId,
				source: bottleEvents.source,
				timestamp: bottleEvents.occurredAt,
			})
			.from(bottleEvents)
			.orderBy(desc(bottleEvents.occurredAt))
			.limit(50),
		db
			.select({
				id: batchEvents.id,
				type: batchEvents.eventType,
				actorUserId: batchEvents.actorUserId,
				source: batchEvents.source,
				timestamp: batchEvents.occurredAt,
			})
			.from(batchEvents)
			.orderBy(desc(batchEvents.occurredAt))
			.limit(50),
		db
			.select({
				id: auditEvents.id,
				type: auditEvents.eventType,
				actorUserId: auditEvents.actorUserId,
				source: auditEvents.source,
				timestamp: auditEvents.occurredAt,
			})
			.from(auditEvents)
			.orderBy(desc(auditEvents.occurredAt))
			.limit(50),
	]);
	return [...bottleActivity, ...batchActivity, ...auditActivity]
		.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
		.slice(0, 50);
}
