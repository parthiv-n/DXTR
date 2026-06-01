import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { PatientInfo } from "@/lib/types";

// Patient list must reflect live DB state. Without this, Next.js 14 App Router
// statically optimizes this GET (no dynamic params, cookies, headers, etc.)
// and caches the response at build time — which serves stale data after any
// patient is added/removed/renamed at runtime.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { name: "asc" },
    });

    const patientList: PatientInfo[] = patients.map((p) => ({
      id: p.id,
      name: p.name,
    }));

    return NextResponse.json(patientList);
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}
