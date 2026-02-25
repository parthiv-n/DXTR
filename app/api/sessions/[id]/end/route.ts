import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { EndSessionRequest, EndSessionResponse, Sample } from "@/lib/types";
import { computeSummary } from "@/lib/analytics/computeSummary";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body: EndSessionRequest = await request.json();
    const { endedAtT } = body;

    // Validate required fields
    if (endedAtT === undefined) {
      return NextResponse.json(
        { error: "Missing required field: endedAtT" },
        { status: 400 }
      );
    }

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        chunks: {
          orderBy: { seq: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: `Session not found: ${sessionId}` },
        { status: 404 }
      );
    }

    // Collect all samples from chunks
    const allSamples: Sample[] = [];
    for (const chunk of session.chunks) {
      try {
        const samples = JSON.parse(chunk.samples) as Sample[];
        allSamples.push(...samples);
      } catch {
        console.error(`Failed to parse chunk ${chunk.id}`);
      }
    }

    // Compute summary metrics
    const summaryData = computeSummary(allSamples, endedAtT);

    // Update session end time
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
      },
    });

    // Upsert session summary
    await prisma.sessionSummary.upsert({
      where: { sessionId },
      update: {
        durationMs: summaryData.durationMs,
        repCount: summaryData.repCount,
        peakGrip: summaryData.peakGrip,
        avgGrip: summaryData.avgGrip,
        romPronation: summaryData.romPronation,
        romSupination: summaryData.romSupination,
        smoothness: summaryData.smoothness,
      },
      create: {
        sessionId,
        durationMs: summaryData.durationMs,
        repCount: summaryData.repCount,
        peakGrip: summaryData.peakGrip,
        avgGrip: summaryData.avgGrip,
        romPronation: summaryData.romPronation,
        romSupination: summaryData.romSupination,
        smoothness: summaryData.smoothness,
      },
    });

    const response: EndSessionResponse = {
      ok: true,
      summary: summaryData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error ending session:", error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}
