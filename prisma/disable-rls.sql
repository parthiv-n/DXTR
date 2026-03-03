-- ============================================================
-- DXTR: Disable Row Level Security and restore permissions
-- Run in Supabase Dashboard > SQL Editor
--
-- Use this if you ran enable-rls.sql and the app can no longer
-- connect to the database (e.g. "Failed to load patients").
-- ============================================================

-- 1. Disable RLS on all tables
ALTER TABLE "_prisma_migrations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Clinician"      DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Patient"        DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Assignment"     DISABLE ROW LEVEL SECURITY;
ALTER TABLE "MissionPlan"    DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"        DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionChunk"   DISABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionSummary" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "GameConfig"     DISABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyProgress"  DISABLE ROW LEVEL SECURITY;
ALTER TABLE "GameSet"        DISABLE ROW LEVEL SECURITY;
ALTER TABLE "RepResult"      DISABLE ROW LEVEL SECURITY;

-- 2. Restore default permissions for Supabase roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
