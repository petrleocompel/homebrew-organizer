CREATE TABLE "ho_audit_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"actor_user_id" varchar(255),
	"source" varchar(20) DEFAULT 'web' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ho_audit_events" ADD CONSTRAINT "ho_audit_events_actor_user_id_ho_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."ho_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_entity_time_idx" ON "ho_audit_events" USING btree ("entity_type","entity_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_time_idx" ON "ho_audit_events" USING btree ("actor_user_id","occurred_at");