import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { MissionPlanData } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;

    const plan = await prisma.missionPlan.findUnique({
      where: { patientId },
    });

    if (!plan) {
      return NextResponse.json(
        { error: `Plan not found for patient: ${patientId}` },
        { status: 404 }
      );
    }

    const missionPlan = JSON.parse(plan.data) as MissionPlanData;
    return NextResponse.json(missionPlan);
  } catch (error) {
    console.error("Error fetching plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    const body: MissionPlanData = await request.json();

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return NextResponse.json(
        { error: `Patient not found: ${patientId}` },
        { status: 404 }
      );
    }

    // Upsert mission plan
    const plan = await prisma.missionPlan.upsert({
      where: { patientId },
      update: { data: JSON.stringify(body) },
      create: {
        patientId,
        data: JSON.stringify(body),
      },
    });

    const missionPlan = JSON.parse(plan.data) as MissionPlanData;
    return NextResponse.json(missionPlan);
  } catch (error) {
    console.error("Error updating plan:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}
