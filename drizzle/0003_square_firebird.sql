CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
DO $$
DECLARE
	duplicate_bottles text;
	duplicate_batches text;
BEGIN
	SELECT string_agg(format('%s (%s rows)', bottle_number, row_count), ', ')
	INTO duplicate_bottles
	FROM (
		SELECT bottle_number, count(*) AS row_count
		FROM "ho_bottles"
		GROUP BY bottle_number
		HAVING count(*) > 1
	) duplicate_rows;

	SELECT string_agg(format('%s (%s rows)', batch_number, row_count), ', ')
	INTO duplicate_batches
	FROM (
		SELECT batch_number, count(*) AS row_count
		FROM "ho_batches"
		GROUP BY batch_number
		HAVING count(*) > 1
	) duplicate_rows;

	IF duplicate_bottles IS NOT NULL OR duplicate_batches IS NOT NULL THEN
		RAISE EXCEPTION
			'Homebrew domain migration blocked. Duplicate bottle numbers: %. Duplicate batch numbers: %.',
			coalesce(duplicate_bottles, 'none'),
			coalesce(duplicate_batches, 'none');
	END IF;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION ho_generate_public_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
	alphabet constant text := 'abcdefghijklmnopqrstuvwxyz234567';
	input_bytes bytea := gen_random_bytes(16);
	bit_buffer bigint := 0;
	bit_count integer := 0;
	result text := '';
	byte_index integer;
BEGIN
	FOR byte_index IN 0..15 LOOP
		bit_buffer := (bit_buffer << 8) | get_byte(input_bytes, byte_index);
		bit_count := bit_count + 8;

		WHILE bit_count >= 5 LOOP
			result := result || substr(
				alphabet,
				(((bit_buffer >> (bit_count - 5)) & 31) + 1)::integer,
				1
			);
			bit_count := bit_count - 5;
			bit_buffer := bit_buffer & ((1::bigint << bit_count) - 1);
		END LOOP;
	END LOOP;

	IF bit_count > 0 THEN
		result := result || substr(
			alphabet,
			((((bit_buffer << (5 - bit_count)) & 31)) + 1)::integer,
			1
		);
	END IF;

	RETURN result;
END $$;
--> statement-breakpoint
CREATE TABLE "ho_batch_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"batch_id" varchar(255) NOT NULL,
	"event_type" varchar(80) NOT NULL,
	"actor_user_id" varchar(255),
	"source" varchar(20) DEFAULT 'web' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ho_batch_measurements" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"batch_id" varchar(255) NOT NULL,
	"kind" varchar(32) NOT NULL,
	"original_value" numeric(14, 5) NOT NULL,
	"original_unit" varchar(24) NOT NULL,
	"normalized_value" numeric(14, 5) NOT NULL,
	"normalized_unit" varchar(24) NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"actor_user_id" varchar(255) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ho_bottle_aliases" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"bottle_id" varchar(255) NOT NULL,
	"locator" varchar(255) NOT NULL,
	"kind" varchar(24) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ho_bottle_aliases_locator_unique" UNIQUE("locator")
);
--> statement-breakpoint
CREATE TABLE "ho_bottle_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"bottle_id" varchar(255) NOT NULL,
	"fill_id" varchar(255),
	"batch_id" varchar(255),
	"event_type" varchar(80) NOT NULL,
	"actor_user_id" varchar(255),
	"source" varchar(20) NOT NULL,
	"visibility" varchar(16) DEFAULT 'private' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ho_bottle_fills" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"bottle_id" varchar(255) NOT NULL,
	"batch_id" varchar(255) NOT NULL,
	"status" varchar(24) DEFAULT 'filled' NOT NULL,
	"filled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_ready_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"emptied_at" timestamp with time zone,
	"private_notes" text,
	"source" varchar(20) DEFAULT 'web' NOT NULL,
	"history_approximate" boolean DEFAULT false NOT NULL,
	"created_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ho_bottle_public_codes" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"bottle_id" varchar(255) NOT NULL,
	"code" varchar(26) NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"issued_by" varchar(255),
	CONSTRAINT "ho_bottle_public_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ho_brewery_invites" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"intended_email" varchar(255) NOT NULL,
	"role" varchar(32) NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ho_brewery_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "ho_brewery_members" (
	"user_id" varchar(255) PRIMARY KEY NOT NULL,
	"role" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ho_idempotency_requests" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"actor_user_id" varchar(255) NOT NULL,
	"operation" varchar(120) NOT NULL,
	"key" uuid NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"response_status" integer NOT NULL,
	"response_body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ho_label_template_versions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"template_id" varchar(255) NOT NULL,
	"version" integer NOT NULL,
	"background_pdf_base64" text NOT NULL,
	"background_checksum" varchar(64) NOT NULL,
	"source_width_pt" numeric(12, 4) NOT NULL,
	"source_height_pt" numeric(12, 4) NOT NULL,
	"elements" jsonb NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ho_label_templates" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(16) NOT NULL,
	"current_version_id" varchar(255),
	"archived_at" timestamp with time zone,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ho_print_run_items" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"print_run_id" varchar(255) NOT NULL,
	"bottle_id" varchar(255) NOT NULL,
	"page_number" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"snapshot" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ho_print_runs" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"template_version_id" varchar(255) NOT NULL,
	"batch_id" varchar(255),
	"run_number" integer DEFAULT 1 NOT NULL,
	"run_count" integer DEFAULT 1 NOT NULL,
	"item_count" integer NOT NULL,
	"duplicate_identity_confirmed" boolean DEFAULT false NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ho_recipe_documents" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"current_revision_id" varchar(255),
	"archived_at" timestamp with time zone,
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ho_recipe_revisions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"document_id" varchar(255) NOT NULL,
	"revision" integer NOT NULL,
	"beer_json" jsonb NOT NULL,
	"beer_xml_extensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schema_version" varchar(20) DEFAULT '1.0' NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"revision_message" text,
	"original_file_name" varchar(255),
	"original_file_base64" text,
	"original_checksum" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
UPDATE "ho_batch_bottles" SET "updated" = coalesce("updated", "created", now()) WHERE "updated" IS NULL;
--> statement-breakpoint
UPDATE "ho_batches" SET "updated" = coalesce("updated", "created", now()) WHERE "updated" IS NULL;
--> statement-breakpoint
UPDATE "ho_bottles" SET "updated" = coalesce("updated", "created", now()) WHERE "updated" IS NULL;
--> statement-breakpoint
ALTER TABLE "ho_account" DROP CONSTRAINT "ho_account_user_id_ho_user_id_fk";
--> statement-breakpoint
ALTER TABLE "ho_session" DROP CONSTRAINT "ho_session_user_id_ho_user_id_fk";
--> statement-breakpoint
ALTER TABLE "ho_account" ALTER COLUMN "access_token_expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_account" ALTER COLUMN "refresh_token_expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_account" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_account" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_account" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_account" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_batch_bottles" ALTER COLUMN "created" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_batch_bottles" ALTER COLUMN "created" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_batch_bottles" ALTER COLUMN "updated" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_batch_bottles" ALTER COLUMN "updated" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_batch_bottles" ALTER COLUMN "updated" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ho_batches" ALTER COLUMN "description" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "ho_batches" ALTER COLUMN "note" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "ho_batches" ALTER COLUMN "status" SET DEFAULT 'planning';--> statement-breakpoint
ALTER TABLE "ho_batches" ALTER COLUMN "created" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_batches" ALTER COLUMN "created" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_batches" ALTER COLUMN "updated" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_batches" ALTER COLUMN "updated" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_batches" ALTER COLUMN "updated" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ho_bottles" ALTER COLUMN "status" SET DEFAULT 'empty';--> statement-breakpoint
ALTER TABLE "ho_bottles" ALTER COLUMN "created" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_bottles" ALTER COLUMN "created" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_bottles" ALTER COLUMN "updated" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_bottles" ALTER COLUMN "updated" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_bottles" ALTER COLUMN "updated" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ho_session" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_session" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_session" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_session" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_session" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_user" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_user" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_user" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_user" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_verification" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_verification" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_verification" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_verification" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_verification" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "public_name" varchar(255);--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "public_description" text;--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "private_notes" text;--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "visibility" varchar(20) DEFAULT 'unlisted' NOT NULL;--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "recipe_revision_id" varchar(255);--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "planned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "brewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "fermentation_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "packaged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "ready_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "target_volume_ml" integer;--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "actual_volume_ml" integer;--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "style_name" varchar(255);--> statement-breakpoint
ALTER TABLE "ho_batches" ADD COLUMN "abv" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "ho_bottles" ADD COLUMN "display_name" varchar(255);--> statement-breakpoint
ALTER TABLE "ho_bottles" ADD COLUMN "volume_ml" integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE "ho_bottles" ADD COLUMN "color" varchar(80);--> statement-breakpoint
ALTER TABLE "ho_bottles" ADD COLUMN "closure_type" varchar(80);--> statement-breakpoint
ALTER TABLE "ho_bottles" ADD COLUMN "location" varchar(255);--> statement-breakpoint
ALTER TABLE "ho_bottles" ADD COLUMN "private_notes" text;--> statement-breakpoint
ALTER TABLE "ho_bottles" ADD COLUMN "retired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ho_batch_events" ADD CONSTRAINT "ho_batch_events_batch_id_ho_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."ho_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_batch_events" ADD CONSTRAINT "ho_batch_events_actor_user_id_ho_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_batch_measurements" ADD CONSTRAINT "ho_batch_measurements_batch_id_ho_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."ho_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_batch_measurements" ADD CONSTRAINT "ho_batch_measurements_actor_user_id_ho_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_bottle_aliases" ADD CONSTRAINT "ho_bottle_aliases_bottle_id_ho_bottles_id_fk" FOREIGN KEY ("bottle_id") REFERENCES "public"."ho_bottles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_bottle_events" ADD CONSTRAINT "ho_bottle_events_bottle_id_ho_bottles_id_fk" FOREIGN KEY ("bottle_id") REFERENCES "public"."ho_bottles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_bottle_events" ADD CONSTRAINT "ho_bottle_events_fill_id_ho_bottle_fills_id_fk" FOREIGN KEY ("fill_id") REFERENCES "public"."ho_bottle_fills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_bottle_events" ADD CONSTRAINT "ho_bottle_events_batch_id_ho_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."ho_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_bottle_events" ADD CONSTRAINT "ho_bottle_events_actor_user_id_ho_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_bottle_fills" ADD CONSTRAINT "ho_bottle_fills_bottle_id_ho_bottles_id_fk" FOREIGN KEY ("bottle_id") REFERENCES "public"."ho_bottles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_bottle_fills" ADD CONSTRAINT "ho_bottle_fills_batch_id_ho_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."ho_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_bottle_fills" ADD CONSTRAINT "ho_bottle_fills_created_by_ho_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_bottle_public_codes" ADD CONSTRAINT "ho_bottle_public_codes_bottle_id_ho_bottles_id_fk" FOREIGN KEY ("bottle_id") REFERENCES "public"."ho_bottles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_bottle_public_codes" ADD CONSTRAINT "ho_bottle_public_codes_issued_by_ho_user_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_brewery_invites" ADD CONSTRAINT "ho_brewery_invites_created_by_ho_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_brewery_invites" ADD CONSTRAINT "ho_brewery_invites_accepted_by_ho_user_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_brewery_members" ADD CONSTRAINT "ho_brewery_members_user_id_ho_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ho_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_idempotency_requests" ADD CONSTRAINT "ho_idempotency_requests_actor_user_id_ho_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."ho_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_label_template_versions" ADD CONSTRAINT "ho_label_template_versions_template_id_ho_label_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."ho_label_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_label_template_versions" ADD CONSTRAINT "ho_label_template_versions_created_by_ho_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_label_templates" ADD CONSTRAINT "ho_label_templates_created_by_ho_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_print_run_items" ADD CONSTRAINT "ho_print_run_items_print_run_id_ho_print_runs_id_fk" FOREIGN KEY ("print_run_id") REFERENCES "public"."ho_print_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_print_run_items" ADD CONSTRAINT "ho_print_run_items_bottle_id_ho_bottles_id_fk" FOREIGN KEY ("bottle_id") REFERENCES "public"."ho_bottles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_print_runs" ADD CONSTRAINT "ho_print_runs_template_version_id_ho_label_template_versions_id_fk" FOREIGN KEY ("template_version_id") REFERENCES "public"."ho_label_template_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_print_runs" ADD CONSTRAINT "ho_print_runs_batch_id_ho_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."ho_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_print_runs" ADD CONSTRAINT "ho_print_runs_created_by_ho_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_recipe_documents" ADD CONSTRAINT "ho_recipe_documents_created_by_ho_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_recipe_revisions" ADD CONSTRAINT "ho_recipe_revisions_document_id_ho_recipe_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."ho_recipe_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_recipe_revisions" ADD CONSTRAINT "ho_recipe_revisions_created_by_ho_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
UPDATE "ho_batches"
SET
	"public_name" = coalesce("public_name", "name"),
	"public_description" = coalesce("public_description", "description"),
	"private_notes" = coalesce("private_notes", "note"),
	"visibility" = 'listed',
	"status" = CASE WHEN "status" = 'bottled' THEN 'packaging' ELSE "status" END;
--> statement-breakpoint
UPDATE "ho_bottles"
SET "display_name" = coalesce("display_name", "label")
WHERE "label" IS NOT NULL;
--> statement-breakpoint
WITH ranked_users AS (
	SELECT
		"id",
		row_number() OVER (ORDER BY "created_at", "id") AS member_order
	FROM "ho_user"
)
INSERT INTO "ho_brewery_members" ("user_id", "role")
SELECT
	"id",
	CASE WHEN member_order = 1 THEN 'owner' ELSE 'viewer' END
FROM ranked_users
ON CONFLICT ("user_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "ho_bottles" (
	"id",
	"status",
	"bottle_number",
	"volume_ml",
	"created",
	"updated"
)
SELECT
	gen_random_uuid()::text,
	'empty',
	bottle_number,
	500,
	now(),
	now()
FROM generate_series(11, 30) AS generated(bottle_number)
WHERE NOT EXISTS (
	SELECT 1
	FROM "ho_bottles" b
	WHERE b."bottle_number" = generated.bottle_number
);
--> statement-breakpoint
INSERT INTO "ho_bottle_public_codes" ("id", "bottle_id", "code", "issued_at")
SELECT gen_random_uuid()::text, b."id", ho_generate_public_code(), now()
FROM "ho_bottles" b
WHERE NOT EXISTS (
	SELECT 1
	FROM "ho_bottle_public_codes" c
	WHERE c."bottle_id" = b."id" AND c."revoked_at" IS NULL
);
--> statement-breakpoint
INSERT INTO "ho_bottle_aliases" ("id", "bottle_id", "locator", "kind")
SELECT
	gen_random_uuid()::text,
	b."id",
	b."bottle_number"::text,
	'numeric'
FROM "ho_bottles" b
ON CONFLICT ("locator") DO NOTHING;
--> statement-breakpoint
INSERT INTO "ho_bottle_aliases" ("id", "bottle_id", "locator", "kind")
SELECT gen_random_uuid()::text, b."id", b."id", 'old_uuid'
FROM "ho_bottles" b
ON CONFLICT ("locator") DO NOTHING;
--> statement-breakpoint
INSERT INTO "ho_bottle_aliases" ("id", "bottle_id", "locator", "kind")
SELECT
	gen_random_uuid()::text,
	b."id",
	b."label",
	CASE
		WHEN b."label" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
			THEN 'old_uuid'
		ELSE 'old_label'
	END
FROM "ho_bottles" b
WHERE b."label" IS NOT NULL AND length(trim(b."label")) > 0
ON CONFLICT ("locator") DO NOTHING;
--> statement-breakpoint
INSERT INTO "ho_bottle_fills" (
	"id",
	"bottle_id",
	"batch_id",
	"status",
	"filled_at",
	"ready_at",
	"source",
	"history_approximate",
	"created_at"
)
SELECT
	gen_random_uuid()::text,
	b."id",
	b."currentBatchId",
	CASE
		WHEN b."status" = 'conditioning' THEN 'conditioning'
		WHEN b."status" = 'ready' THEN 'ready'
		ELSE 'filled'
	END,
	coalesce(bb."created", b."updated", b."created", now()),
	CASE WHEN b."status" = 'ready' THEN coalesce(b."updated", now()) END,
	'migration',
	true,
	coalesce(bb."created", b."created", now())
FROM "ho_bottles" b
LEFT JOIN LATERAL (
	SELECT legacy."created"
	FROM "ho_batch_bottles" legacy
	WHERE legacy."bottleId" = b."id"
		AND legacy."batchId" = b."currentBatchId"
	ORDER BY legacy."created" DESC
	LIMIT 1
) bb ON true
WHERE b."currentBatchId" IS NOT NULL;
--> statement-breakpoint
INSERT INTO "ho_bottle_fills" (
	"id",
	"bottle_id",
	"batch_id",
	"status",
	"filled_at",
	"emptied_at",
	"source",
	"history_approximate",
	"created_at"
)
SELECT
	gen_random_uuid()::text,
	legacy."bottleId",
	legacy."batchId",
	'emptied',
	legacy."created",
	coalesce(legacy."updated", legacy."created"),
	'migration',
	true,
	legacy."created"
FROM "ho_batch_bottles" legacy
JOIN "ho_bottles" b ON b."id" = legacy."bottleId"
WHERE b."currentBatchId" IS DISTINCT FROM legacy."batchId";
--> statement-breakpoint
INSERT INTO "ho_bottle_events" (
	"id",
	"bottle_id",
	"fill_id",
	"batch_id",
	"event_type",
	"source",
	"visibility",
	"metadata",
	"occurred_at"
)
SELECT
	gen_random_uuid()::text,
	f."bottle_id",
	f."id",
	f."batch_id",
	CASE WHEN f."emptied_at" IS NULL THEN 'fill_migrated' ELSE 'historical_fill_migrated' END,
	'migration',
	'private',
	jsonb_build_object(
		'historyApproximate',
		true,
		'deletedHistoryRecoverable',
		false
	),
	f."created_at"
FROM "ho_bottle_fills" f
WHERE f."source" = 'migration';
--> statement-breakpoint
INSERT INTO "ho_bottle_events" (
	"id",
	"bottle_id",
	"event_type",
	"source",
	"visibility",
	"metadata"
)
SELECT
	gen_random_uuid()::text,
	b."id",
	'legacy_migration_completed',
	'migration',
	'private',
	jsonb_build_object(
		'message',
		'Previously deleted assignment history cannot be reconstructed.'
	)
FROM "ho_bottles" b;
--> statement-breakpoint
CREATE INDEX "batch_events_batch_time_idx" ON "ho_batch_events" USING btree ("batch_id","occurred_at");--> statement-breakpoint
CREATE INDEX "batch_measurements_batch_time_idx" ON "ho_batch_measurements" USING btree ("batch_id","measured_at");--> statement-breakpoint
CREATE INDEX "bottle_aliases_bottle_idx" ON "ho_bottle_aliases" USING btree ("bottle_id");--> statement-breakpoint
CREATE INDEX "bottle_events_bottle_time_idx" ON "ho_bottle_events" USING btree ("bottle_id","occurred_at");--> statement-breakpoint
CREATE INDEX "bottle_events_fill_idx" ON "ho_bottle_events" USING btree ("fill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bottle_fills_one_active_uidx" ON "ho_bottle_fills" USING btree ("bottle_id") WHERE "ho_bottle_fills"."emptied_at" is null;--> statement-breakpoint
CREATE INDEX "bottle_fills_bottle_time_idx" ON "ho_bottle_fills" USING btree ("bottle_id","filled_at");--> statement-breakpoint
CREATE INDEX "bottle_fills_batch_idx" ON "ho_bottle_fills" USING btree ("batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bottle_public_codes_one_active_uidx" ON "ho_bottle_public_codes" USING btree ("bottle_id") WHERE "ho_bottle_public_codes"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "bottle_public_codes_bottle_idx" ON "ho_bottle_public_codes" USING btree ("bottle_id");--> statement-breakpoint
CREATE INDEX "brewery_invites_email_idx" ON "ho_brewery_invites" USING btree ("intended_email");--> statement-breakpoint
CREATE INDEX "brewery_invites_expiry_idx" ON "ho_brewery_invites" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "brewery_members_role_idx" ON "ho_brewery_members" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_actor_operation_key_uidx" ON "ho_idempotency_requests" USING btree ("actor_user_id","operation","key");--> statement-breakpoint
CREATE INDEX "idempotency_expiry_idx" ON "ho_idempotency_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "label_template_version_uidx" ON "ho_label_template_versions" USING btree ("template_id","version");--> statement-breakpoint
CREATE INDEX "label_template_versions_template_idx" ON "ho_label_template_versions" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "label_templates_archived_idx" ON "ho_label_templates" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "print_run_item_page_uidx" ON "ho_print_run_items" USING btree ("print_run_id","page_number");--> statement-breakpoint
CREATE INDEX "print_run_items_bottle_idx" ON "ho_print_run_items" USING btree ("bottle_id");--> statement-breakpoint
CREATE INDEX "print_runs_created_idx" ON "ho_print_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "recipe_documents_archived_idx" ON "ho_recipe_documents" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_revision_document_number_uidx" ON "ho_recipe_revisions" USING btree ("document_id","revision");--> statement-breakpoint
CREATE INDEX "recipe_revision_document_idx" ON "ho_recipe_revisions" USING btree ("document_id");--> statement-breakpoint
ALTER TABLE "ho_account" ADD CONSTRAINT "ho_account_user_id_ho_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ho_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_batches" ADD CONSTRAINT "ho_batches_recipe_revision_id_ho_recipe_revisions_id_fk" FOREIGN KEY ("recipe_revision_id") REFERENCES "public"."ho_recipe_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_session" ADD CONSTRAINT "ho_session_user_id_ho_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ho_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "batch_bottles_batch_idx" ON "ho_batch_bottles" USING btree ("batchId");--> statement-breakpoint
CREATE INDEX "batch_bottles_bottle_idx" ON "ho_batch_bottles" USING btree ("bottleId");--> statement-breakpoint
CREATE INDEX "batches_status_idx" ON "ho_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "batches_visibility_idx" ON "ho_batches" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "batches_recipe_revision_idx" ON "ho_batches" USING btree ("recipe_revision_id");--> statement-breakpoint
CREATE INDEX "bottles_retired_idx" ON "ho_bottles" USING btree ("retired_at");--> statement-breakpoint
CREATE INDEX "bottles_current_batch_idx" ON "ho_bottles" USING btree ("currentBatchId");--> statement-breakpoint
ALTER TABLE "ho_batches" ADD CONSTRAINT "ho_batches_batch_number_unique" UNIQUE("batch_number");--> statement-breakpoint
ALTER TABLE "ho_bottles" ADD CONSTRAINT "ho_bottles_bottle_number_unique" UNIQUE("bottle_number");
--> statement-breakpoint
ALTER TABLE "ho_brewery_members"
	ADD CONSTRAINT "ho_brewery_members_role_check"
	CHECK ("role" IN ('owner', 'brewer', 'cellar', 'viewer'));
--> statement-breakpoint
ALTER TABLE "ho_bottle_public_codes"
	ADD CONSTRAINT "ho_bottle_public_codes_format_check"
	CHECK ("code" ~ '^[a-z2-7]{26}$');
--> statement-breakpoint
ALTER TABLE "ho_bottle_fills"
	ADD CONSTRAINT "ho_bottle_fills_status_check"
	CHECK (
		("status" IN ('filled', 'conditioning', 'ready') AND "emptied_at" IS NULL)
		OR ("status" = 'emptied' AND "emptied_at" IS NOT NULL)
	);
--> statement-breakpoint
ALTER TABLE "ho_batches"
	ADD CONSTRAINT "ho_batches_visibility_check"
	CHECK ("visibility" IN ('private', 'unlisted', 'listed'));
--> statement-breakpoint
ALTER TABLE "ho_label_template_versions"
	ADD CONSTRAINT "ho_label_template_square_check"
	CHECK (
		abs("source_width_pt" - "source_height_pt") <= 0.5
	);
