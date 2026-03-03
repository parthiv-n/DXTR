-- ============================================================
-- DXTR: Enable Row Level Security on all tables
-- Run in Supabase Dashboard > SQL Editor
--
-- What this does:
--   1. Enables RLS on every table (blocks all PostgREST/anon access by default)
--   2. Revokes direct SELECT/INSERT/UPDATE/DELETE from the anon role
--   3. Leaves the `service_role` (used by Prisma via DATABASE_URL) untouched
--      — Prisma bypasses RLS entirely as the DB owner, so nothing breaks.
-- ============================================================

-- ── 1. Prisma internal migration table ───────────────────────────────────────
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- ── 2. Application tables ─────────────────────────────────────────────────────
ALTER TABLE "Clinician"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Patient"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assignment"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MissionPlan"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionChunk"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionSummary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameConfig"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyProgress"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameSet"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RepResult"      ENABLE ROW LEVEL SECURITY;

-- ── 3. Revoke anon access from all tables ────────────────────────────────────
-- The anon role is used by unauthenticated Supabase JS client calls.
-- Since this app uses Prisma (service_role / direct connection), anon needs nothing.
REVOKE ALL ON "_prisma_migrations" FROM anon;
REVOKE ALL ON "Clinician"          FROM anon;
REVOKE ALL ON "Patient"            FROM anon;
REVOKE ALL ON "Assignment"         FROM anon;
REVOKE ALL ON "MissionPlan"        FROM anon;
REVOKE ALL ON "Session"            FROM anon;
REVOKE ALL ON "SessionChunk"       FROM anon;
REVOKE ALL ON "SessionSummary"     FROM anon;
REVOKE ALL ON "GameConfig"         FROM anon;
REVOKE ALL ON "DailyProgress"      FROM anon;
REVOKE ALL ON "GameSet"            FROM anon;
REVOKE ALL ON "RepResult"          FROM anon;

-- ── 4. Revoke authenticated role too (app doesn't use Supabase Auth JWT) ─────
REVOKE ALL ON "_prisma_migrations" FROM authenticated;
REVOKE ALL ON "Clinician"          FROM authenticated;
REVOKE ALL ON "Patient"            FROM authenticated;
REVOKE ALL ON "Assignment"         FROM authenticated;
REVOKE ALL ON "MissionPlan"        FROM authenticated;
REVOKE ALL ON "Session"            FROM authenticated;
REVOKE ALL ON "SessionChunk"       FROM authenticated;
REVOKE ALL ON "SessionSummary"     FROM authenticated;
REVOKE ALL ON "GameConfig"         FROM authenticated;
REVOKE ALL ON "DailyProgress"      FROM authenticated;
REVOKE ALL ON "GameSet"            FROM authenticated;
REVOKE ALL ON "RepResult"          FROM authenticated;

-- ============================================================
-- Done. Your tables are now locked down.
-- Prisma (connecting as postgres / service_role) is unaffected.
-- ============================================================
