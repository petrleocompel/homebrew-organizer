import { relations, sql } from "drizzle-orm";
import { index, pgTableCreator, uniqueIndex } from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `ho_${name}`);

const id = (d: Parameters<Parameters<typeof createTable>[1]>[0]) =>
	d
		.varchar({ length: 255 })
		.notNull()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

const timestamps = (d: Parameters<Parameters<typeof createTable>[1]>[0]) => ({
	createdAt: d
		.timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: d
		.timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export type BreweryRole = "owner" | "brewer" | "cellar" | "viewer";
export type BatchVisibility = "private" | "unlisted" | "listed";
export type BatchStatus =
	| "planning"
	| "brewing"
	| "fermenting"
	| "bottled"
	| "packaging"
	| "conditioning"
	| "ready"
	| "completed"
	| "archived";
export type FillStatus = "filled" | "conditioning" | "ready" | "emptied";
export type EventSource = "web" | "ios" | "migration";

// Better Auth tables
export const users = createTable("user", (d) => ({
	id: id(d),
	name: d.varchar({ length: 255 }).notNull(),
	email: d.varchar({ length: 255 }).notNull().unique(),
	emailVerified: d.boolean().notNull().default(false),
	image: d.varchar({ length: 255 }),
	...timestamps(d),
}));

export const sessions = createTable(
	"session",
	(d) => ({
		id: id(d),
		token: d.varchar({ length: 255 }).notNull().unique(),
		expiresAt: d.timestamp("expires_at", { withTimezone: true }).notNull(),
		ipAddress: d.varchar("ip_address", { length: 255 }),
		userAgent: d.text("user_agent"),
		userId: d
			.varchar("user_id", { length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		...timestamps(d),
	}),
	(t) => [index("session_user_id_idx").on(t.userId)],
);

export const accounts = createTable(
	"account",
	(d) => ({
		id: id(d),
		accountId: d.varchar("account_id", { length: 255 }).notNull(),
		providerId: d.varchar("provider_id", { length: 255 }).notNull(),
		userId: d
			.varchar("user_id", { length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accessToken: d.text("access_token"),
		refreshToken: d.text("refresh_token"),
		accessTokenExpiresAt: d.timestamp("access_token_expires_at", {
			withTimezone: true,
		}),
		refreshTokenExpiresAt: d.timestamp("refresh_token_expires_at", {
			withTimezone: true,
		}),
		scope: d.varchar({ length: 255 }),
		idToken: d.text("id_token"),
		password: d.text(),
		...timestamps(d),
	}),
	(t) => [index("account_user_id_idx").on(t.userId)],
);

export const verifications = createTable("verification", (d) => ({
	id: id(d),
	identifier: d.varchar({ length: 255 }).notNull(),
	value: d.varchar({ length: 255 }).notNull(),
	expiresAt: d.timestamp("expires_at", { withTimezone: true }).notNull(),
	...timestamps(d),
}));

// Single-brewery membership and invitations
export const breweryMembers = createTable(
	"brewery_members",
	(d) => ({
		userId: d
			.varchar("user_id", { length: 255 })
			.notNull()
			.primaryKey()
			.references(() => users.id, { onDelete: "cascade" }),
		role: d.varchar({ length: 32 }).notNull().$type<BreweryRole>(),
		createdAt: d
			.timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		disabledAt: d.timestamp("disabled_at", { withTimezone: true }),
	}),
	(t) => [index("brewery_members_role_idx").on(t.role)],
);

export const breweryInvites = createTable(
	"brewery_invites",
	(d) => ({
		id: id(d),
		tokenHash: d.varchar("token_hash", { length: 64 }).notNull().unique(),
		intendedEmail: d.varchar("intended_email", { length: 255 }).notNull(),
		role: d.varchar({ length: 32 }).notNull().$type<BreweryRole>(),
		createdBy: d
			.varchar("created_by", { length: 255 })
			.notNull()
			.references(() => users.id),
		expiresAt: d.timestamp("expires_at", { withTimezone: true }).notNull(),
		acceptedAt: d.timestamp("accepted_at", { withTimezone: true }),
		acceptedBy: d
			.varchar("accepted_by", { length: 255 })
			.references(() => users.id),
		createdAt: d
			.timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	}),
	(t) => [
		index("brewery_invites_email_idx").on(t.intendedEmail),
		index("brewery_invites_expiry_idx").on(t.expiresAt),
	],
);

export const auditEvents = createTable(
	"audit_events",
	(d) => ({
		id: id(d),
		eventType: d.varchar("event_type", { length: 120 }).notNull(),
		entityType: d.varchar("entity_type", { length: 80 }).notNull(),
		entityId: d.varchar("entity_id", { length: 255 }).notNull(),
		actorUserId: d
			.varchar("actor_user_id", { length: 255 })
			.references(() => users.id),
		source: d
			.varchar({ length: 20 })
			.notNull()
			.default("web")
			.$type<EventSource>(),
		metadata: d.jsonb().notNull().default({}).$type<Record<string, unknown>>(),
		occurredAt: d
			.timestamp("occurred_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	}),
	(t) => [
		index("audit_events_entity_time_idx").on(
			t.entityType,
			t.entityId,
			t.occurredAt,
		),
		index("audit_events_actor_time_idx").on(t.actorUserId, t.occurredAt),
	],
);

export const idempotencyRequests = createTable(
	"idempotency_requests",
	(d) => ({
		id: id(d),
		actorUserId: d
			.varchar("actor_user_id", { length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		operation: d.varchar({ length: 120 }).notNull(),
		key: d.uuid().notNull(),
		requestHash: d.varchar("request_hash", { length: 64 }).notNull(),
		responseStatus: d.integer("response_status").notNull(),
		responseBody: d.jsonb("response_body").notNull().$type<unknown>(),
		createdAt: d
			.timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expiresAt: d.timestamp("expires_at", { withTimezone: true }).notNull(),
	}),
	(t) => [
		uniqueIndex("idempotency_actor_operation_key_uidx").on(
			t.actorUserId,
			t.operation,
			t.key,
		),
		index("idempotency_expiry_idx").on(t.expiresAt),
	],
);

// Canonical immutable recipe documents
export const recipeDocuments = createTable(
	"recipe_documents",
	(d) => ({
		id: id(d),
		name: d.varchar({ length: 255 }).notNull(),
		currentRevisionId: d.varchar("current_revision_id", { length: 255 }),
		archivedAt: d.timestamp("archived_at", { withTimezone: true }),
		createdBy: d
			.varchar("created_by", { length: 255 })
			.notNull()
			.references(() => users.id),
		...timestamps(d),
	}),
	(t) => [index("recipe_documents_archived_idx").on(t.archivedAt)],
);

export const recipeRevisions = createTable(
	"recipe_revisions",
	(d) => ({
		id: id(d),
		documentId: d
			.varchar("document_id", { length: 255 })
			.notNull()
			.references(() => recipeDocuments.id),
		revision: d.integer().notNull(),
		beerJson: d.jsonb("beer_json").notNull().$type<Record<string, unknown>>(),
		beerXmlExtensions: d
			.jsonb("beer_xml_extensions")
			.notNull()
			.default({})
			.$type<Record<string, unknown>>(),
		schemaVersion: d
			.varchar("schema_version", { length: 20 })
			.notNull()
			.default("1.0"),
		createdBy: d
			.varchar("created_by", { length: 255 })
			.notNull()
			.references(() => users.id),
		revisionMessage: d.text("revision_message"),
		originalFileName: d.varchar("original_file_name", { length: 255 }),
		originalFileBase64: d.text("original_file_base64"),
		originalChecksum: d.varchar("original_checksum", { length: 64 }),
		createdAt: d
			.timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	}),
	(t) => [
		uniqueIndex("recipe_revision_document_number_uidx").on(
			t.documentId,
			t.revision,
		),
		index("recipe_revision_document_idx").on(t.documentId),
	],
);

// Batches retain legacy columns for one compatibility release.
export const batches = createTable(
	"batches",
	(d) => ({
		id: id(d),
		batchNumber: d.integer("batch_number").notNull().unique(),
		name: d.varchar("name").notNull(),
		description: d.text("description").notNull().default(""),
		note: d.text("note").notNull().default(""),
		publicName: d.varchar("public_name", { length: 255 }),
		publicDescription: d.text("public_description"),
		privateNotes: d.text("private_notes"),
		visibility: d
			.varchar({ length: 20 })
			.notNull()
			.default("unlisted")
			.$type<BatchVisibility>(),
		status: d
			.varchar("status")
			.notNull()
			.default("planning")
			.$type<BatchStatus>(),
		recipeRevisionId: d
			.varchar("recipe_revision_id", { length: 255 })
			.references(() => recipeRevisions.id),
		plannedAt: d.timestamp("planned_at", { withTimezone: true }),
		brewedAt: d.timestamp("brewed_at", { withTimezone: true }),
		fermentationStartedAt: d.timestamp("fermentation_started_at", {
			withTimezone: true,
		}),
		packagedAt: d.timestamp("packaged_at", { withTimezone: true }),
		readyAt: d.timestamp("ready_at", { withTimezone: true }),
		completedAt: d.timestamp("completed_at", { withTimezone: true }),
		targetVolumeMl: d.integer("target_volume_ml"),
		actualVolumeMl: d.integer("actual_volume_ml"),
		styleName: d.varchar("style_name", { length: 255 }),
		abv: d.numeric({ precision: 5, scale: 2 }),
		created: d
			.timestamp("created", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updated: d
			.timestamp("updated", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	}),
	(t) => [
		index("batches_status_idx").on(t.status),
		index("batches_visibility_idx").on(t.visibility),
		index("batches_recipe_revision_idx").on(t.recipeRevisionId),
	],
);

export const batchMeasurements = createTable(
	"batch_measurements",
	(d) => ({
		id: id(d),
		batchId: d
			.varchar("batch_id", { length: 255 })
			.notNull()
			.references(() => batches.id),
		kind: d
			.varchar({ length: 32 })
			.notNull()
			.$type<"gravity" | "temperature" | "ph" | "volume">(),
		originalValue: d
			.numeric("original_value", {
				precision: 14,
				scale: 5,
			})
			.notNull(),
		originalUnit: d.varchar("original_unit", { length: 24 }).notNull(),
		normalizedValue: d
			.numeric("normalized_value", { precision: 14, scale: 5 })
			.notNull(),
		normalizedUnit: d.varchar("normalized_unit", { length: 24 }).notNull(),
		measuredAt: d.timestamp("measured_at", { withTimezone: true }).notNull(),
		actorUserId: d
			.varchar("actor_user_id", { length: 255 })
			.notNull()
			.references(() => users.id),
		note: d.text(),
		createdAt: d
			.timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	}),
	(t) => [
		index("batch_measurements_batch_time_idx").on(t.batchId, t.measuredAt),
	],
);

export const batchEvents = createTable(
	"batch_events",
	(d) => ({
		id: id(d),
		batchId: d
			.varchar("batch_id", { length: 255 })
			.notNull()
			.references(() => batches.id),
		eventType: d.varchar("event_type", { length: 80 }).notNull(),
		actorUserId: d
			.varchar("actor_user_id", { length: 255 })
			.references(() => users.id),
		source: d
			.varchar({ length: 20 })
			.notNull()
			.default("web")
			.$type<EventSource>(),
		metadata: d.jsonb().notNull().default({}).$type<Record<string, unknown>>(),
		occurredAt: d
			.timestamp("occurred_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	}),
	(t) => [index("batch_events_batch_time_idx").on(t.batchId, t.occurredAt)],
);

// Physical bottles and permanent public identities.
export const bottles = createTable(
	"bottles",
	(d) => ({
		id: id(d),
		bottleNumber: d.integer("bottle_number").notNull().unique(),
		displayName: d.varchar("display_name", { length: 255 }),
		volumeMl: d.integer("volume_ml").notNull().default(500),
		color: d.varchar({ length: 80 }),
		closureType: d.varchar("closure_type", { length: 80 }),
		location: d.varchar({ length: 255 }),
		privateNotes: d.text("private_notes"),
		retiredAt: d.timestamp("retired_at", { withTimezone: true }),
		// Legacy compatibility fields. New code derives state from active fills.
		status: d
			.varchar("status")
			.notNull()
			.default("empty")
			.$type<"empty" | "filled" | "conditioning" | "ready">(),
		label: d.varchar("label"),
		currentBatchId: d
			.varchar("currentBatchId", { length: 255 })
			.references(() => batches.id),
		created: d
			.timestamp("created", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updated: d
			.timestamp("updated", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	}),
	(t) => [
		index("bottles_retired_idx").on(t.retiredAt),
		index("bottles_current_batch_idx").on(t.currentBatchId),
	],
);

export const bottlePublicCodes = createTable(
	"bottle_public_codes",
	(d) => ({
		id: id(d),
		bottleId: d
			.varchar("bottle_id", { length: 255 })
			.notNull()
			.references(() => bottles.id),
		code: d.varchar({ length: 26 }).notNull().unique(),
		issuedAt: d
			.timestamp("issued_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		revokedAt: d.timestamp("revoked_at", { withTimezone: true }),
		issuedBy: d
			.varchar("issued_by", { length: 255 })
			.references(() => users.id),
	}),
	(t) => [
		uniqueIndex("bottle_public_codes_one_active_uidx")
			.on(t.bottleId)
			.where(sql`${t.revokedAt} is null`),
		index("bottle_public_codes_bottle_idx").on(t.bottleId),
	],
);

export const bottleAliases = createTable(
	"bottle_aliases",
	(d) => ({
		id: id(d),
		bottleId: d
			.varchar("bottle_id", { length: 255 })
			.notNull()
			.references(() => bottles.id),
		locator: d.varchar({ length: 255 }).notNull().unique(),
		kind: d
			.varchar({ length: 24 })
			.notNull()
			.$type<"numeric" | "old_uuid" | "old_label">(),
		createdAt: d
			.timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	}),
	(t) => [index("bottle_aliases_bottle_idx").on(t.bottleId)],
);

export const bottleFills = createTable(
	"bottle_fills",
	(d) => ({
		id: id(d),
		bottleId: d
			.varchar("bottle_id", { length: 255 })
			.notNull()
			.references(() => bottles.id),
		batchId: d
			.varchar("batch_id", { length: 255 })
			.notNull()
			.references(() => batches.id),
		status: d
			.varchar({ length: 24 })
			.notNull()
			.default("filled")
			.$type<FillStatus>(),
		filledAt: d
			.timestamp("filled_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expectedReadyAt: d.timestamp("expected_ready_at", {
			withTimezone: true,
		}),
		readyAt: d.timestamp("ready_at", { withTimezone: true }),
		emptiedAt: d.timestamp("emptied_at", { withTimezone: true }),
		privateNotes: d.text("private_notes"),
		source: d
			.varchar({ length: 20 })
			.notNull()
			.default("web")
			.$type<EventSource>(),
		historyApproximate: d
			.boolean("history_approximate")
			.notNull()
			.default(false),
		createdBy: d
			.varchar("created_by", { length: 255 })
			.references(() => users.id),
		createdAt: d
			.timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	}),
	(t) => [
		uniqueIndex("bottle_fills_one_active_uidx")
			.on(t.bottleId)
			.where(sql`${t.emptiedAt} is null`),
		index("bottle_fills_bottle_time_idx").on(t.bottleId, t.filledAt),
		index("bottle_fills_batch_idx").on(t.batchId),
	],
);

export const bottleEvents = createTable(
	"bottle_events",
	(d) => ({
		id: id(d),
		bottleId: d
			.varchar("bottle_id", { length: 255 })
			.notNull()
			.references(() => bottles.id),
		fillId: d
			.varchar("fill_id", { length: 255 })
			.references(() => bottleFills.id),
		batchId: d
			.varchar("batch_id", { length: 255 })
			.references(() => batches.id),
		eventType: d.varchar("event_type", { length: 80 }).notNull(),
		actorUserId: d
			.varchar("actor_user_id", { length: 255 })
			.references(() => users.id),
		source: d.varchar({ length: 20 }).notNull().$type<EventSource>(),
		visibility: d
			.varchar({ length: 16 })
			.notNull()
			.default("private")
			.$type<"public" | "private">(),
		metadata: d.jsonb().notNull().default({}).$type<Record<string, unknown>>(),
		occurredAt: d
			.timestamp("occurred_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	}),
	(t) => [
		index("bottle_events_bottle_time_idx").on(t.bottleId, t.occurredAt),
		index("bottle_events_fill_idx").on(t.fillId),
	],
);

// Kept read-only during the compatibility release.
export const batchBottles = createTable(
	"batch_bottles",
	(d) => ({
		id: id(d),
		batchId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => batches.id),
		bottleId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => bottles.id),
		created: d
			.timestamp("created", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updated: d
			.timestamp("updated", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	}),
	(t) => [
		index("batch_bottles_batch_idx").on(t.batchId),
		index("batch_bottles_bottle_idx").on(t.bottleId),
	],
);

// Sticker templates are immutable through version rows.
export const labelTemplates = createTable(
	"label_templates",
	(d) => ({
		id: id(d),
		name: d.varchar({ length: 255 }).notNull(),
		type: d.varchar({ length: 16 }).notNull().$type<"identity" | "batch">(),
		currentVersionId: d.varchar("current_version_id", { length: 255 }),
		archivedAt: d.timestamp("archived_at", { withTimezone: true }),
		createdBy: d
			.varchar("created_by", { length: 255 })
			.notNull()
			.references(() => users.id),
		...timestamps(d),
	}),
	(t) => [index("label_templates_archived_idx").on(t.archivedAt)],
);

export type LabelElement =
	| {
			id: string;
			type: "qr";
			xMm: number;
			yMm: number;
			widthMm: number;
			heightMm: number;
	  }
	| {
			id: string;
			type: "text";
			token: string;
			xMm: number;
			yMm: number;
			widthMm: number;
			heightMm: number;
			fontFamily: "Noto Sans";
			fontSizePt: number;
			fontWeight: 400 | 700;
			color: string;
			align: "left" | "center" | "right";
			wrap: boolean;
			visible: boolean;
	  };

export const labelTemplateVersions = createTable(
	"label_template_versions",
	(d) => ({
		id: id(d),
		templateId: d
			.varchar("template_id", { length: 255 })
			.notNull()
			.references(() => labelTemplates.id),
		version: d.integer().notNull(),
		backgroundPdfBase64: d.text("background_pdf_base64").notNull(),
		backgroundChecksum: d
			.varchar("background_checksum", { length: 64 })
			.notNull(),
		sourceWidthPt: d
			.numeric("source_width_pt", { precision: 12, scale: 4 })
			.notNull(),
		sourceHeightPt: d
			.numeric("source_height_pt", { precision: 12, scale: 4 })
			.notNull(),
		elements: d.jsonb().notNull().$type<LabelElement[]>(),
		createdBy: d
			.varchar("created_by", { length: 255 })
			.notNull()
			.references(() => users.id),
		createdAt: d
			.timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	}),
	(t) => [
		uniqueIndex("label_template_version_uidx").on(t.templateId, t.version),
		index("label_template_versions_template_idx").on(t.templateId),
	],
);

export const printRuns = createTable(
	"print_runs",
	(d) => ({
		id: id(d),
		templateVersionId: d
			.varchar("template_version_id", { length: 255 })
			.notNull()
			.references(() => labelTemplateVersions.id),
		batchId: d
			.varchar("batch_id", { length: 255 })
			.references(() => batches.id),
		runNumber: d.integer("run_number").notNull().default(1),
		runCount: d.integer("run_count").notNull().default(1),
		itemCount: d.integer("item_count").notNull(),
		duplicateIdentityConfirmed: d
			.boolean("duplicate_identity_confirmed")
			.notNull()
			.default(false),
		createdBy: d
			.varchar("created_by", { length: 255 })
			.notNull()
			.references(() => users.id),
		createdAt: d
			.timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	}),
	(t) => [index("print_runs_created_idx").on(t.createdAt)],
);

export const printRunItems = createTable(
	"print_run_items",
	(d) => ({
		id: id(d),
		printRunId: d
			.varchar("print_run_id", { length: 255 })
			.notNull()
			.references(() => printRuns.id, { onDelete: "cascade" }),
		bottleId: d
			.varchar("bottle_id", { length: 255 })
			.notNull()
			.references(() => bottles.id),
		pageNumber: d.integer("page_number").notNull(),
		fileName: d.varchar("file_name", { length: 255 }).notNull(),
		snapshot: d.jsonb().notNull().$type<Record<string, unknown>>(),
	}),
	(t) => [
		uniqueIndex("print_run_item_page_uidx").on(t.printRunId, t.pageNumber),
		index("print_run_items_bottle_idx").on(t.bottleId),
	],
);

export const usersRelations = relations(users, ({ many, one }) => ({
	accounts: many(accounts),
	sessions: many(sessions),
	membership: one(breweryMembers, {
		fields: [users.id],
		references: [breweryMembers.userId],
	}),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const breweryMembersRelations = relations(breweryMembers, ({ one }) => ({
	user: one(users, {
		fields: [breweryMembers.userId],
		references: [users.id],
	}),
}));

export const recipeDocumentsRelations = relations(
	recipeDocuments,
	({ many }) => ({
		revisions: many(recipeRevisions),
	}),
);

export const recipeRevisionsRelations = relations(
	recipeRevisions,
	({ one, many }) => ({
		document: one(recipeDocuments, {
			fields: [recipeRevisions.documentId],
			references: [recipeDocuments.id],
		}),
		batches: many(batches),
	}),
);

export const batchesRelations = relations(batches, ({ one, many }) => ({
	recipeRevision: one(recipeRevisions, {
		fields: [batches.recipeRevisionId],
		references: [recipeRevisions.id],
	}),
	fills: many(bottleFills),
	measurements: many(batchMeasurements),
	events: many(batchEvents),
}));

export const bottlesRelations = relations(bottles, ({ many }) => ({
	publicCodes: many(bottlePublicCodes),
	aliases: many(bottleAliases),
	fills: many(bottleFills),
	events: many(bottleEvents),
}));

export const bottleFillsRelations = relations(bottleFills, ({ one, many }) => ({
	bottle: one(bottles, {
		fields: [bottleFills.bottleId],
		references: [bottles.id],
	}),
	batch: one(batches, {
		fields: [bottleFills.batchId],
		references: [batches.id],
	}),
	events: many(bottleEvents),
}));

export const labelTemplatesRelations = relations(
	labelTemplates,
	({ many }) => ({
		versions: many(labelTemplateVersions),
	}),
);

export const printRunsRelations = relations(printRuns, ({ many }) => ({
	items: many(printRunItems),
}));
