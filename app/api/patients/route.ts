import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { PatientInfo } from "@/lib/types";

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
