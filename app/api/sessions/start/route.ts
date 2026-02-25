import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { StartSessionRequest, StartSessionResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: StartSessionRequest = await request.json();
    const { patientId, gameId, source, sampleRateHz, firmwareVersion } = body;

    // Validate required fields
    if (!patientId || !gameId || !source || !sampleRateHz) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, gameId, source, sampleRateHz" },
        { status: 400 }
      );
    }

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

    // Create session
    const session = await prisma.session.create({
      data: {
        patientId,
        gameId,
        source,
        sampleRateHz,
        firmwareVersion: firmwareVersion || null,
      },
    });

    const response: StartSessionResponse = {
      sessionId: session.id,
      startedAt: session.startedAt.toISOString(),
      chunkIntervalMs: 2000, // Upload chunks every 2 seconds
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error starting session:", error);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}
