CREATE TABLE "ho_account" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" varchar(255),
	"id_token" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ho_batch_bottles" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"batchId" varchar(255) NOT NULL,
	"bottleId" varchar(255) NOT NULL,
	"created" timestamp DEFAULT now() NOT NULL,
	"updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ho_batches" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"batch_number" integer NOT NULL,
	"name" varchar NOT NULL,
	"description" text NOT NULL,
	"note" text NOT NULL,
	"status" varchar NOT NULL,
	"created" timestamp DEFAULT now() NOT NULL,
	"updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ho_bottles" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"status" varchar NOT NULL,
	"bottle_number" integer NOT NULL,
	"currentBatchId" varchar(255),
	"created" timestamp DEFAULT now() NOT NULL,
	"updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ho_session" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" varchar(255),
	"user_agent" text,
	"user_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ho_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "ho_user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ho_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "ho_verification" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ho_account" ADD CONSTRAINT "ho_account_user_id_ho_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_batch_bottles" ADD CONSTRAINT "ho_batch_bottles_batchId_ho_batches_id_fk" FOREIGN KEY ("batchId") REFERENCES "public"."ho_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_batch_bottles" ADD CONSTRAINT "ho_batch_bottles_bottleId_ho_bottles_id_fk" FOREIGN KEY ("bottleId") REFERENCES "public"."ho_bottles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_bottles" ADD CONSTRAINT "ho_bottles_currentBatchId_ho_batches_id_fk" FOREIGN KEY ("currentBatchId") REFERENCES "public"."ho_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ho_session" ADD CONSTRAINT "ho_session_user_id_ho_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "ho_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "ho_session" USING btree ("user_id");