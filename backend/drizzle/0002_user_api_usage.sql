CREATE TABLE "user_api_usage" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"credits_used" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_api_usage_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "user_api_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_api_usage" ADD CONSTRAINT "user_api_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;