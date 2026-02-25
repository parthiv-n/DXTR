// =============================================
// Calibration — baseline recording and computation
// =============================================

import { AdaptiveRepData, DifficultyParams, BaselineData } from "./types";
import { getInputProfile } from "./inputProfiles";

/** Number of completed sets required before calibration is considered done. */
export const CALIBRATION_SETS_REQUIRED = 3;

/**
 * Merge new rep data into an existing baseline-data JSON blob.
 * During calibration we accumulate raw rep data in baselineData.
 * Raw format: { reps: AdaptiveRepData[] }
 */
export function recordCalibrationData(
  existingBaselineJson: string | null,
  newReps: AdaptiveRepData[]
): string {
  let existing: { reps: AdaptiveRepData[] } = { reps: [] };

  if (existingBaselineJson) {
    try {
      existing = JSON.parse(existingBaselineJson);
      if (!Array.isArray(existing.reps)) {
        existing = { reps: [] };
      }
    } catch {
      existing = { reps: [] };
    }
  }

  existing.reps = [...existing.reps, ...newReps];
  return JSON.stringify(existing);
}

/**
 * Check if calibration has collected enough sets.
 */
export function isCalibrationComplete(setsCompleted: number): boolean {
  return setsCompleted >= CALIBRATION_SETS_REQUIRED;
}

/**
 * After enough calibration sets, compute initial difficulty targets
 * from the recorded data.
 */
export function computeInitialTargets(
  inputType: string,
  baselineJson: string
): { baseline: BaselineData; initialParams: DifficultyParams } {
  const profile = getInputProfile(inputType);

  let rawReps: AdaptiveRepData[] = [];
  try {
    const parsed = JSON.parse(baselineJson);
    rawReps = Array.isArray(parsed.reps) ? parsed.reps : [];
  } catch {
    rawReps = [];
  }

  if (rawReps.length === 0) {
    return {
      baseline: {} as BaselineData,
      initialParams: profile.getDefaults(),
    };
  }

  return profile.computeBaseline(rawReps);
}
