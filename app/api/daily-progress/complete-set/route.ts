import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { CompleteSetRequest, CompleteSetResponse } from "@/lib/types";
import {
  processSetCompletion,
  GameConfigRow,
} from "@/lib/difficulty/adaptiveEngine";
import { AdaptiveRepData } from "@/lib/difficulty/types";

/**
 * POST /api/daily-progress/complete-set
 * Records a completed set of reps for a patient's game session.
 */
export async function POST(request: NextRequest) {
  try {
    const body: CompleteSetRequest = await request.json();
    const { patientId, gameId, reps, setMetrics } = body;

    if (!patientId || !gameId || !reps || reps.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, gameId, reps" },
        { status: 400 }
      );
    }

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

    const dailyProgress = await prisma.dailyProgress.upsert({
      where: {
        patientId_gameId_date: { patientId, gameId, date: today },
      },
      update: {},
      create: {
        patientId,
        gameId,
        date: today,
        setsTarget: 5,
      },
      include: {
        sets: { where: { completed: true } },
      },
    });

    const setsCompletedBefore = dailyProgress.sets.length;
    const nextSetNumber = setsCompletedBefore + 1;

    const gameSet = await prisma.gameSet.create({
      data: {
        dailyProgressId: dailyProgress.id,
        setNumber: nextSetNumber,
        completed: true,
        completedAt: new Date(),
        totalReps: reps.length,
        achievedReps: reps.filter((r) => r.success).length,
        metrics: setMetrics ? JSON.stringify(setMetrics) : null,
        reps: {
          create: reps.map((r) => ({
            repNumber: r.repNumber,
            expectedDirection: r.expectedDirection,
            actualDirection: r.actualDirection,
            achievedAngle: r.achievedAngle,
            success: r.success,
            reactionTimeMs: r.reactionTimeMs,
            metrics: r.metrics ? JSON.stringify(r.metrics) : null,
          })),
        },
      },
    });

    const setsCompletedToday = setsCompletedBefore + 1;
    const allSetsComplete = setsCompletedToday >= dailyProgress.setsTarget;

    // Run adaptive difficulty for games that have a GameConfig
    let difficultyAdjustment: CompleteSetResponse["difficultyAdjustment"];

    const gameConfig = await prisma.gameConfig.findUnique({
      where: { patientId_gameId: { patientId, gameId } },
    });

    if (gameConfig) {
      const configRow: GameConfigRow = {
        inputType: gameConfig.inputType,
        difficultyParams: gameConfig.difficultyParams,
        calibrationComplete: gameConfig.calibrationComplete,
        calibrationSetsCompleted: gameConfig.calibrationSetsCompleted,
        baselineData: gameConfig.baselineData,
        autoProgressionEnabled: gameConfig.autoProgressionEnabled,
        consecutiveGoodSets: gameConfig.consecutiveGoodSets,
        consecutiveStruggleSets: gameConfig.consecutiveStruggleSets,
        minParams: gameConfig.minParams,
        maxParams: gameConfig.maxParams,
      };

      const adaptiveReps: AdaptiveRepData[] = reps.map((r) => ({
        achievedValue: r.achievedAngle,
        success: r.success,
        reactionTimeMs: r.reactionTimeMs,
        direction: r.expectedDirection,
      }));

      const result = processSetCompletion(configRow, adaptiveReps);

      if (Object.keys(result.dbUpdate).length > 0) {
        await prisma.gameConfig.update({
          where: { patientId_gameId: { patientId, gameId } },
          data: result.dbUpdate,
        });
      }

      difficultyAdjustment = {
        action: result.adjustment.action,
        message: result.adjustment.message,
      };
    }

    const response: CompleteSetResponse = {
      ok: true,
      dailyProgressId: dailyProgress.id,
      setNumber: gameSet.setNumber,
      setsCompletedToday,
      setsTarget: dailyProgress.setsTarget,
      allSetsComplete,
      difficultyAdjustment,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error completing set:", error);
    return NextResponse.json(
      { error: "Failed to complete set" },
      { status: 500 }
    );
  }
}
