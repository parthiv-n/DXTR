import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

/**
 * GET /api/health
 * Checks database connectivity. Returns a hint for fixing "Failed to load patients".
 */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        error: "DATABASE_URL is not set",
        hint: "Add DATABASE_URL in Vercel: Project Settings → Environment Variables. Use the Supabase Transaction Pooler URL (port 6543).",
      },
      { status: 503 }
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : null;

    let hint = "Check that DATABASE_URL is correct and the database is reachable.";
    if (code === "P1001" || message.includes("reach") || message.includes("connect")) {
      hint = "Database unreachable. Try: 1) Run prisma/disable-rls.sql in Supabase if you enabled RLS. 2) Use the Transaction Pooler URL (port 6543) in DATABASE_URL.";
    } else if (code === "P1003" || message.includes("does not exist")) {
      hint = "Database not found. Ensure DATABASE_URL points to the correct Supabase project.";
    }

    return NextResponse.json(
      { ok: false, error: message, hint },
      { status: 503 }
    );
  }
}
