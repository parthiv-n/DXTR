import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { EXERCISE_GAMES } from "@/lib/exercise/games";
import { aggregateProgress } from "@/lib/exercise/aggregator";
import { DailySummary } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    const { searchParams } = new URL(request.url);
    const rangeDays = parseInt(searchParams.get("range") || "14", 10);
    const filterGameId = searchParams.get("gameId");

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      return NextResponse.json(
        { error: `Patient not found: ${patientId}` },
        { status: 404 }
      );
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - rangeDays + 1);

    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    const games = filterGameId
      ? EXERCISE_GAMES.filter((g) => g.id === filterGameId)
      : EXERCISE_GAMES;

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - rangeDays);
    const prevStartStr = prevStartDate.toISOString().split("T")[0];

    const allProgress = await prisma.dailyProgress.findMany({
      where: {
        patientId,
        gameId: { in: games.map((g) => g.id) },
        date: { gte: prevStartStr, lte: endStr },
      },
      orderBy: { date: "asc" },
      include: {
        sets: {
          orderBy: { setNumber: "asc" },
          include: {
            reps: { orderBy: { repNumber: "asc" } },
          },
        },
      },
    });

    const perGameData = games.map((game) => {
      const gameProgress = allProgress.filter((dp) => dp.gameId === game.id);

      const summaries: DailySummary[] = gameProgress.map((dp) => {
        const completedSets = dp.sets.filter((s) => s.completed);
        const allReps = dp.sets.flatMap((s) => s.reps);
        const leftReps = allReps.filter((r) => r.expectedDirection === "left");
        const rightReps = allReps.filter((r) => r.expectedDirection === "right");
        const successfulReps = allReps.filter((r) => r.success);
        const repsWithReaction = allReps.filter((r) => r.reactionTimeMs !== null);

        return {
          date: dp.date,
          setsCompleted: completedSets.length,
          setsTarget: dp.setsTarget,
          allComplete: completedSets.length >= dp.setsTarget,
          avgLeftAngle:
            leftReps.length > 0
              ? Math.round(
                  (leftReps.reduce((sum, r) => sum + Math.abs(r.achievedAngle), 0) /
                    leftReps.length) * 10
                ) / 10
              : 0,
          avgRightAngle:
            rightReps.length > 0
              ? Math.round(
                  (rightReps.reduce((sum, r) => sum + Math.abs(r.achievedAngle), 0) /
                    rightReps.length) * 10
                ) / 10
              : 0,
          successRate:
            allReps.length > 0
              ? Math.round((successfulReps.length / allReps.length) * 100)
              : 0,
          avgReactionTimeMs:
            repsWithReaction.length > 0
              ? Math.round(
                  repsWithReaction.reduce((sum, r) => sum + (r.reactionTimeMs || 0), 0) /
                    repsWithReaction.length
                )
              : 0,
          totalReps: allReps.length,
          successfulReps: successfulReps.length,
        };
      });

      return { gameId: game.id, summaries };
    });

    const result = aggregateProgress(perGameData, games, startStr, endStr);

    return NextResponse.json({
      patientId,
      patientName: patient.name,
      range: rangeDays,
      startDate: startStr,
      endDate: endStr,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching exercise progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch exercise progress" },
      { status: 500 }
    );
  }
}
