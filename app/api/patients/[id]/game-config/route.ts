import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { GameConfigData, UpdateGameConfigRequest } from "@/lib/types";
import { getInputProfile } from "@/lib/difficulty/inputProfiles";
import { GyroscopeDifficultyParams } from "@/lib/difficulty/types";

// Helper: parse a JSON string safely, returning fallback on failure
function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

// Helper: build the API response from a DB row
function configToResponse(
  patientId: string,
  gameId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any | null
): GameConfigData {
  const profile = getInputProfile(row?.inputType ?? "gyroscope");
  const defaults = profile.getDefaults() as GyroscopeDifficultyParams;

  const difficultyParams = safeJsonParse<Record<string, number>>(
    row?.difficultyParams,
    defaults as unknown as Record<string, number>
  );

  // Backward-compatible top-level fields for gyroscope games
  const targetPronation =
    (difficultyParams as Record<string, number>).targetPronation ?? defaults.targetPronation;
  const targetSupination =
    (difficultyParams as Record<string, number>).targetSupination ?? defaults.targetSupination;
  const deadZone =
    (difficultyParams as Record<string, number>).deadZone ?? defaults.deadZone;

  return {
    patientId,
    gameId,
    inputType: row?.inputType ?? "gyroscope",
    targetPronation,
    targetSupination,
    deadZone,
    difficultyParams,
    calibrationComplete: row?.calibrationComplete ?? false,
    calibrationSetsCompleted: row?.calibrationSetsCompleted ?? 0,
    autoProgressionEnabled: row?.autoProgressionEnabled ?? true,
    consecutiveGoodSets: row?.consecutiveGoodSets ?? 0,
    consecutiveStruggleSets: row?.consecutiveStruggleSets ?? 0,
    lastAdjustmentAt: row?.lastAdjustmentAt?.toISOString() ?? null,
    lastAdjustmentDirection: row?.lastAdjustmentDirection ?? null,
    minParams: safeJsonParse(row?.minParams, null),
    maxParams: safeJsonParse(row?.maxParams, null),
  };
}

/**
 * GET /api/patients/[id]/game-config?gameId=car-racer
 * Returns adaptive game config with backward-compatible top-level fields.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId") || "car-racer";

    const config = await prisma.gameConfig.findUnique({
      where: { patientId_gameId: { patientId, gameId } },
    });

    return NextResponse.json(configToResponse(patientId, gameId, config));
  } catch (error) {
    console.error("Error fetching game config:", error);
    return NextResponse.json(
      { error: "Failed to fetch game config" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/patients/[id]/game-config
 * Clinician updates config. Accepts both legacy flat fields and new format.
 * Manual edits reset consecutiveGoodSets / consecutiveStruggleSets.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    const body: UpdateGameConfigRequest = await request.json();
    const {
      gameId,
      targetPronation,
      targetSupination,
      deadZone,
      difficultyParams: newDifficultyParams,
      autoProgressionEnabled,
      minParams,
      maxParams,
    } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: "Missing required field: gameId" },
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

    // Load existing config to merge
    const existing = await prisma.gameConfig.findUnique({
      where: { patientId_gameId: { patientId, gameId } },
    });

    const profile = getInputProfile(existing?.inputType ?? "gyroscope");
    const defaults = profile.getDefaults() as GyroscopeDifficultyParams;

    // Build the new difficultyParams
    let mergedParams: Record<string, number>;

    if (newDifficultyParams) {
      // New-style: caller sent full difficultyParams object
      mergedParams = newDifficultyParams;
    } else {
      // Legacy-style: merge flat fields into existing params
      const existingParams = safeJsonParse<Record<string, number>>(
        existing?.difficultyParams,
        defaults as unknown as Record<string, number>
      );
      mergedParams = { ...existingParams };
      if (targetPronation !== undefined) mergedParams.targetPronation = targetPronation;
      if (targetSupination !== undefined) mergedParams.targetSupination = targetSupination;
      if (deadZone !== undefined) mergedParams.deadZone = deadZone;
    }

    // Build update payload — manual edit resets progression counters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      difficultyParams: JSON.stringify(mergedParams),
      consecutiveGoodSets: 0,
      consecutiveStruggleSets: 0,
    };

    if (autoProgressionEnabled !== undefined) {
      updateData.autoProgressionEnabled = autoProgressionEnabled;
    }
    if (minParams !== undefined) {
      updateData.minParams = JSON.stringify(minParams);
    }
    if (maxParams !== undefined) {
      updateData.maxParams = JSON.stringify(maxParams);
    }

    const config = await prisma.gameConfig.upsert({
      where: { patientId_gameId: { patientId, gameId } },
      update: updateData,
      create: {
        patientId,
        gameId,
        inputType: "gyroscope",
        difficultyParams: JSON.stringify(mergedParams),
        autoProgressionEnabled: autoProgressionEnabled ?? true,
        minParams: minParams ? JSON.stringify(minParams) : null,
        maxParams: maxParams ? JSON.stringify(maxParams) : null,
      },
    });

    return NextResponse.json(configToResponse(patientId, gameId, config));
  } catch (error) {
    console.error("Error updating game config:", error);
    return NextResponse.json(
      { error: "Failed to update game config" },
      { status: 500 }
    );
  }
}
