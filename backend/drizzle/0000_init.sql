CREATE TYPE "public"."alert_condition" AS ENUM('above', 'below');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('active', 'triggered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."horizon" AS ENUM('short', 'medium', 'long');--> statement-breakpoint
CREATE TYPE "public"."risk" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"condition" "alert_condition" NOT NULL,
	"target_price" numeric(14, 4) NOT NULL,
	"status" "alert_status" DEFAULT 'active' NOT NULL,
	"triggered_price" numeric(14, 4),
	"triggered_at" timestamp with time zone,
	CONSTRAINT "alerts_target_price_positive" CHECK ("alerts"."target_price" > 0)
);
--> statement-breakpoint
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "api_usage" (
	"date" date PRIMARY KEY NOT NULL,
	"credits_used" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "market_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "market_cache" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"monthly_income_mxn" numeric(12, 2) NOT NULL,
	"monthly_expenses_mxn" numeric(12, 2) NOT NULL,
	"has_emergency_fund" boolean NOT NULL,
	"horizon" "horizon" NOT NULL,
	"risk" "risk" NOT NULL,
	CONSTRAINT "profiles_income_non_negative" CHECK ("profiles"."monthly_income_mxn" >= 0),
	CONSTRAINT "profiles_expenses_non_negative" CHECK ("profiles"."monthly_expenses_mxn" >= 0)
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_lowercase" CHECK ("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "watchlist" (
	"user_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_user_id_symbol_pk" PRIMARY KEY("user_id","symbol")
);
--> statement-breakpoint
ALTER TABLE "watchlist" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_user_id_idx" ON "alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "alerts_status_symbol_idx" ON "alerts" USING btree ("status","symbol");