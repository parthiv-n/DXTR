import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { GameProgressMetrics, DailySummary } from "@/lib/types";

/**
 * GET /api/patients/[id]/game-progress?gameId=car-racer
 * Returns aggregated daily progress metrics for the clinician dashboard.
 * Includes per-day summaries (angles, success rates) and overall stats.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
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

    // Fetch all DailyProgress for this patient + game, with sets and reps
    const allProgress = await prisma.dailyProgress.findMany({
      where: { patientId, gameId },
      orderBy: { date: "asc" },
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

    // Aggregate per-day summaries
    const dailySummaries: DailySummary[] = allProgress.map((dp) => {
      const completedSets = dp.sets.filter((s) => s.completed);
      const allReps = dp.sets.flatMap((s) => s.reps);

      const leftReps = allReps.filter((r) => r.expectedDirection === "left");
      const rightReps = allReps.filter((r) => r.expectedDirection === "right");
      const successfulReps = allReps.filter((r) => r.success);
      const repsWithReaction = allReps.filter((r) => r.reactionTimeMs !== null);

      const avgLeftAngle =
        leftReps.length > 0
          ? Math.round(
              (leftReps.reduce((sum, r) => sum + Math.abs(r.achievedAngle), 0) /
                leftReps.length) *
                10
            ) / 10
          : 0;

      const avgRightAngle =
        rightReps.length > 0
          ? Math.round(
              (rightReps.reduce((sum, r) => sum + Math.abs(r.achievedAngle), 0) /
                rightReps.length) *
                10
            ) / 10
          : 0;

      const successRate =
        allReps.length > 0
          ? Math.round((successfulReps.length / allReps.length) * 100)
          : 0;

      const avgReactionTimeMs =
        repsWithReaction.length > 0
          ? Math.round(
              repsWithReaction.reduce((sum, r) => sum + (r.reactionTimeMs || 0), 0) /
                repsWithReaction.length
            )
          : 0;

      return {
        date: dp.date,
        setsCompleted: completedSets.length,
        setsTarget: dp.setsTarget,
        allComplete: completedSets.length >= dp.setsTarget,
        avgLeftAngle,
        avgRightAngle,
        successRate,
        avgReactionTimeMs,
        totalReps: allReps.length,
        successfulReps: successfulReps.length,
      };
    });

    // Compute overall stats across all days
    const allRepsFlat = allProgress.flatMap((dp) =>
      dp.sets.flatMap((s) => s.reps)
    );
    const allLeftReps = allRepsFlat.filter((r) => r.expectedDirection === "left");
    const allRightReps = allRepsFlat.filter((r) => r.expectedDirection === "right");
    const allSuccessful = allRepsFlat.filter((r) => r.success);
    const allWithReaction = allRepsFlat.filter((r) => r.reactionTimeMs !== null);

    const overallStats = {
      avgLeftAngle:
        allLeftReps.length > 0
          ? Math.round(
              (allLeftReps.reduce((sum, r) => sum + Math.abs(r.achievedAngle), 0) /
                allLeftReps.length) *
                10
            ) / 10
          : 0,
      avgRightAngle:
        allRightReps.length > 0
          ? Math.round(
              (allRightReps.reduce((sum, r) => sum + Math.abs(r.achievedAngle), 0) /
                allRightReps.length) *
                10
            ) / 10
          : 0,
      successRate:
        allRepsFlat.length > 0
          ? Math.round((allSuccessful.length / allRepsFlat.length) * 100)
          : 0,
      avgReactionTimeMs:
        allWithReaction.length > 0
          ? Math.round(
              allWithReaction.reduce((sum, r) => sum + (r.reactionTimeMs || 0), 0) /
                allWithReaction.length
            )
          : 0,
      totalSetsCompleted: allProgress.reduce(
        (sum, dp) => sum + dp.sets.filter((s) => s.completed).length,
        0
      ),
      totalDaysPlayed: allProgress.length,
      totalReps: allRepsFlat.length,
      successfulReps: allSuccessful.length,
    };

    const result: GameProgressMetrics = {
      patientId,
      gameId,
      dailySummaries,
      overallStats,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching game progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch game progress" },
      { status: 500 }
    );
  }
}
