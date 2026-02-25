// =============================================
// Adaptive Engine — core orchestrator
// =============================================
//
// Called after every completed set. Handles two phases:
//   1. Calibration (first N sets) — record baseline, then compute initial targets
//   2. Progression  — evaluate performance, decide increase / decrease / maintain
//

import {
  AdaptiveRepData,
  AdjustmentResult,
  DifficultyParams,
} from "./types";
import { getInputProfile } from "./inputProfiles";
import {
  CALIBRATION_SETS_REQUIRED,
  recordCalibrationData,
  isCalibrationComplete,
  computeInitialTargets,
} from "./calibration";

/** Increase rate applied when leveling up (10 %). */
const INCREASE_RATE = 0.1;
/** Decrease rate applied when reducing difficulty (8 %). */
const DECREASE_RATE = 0.08;
/** Consecutive good sets needed before increasing. */
const GOOD_SETS_THRESHOLD = 3;
/** Consecutive struggling sets needed before decreasing. */
const STRUGGLE_SETS_THRESHOLD = 2;

// --------------- Public shape of a stored GameConfig row ---------------

export type GameConfigRow = {
  inputType: string;
  difficultyParams: string;         // JSON
  calibrationComplete: boolean;
  calibrationSetsCompleted: number;
  baselineData: string | null;
  autoProgressionEnabled: boolean;
  consecutiveGoodSets: number;
  consecutiveStruggleSets: number;
  minParams: string | null;
  maxParams: string | null;
};

export type GameConfigUpdate = {
  difficultyParams?: string;
  calibrationComplete?: boolean;
  calibrationSetsCompleted?: number;
  baselineData?: string;
  consecutiveGoodSets?: number;
  consecutiveStruggleSets?: number;
  lastAdjustmentAt?: Date;
  lastAdjustmentDirection?: string;
};

export type EngineResult = {
  adjustment: AdjustmentResult;
  /** Fields to persist back to the GameConfig row */
  dbUpdate: GameConfigUpdate;
};

// --------------- Main entry point ---------------

/**
 * Process a completed set of reps and return the difficulty adjustment.
 *
 * The caller is responsible for persisting `dbUpdate` to the database.
 */
export function processSetCompletion(
  config: GameConfigRow,
  setReps: AdaptiveRepData[]
): EngineResult {
  const profile = getInputProfile(config.inputType);

  // ── Phase 1: Calibration ─────────────────────────────────────────
  if (!config.calibrationComplete) {
    return handleCalibration(config, setReps, profile);
  }

  // ── Phase 2: Adaptive progression (only if enabled) ──────────────
  if (!config.autoProgressionEnabled) {
    return {
      adjustment: {
        action: "maintained",
        message: "Auto-progression is disabled.",
        newDifficultyParams: null,
        consecutiveGoodSets: config.consecutiveGoodSets,
        consecutiveStruggleSets: config.consecutiveStruggleSets,
        calibrationJustCompleted: false,
      },
      dbUpdate: {},
    };
  }

  return handleProgression(config, setReps, profile);
}

// --------------- Calibration handler ---------------

function handleCalibration(
  config: GameConfigRow,
  setReps: AdaptiveRepData[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any
): EngineResult {
  const newSetsCount = config.calibrationSetsCompleted + 1;
  const updatedBaselineJson = recordCalibrationData(config.baselineData, setReps);

  // Not enough sets yet — keep collecting
  if (!isCalibrationComplete(newSetsCount)) {
    return {
      adjustment: {
        action: "calibrating",
        message: `Calibrating... ${newSetsCount}/${CALIBRATION_SETS_REQUIRED} sets recorded.`,
        newDifficultyParams: null,
        consecutiveGoodSets: 0,
        consecutiveStruggleSets: 0,
        calibrationJustCompleted: false,
      },
      dbUpdate: {
        calibrationSetsCompleted: newSetsCount,
        baselineData: updatedBaselineJson,
      },
    };
  }

  // Calibration complete — compute baseline and initial targets
  const { baseline, initialParams } = computeInitialTargets(
    config.inputType,
    updatedBaselineJson
  );

  // Store computed baseline as well (replace raw reps with summary)
  const baselineSummaryJson = JSON.stringify(baseline);

  return {
    adjustment: {
      action: "calibrating",
      message: `Calibration complete! Initial targets set based on your performance.`,
      newDifficultyParams: initialParams,
      consecutiveGoodSets: 0,
      consecutiveStruggleSets: 0,
      calibrationJustCompleted: true,
    },
    dbUpdate: {
      calibrationComplete: true,
      calibrationSetsCompleted: newSetsCount,
      baselineData: baselineSummaryJson,
      difficultyParams: JSON.stringify(initialParams),
      consecutiveGoodSets: 0,
      consecutiveStruggleSets: 0,
    },
  };
}

// --------------- Progression handler ---------------

function handleProgression(
  config: GameConfigRow,
  setReps: AdaptiveRepData[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any
): EngineResult {
  let currentParams: DifficultyParams;
  try {
    currentParams = JSON.parse(config.difficultyParams);
  } catch {
    currentParams = profile.getDefaults();
  }

  // Resolve clinician min/max bounds (fall back to profile defaults)
  let minParams: DifficultyParams;
  let maxParams: DifficultyParams;
  try {
    minParams = config.minParams ? JSON.parse(config.minParams) : profile.getMinDefaults();
  } catch {
    minParams = profile.getMinDefaults();
  }
  try {
    maxParams = config.maxParams ? JSON.parse(config.maxParams) : profile.getMaxDefaults();
  } catch {
    maxParams = profile.getMaxDefaults();
  }

  // Evaluate performance of this set
  const evaluation = profile.evaluateSetPerformance(setReps, currentParams);

  // ── Decision: Increase ───────────────────────────────────────────
  if (evaluation.isGoodSet) {
    const newGoodCount = config.consecutiveGoodSets + 1;

    if (newGoodCount >= GOOD_SETS_THRESHOLD) {
      const newParams = profile.applyIncrease(currentParams, INCREASE_RATE, maxParams);
      return {
        adjustment: {
          action: "increased",
          message: `Great work! Difficulty increased.`,
          newDifficultyParams: newParams,
          consecutiveGoodSets: 0,
          consecutiveStruggleSets: 0,
          calibrationJustCompleted: false,
        },
        dbUpdate: {
          difficultyParams: JSON.stringify(newParams),
          consecutiveGoodSets: 0,
          consecutiveStruggleSets: 0,
          lastAdjustmentAt: new Date(),
          lastAdjustmentDirection: "up",
        },
      };
    }

    // Good but not enough consecutive sets yet
    return {
      adjustment: {
        action: "maintained",
        message: `Good set! ${newGoodCount}/${GOOD_SETS_THRESHOLD} towards next level.`,
        newDifficultyParams: null,
        consecutiveGoodSets: newGoodCount,
        consecutiveStruggleSets: 0,
        calibrationJustCompleted: false,
      },
      dbUpdate: {
        consecutiveGoodSets: newGoodCount,
        consecutiveStruggleSets: 0,
      },
    };
  }

  // ── Decision: Decrease ───────────────────────────────────────────
  if (evaluation.isStrugglingSet) {
    const newStruggleCount = config.consecutiveStruggleSets + 1;

    if (newStruggleCount >= STRUGGLE_SETS_THRESHOLD) {
      const newParams = profile.applyDecrease(currentParams, DECREASE_RATE, minParams);
      return {
        adjustment: {
          action: "decreased",
          message: `Easing difficulty to help you improve.`,
          newDifficultyParams: newParams,
          consecutiveGoodSets: 0,
          consecutiveStruggleSets: 0,
          calibrationJustCompleted: false,
        },
        dbUpdate: {
          difficultyParams: JSON.stringify(newParams),
          consecutiveGoodSets: 0,
          consecutiveStruggleSets: 0,
          lastAdjustmentAt: new Date(),
          lastAdjustmentDirection: "down",
        },
      };
    }

    return {
      adjustment: {
        action: "maintained",
        message: `Keep trying! Difficulty unchanged.`,
        newDifficultyParams: null,
        consecutiveGoodSets: 0,
        consecutiveStruggleSets: newStruggleCount,
        calibrationJustCompleted: false,
      },
      dbUpdate: {
        consecutiveGoodSets: 0,
        consecutiveStruggleSets: newStruggleCount,
      },
    };
  }

  // ── Decision: Maintain ───────────────────────────────────────────
  return {
    adjustment: {
      action: "maintained",
      message: `Solid set. Keep it up!`,
      newDifficultyParams: null,
      consecutiveGoodSets: 0,
      consecutiveStruggleSets: 0,
      calibrationJustCompleted: false,
    },
    dbUpdate: {
      consecutiveGoodSets: 0,
      consecutiveStruggleSets: 0,
    },
  };
}
