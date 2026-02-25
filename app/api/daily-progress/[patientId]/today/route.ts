import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { DailyProgressData, GameSetSummary, RepResultData } from "@/lib/types";

/**
 * GET /api/daily-progress/[patientId]/today?gameId=car-racer
 * Returns today's progress for a patient on a specific game.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId") || "car-racer";

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

    const today = new Date().toISOString().split("T")[0];

    // Fetch today's progress with sets and reps
    const dailyProgress = await prisma.dailyProgress.findUnique({
      where: {
        patientId_gameId_date: { patientId, gameId, date: today },
      },
      include: {
        sets: {
          orderBy: { setNumber: "asc" },
          include: {
            reps: {
              orderBy: { repNumber: "asc" },
            },
          },
        },
      },
    });

    if (!dailyProgress) {
      // No progress today yet
      const emptyProgress: DailyProgressData = {
        date: today,
        gameId,
        setsTarget: 5,
        setsCompleted: 0,
        allComplete: false,
        sets: [],
      };
      return NextResponse.json(emptyProgress);
    }

    const completedSets = dailyProgress.sets.filter((s) => s.completed);

    const sets: GameSetSummary[] = dailyProgress.sets.map((s) => ({
      setNumber: s.setNumber,
      completed: s.completed,
      achievedReps: s.achievedReps,
      totalReps: s.totalReps,
      completedAt: s.completedAt ? s.completedAt.toISOString() : null,
      reps: s.reps.map(
        (r): RepResultData => ({
          repNumber: r.repNumber,
          expectedDirection: r.expectedDirection,
          actualDirection: r.actualDirection,
          achievedAngle: r.achievedAngle,
          success: r.success,
          reactionTimeMs: r.reactionTimeMs,
        })
      ),
    }));

    const result: DailyProgressData = {
      date: dailyProgress.date,
      gameId: dailyProgress.gameId,
      setsTarget: dailyProgress.setsTarget,
      setsCompleted: completedSets.length,
      allComplete: completedSets.length >= dailyProgress.setsTarget,
      sets,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching daily progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily progress" },
      { status: 500 }
    );
  }
}
