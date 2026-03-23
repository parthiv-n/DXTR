-- Enable Row Level Security on all public schema tables
-- Blocks unauthorized PostgREST access; Prisma (postgres role) bypasses RLS

ALTER TABLE "public"."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SessionChunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SessionSummary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."GameConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."DailyProgress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."GameSet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."RepResult" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MissionPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Clinician" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
