// =============================================
// Input Profiles — gyroscope, FSR, button
// =============================================

import {
  InputType,
  InputProfile,
  AdaptiveRepData,
  PerformanceEvaluation,
  GyroscopeDifficultyParams,
  GyroscopeBaselineData,
  FsrDifficultyParams,
  FsrBaselineData,
  ButtonDifficultyParams,
  ButtonBaselineData,
  DifficultyParams,
  BaselineData,
} from "./types";

// --------------- Helpers ---------------

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

/** Return the value at the given percentile (0-1) from a sorted-ascending array. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// =============================================
// 1. GYROSCOPE PROFILE  (Car Racer, etc.)
// =============================================

export const gyroscopeProfile: InputProfile<
  GyroscopeDifficultyParams,
  GyroscopeBaselineData
> = {
  inputType: "gyroscope" as InputType,

  getDefaults(): GyroscopeDifficultyParams {
    return { targetPronation: 15, targetSupination: 15, deadZone: 5 };
  },

  getMinDefaults(): GyroscopeDifficultyParams {
    return { targetPronation: 5, targetSupination: 5, deadZone: 2 };
  },

  getMaxDefaults(): GyroscopeDifficultyParams {
    return { targetPronation: 45, targetSupination: 45, deadZone: 15 };
  },

  evaluateSetPerformance(
    reps: AdaptiveRepData[],
    currentParams: GyroscopeDifficultyParams
  ): PerformanceEvaluation {
    if (reps.length === 0) {
      return {
        overshootRatio: 0,
        successRate: 0,
        consistency: 0,
        avgReactionTimeMs: null,
        isGoodSet: false,
        isStrugglingSet: true,
      };
    }

    // Overall avg achieved vs overall target
    const currentTarget =
      (currentParams.targetPronation + currentParams.targetSupination) / 2;
    const avgAchieved =
      reps.reduce((s, r) => s + Math.abs(r.achievedValue), 0) / reps.length;
    const overshootRatio =
      currentTarget > 0 ? (avgAchieved - currentTarget) / currentTarget : 0;

    const successRate = reps.filter((r) => r.success).length / reps.length;
    const consistency = stdDev(reps.map((r) => Math.abs(r.achievedValue)));

    const withReaction = reps.filter((r) => r.reactionTimeMs !== null);
    const avgReactionTimeMs =
      withReaction.length > 0
        ? withReaction.reduce((s, r) => s + (r.reactionTimeMs ?? 0), 0) /
          withReaction.length
        : null;

    // Good: overshoot >= 15%, success >= 80%, consistency < 5deg, reaction < 2000ms
    const isGoodSet =
      overshootRatio >= 0.15 &&
      successRate >= 0.8 &&
      consistency < 5.0 &&
      (avgReactionTimeMs === null || avgReactionTimeMs < 2000);

    // Struggling: undershoot > 15% OR success < 60%
    const isStrugglingSet = overshootRatio < -0.15 || successRate < 0.6;

    return {
      overshootRatio,
      successRate,
      consistency,
      avgReactionTimeMs,
      isGoodSet,
      isStrugglingSet,
    };
  },

  computeBaseline(allReps: AdaptiveRepData[]) {
    const angles = allReps
      .map((r) => Math.abs(r.achievedValue))
      .sort((a, b) => a - b);
    const reactionTimes = allReps
      .map((r) => r.reactionTimeMs)
      .filter((t): t is number => t !== null)
      .sort((a, b) => a - b);

    const leftAngles = allReps
      .filter((r) => r.direction === "left")
      .map((r) => Math.abs(r.achievedValue))
      .sort((a, b) => a - b);
    const rightAngles = allReps
      .filter((r) => r.direction === "right")
      .map((r) => Math.abs(r.achievedValue))
      .sort((a, b) => a - b);

    const maxPronation = percentile(leftAngles, 0.8) || percentile(angles, 0.8);
    const maxSupination =
      percentile(rightAngles, 0.8) || percentile(angles, 0.8);
    const avgReactionTimeMs =
      reactionTimes.length > 0
        ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
        : 1500;

    const baseline: GyroscopeBaselineData = {
      achievedAngles: angles,
      reactionTimesMs: reactionTimes,
      maxPronation,
      maxSupination,
      avgReactionTimeMs,
    };

    // Initial target = 70% of 80th percentile
    const initialParams: GyroscopeDifficultyParams = {
      targetPronation: Math.round(maxPronation * 0.7 * 10) / 10,
      targetSupination: Math.round(maxSupination * 0.7 * 10) / 10,
      deadZone: 5,
    };

    return { baseline, initialParams };
  },

  applyIncrease(cur, rate, max): GyroscopeDifficultyParams {
    return {
      targetPronation: clamp(
        Math.round(cur.targetPronation * (1 + rate) * 10) / 10,
        cur.targetPronation,
        max.targetPronation
      ),
      targetSupination: clamp(
        Math.round(cur.targetSupination * (1 + rate) * 10) / 10,
        cur.targetSupination,
        max.targetSupination
      ),
      deadZone: cur.deadZone,
    };
  },

  applyDecrease(cur, rate, min): GyroscopeDifficultyParams {
    return {
      targetPronation: clamp(
        Math.round(cur.targetPronation * (1 - rate) * 10) / 10,
        min.targetPronation,
        cur.targetPronation
      ),
      targetSupination: clamp(
        Math.round(cur.targetSupination * (1 - rate) * 10) / 10,
        min.targetSupination,
        cur.targetSupination
      ),
      deadZone: cur.deadZone,
    };
  },
};

// =============================================
// 2. FSR PROFILE  (Future grip games)
// =============================================

export const fsrProfile: InputProfile<FsrDifficultyParams, FsrBaselineData> = {
  inputType: "fsr" as InputType,

  getDefaults(): FsrDifficultyParams {
    return { targetGripForce: 0.4, targetHoldDurationMs: 1000, forceTolerance: 0.15 };
  },
  getMinDefaults(): FsrDifficultyParams {
    return { targetGripForce: 0.1, targetHoldDurationMs: 500, forceTolerance: 0.25 };
  },
  getMaxDefaults(): FsrDifficultyParams {
    return { targetGripForce: 0.9, targetHoldDurationMs: 5000, forceTolerance: 0.05 };
  },

  evaluateSetPerformance(reps, currentParams): PerformanceEvaluation {
    if (reps.length === 0) {
      return { overshootRatio: 0, successRate: 0, consistency: 0, avgReactionTimeMs: null, isGoodSet: false, isStrugglingSet: true };
    }
    const avgForce = reps.reduce((s, r) => s + r.achievedValue, 0) / reps.length;
    const overshootRatio = currentParams.targetGripForce > 0
      ? (avgForce - currentParams.targetGripForce) / currentParams.targetGripForce : 0;
    const successRate = reps.filter((r) => r.success).length / reps.length;
    const consistency = stdDev(reps.map((r) => r.achievedValue));
    const withReaction = reps.filter((r) => r.reactionTimeMs !== null);
    const avgReactionTimeMs = withReaction.length > 0
      ? withReaction.reduce((s, r) => s + (r.reactionTimeMs ?? 0), 0) / withReaction.length : null;
    return {
      overshootRatio, successRate, consistency, avgReactionTimeMs,
      isGoodSet: overshootRatio >= 0.15 && successRate >= 0.8 && consistency < 0.1,
      isStrugglingSet: overshootRatio < -0.15 || successRate < 0.6,
    };
  },

  computeBaseline(allReps) {
    const forces = allReps.map((r) => r.achievedValue).sort((a, b) => a - b);
    const maxGripForce = percentile(forces, 0.8);
    const avgGripForce = forces.length > 0 ? forces.reduce((a, b) => a + b, 0) / forces.length : 0.3;
    const baseline: FsrBaselineData = { gripForces: forces, holdDurationsMs: [], maxGripForce, avgGripForce, gripEnduranceMs: 1000 };
    const initialParams: FsrDifficultyParams = {
      targetGripForce: Math.round(maxGripForce * 0.7 * 100) / 100,
      targetHoldDurationMs: 1000,
      forceTolerance: 0.15,
    };
    return { baseline, initialParams };
  },

  applyIncrease(cur, rate, max): FsrDifficultyParams {
    return {
      targetGripForce: clamp(Math.round(cur.targetGripForce * (1 + rate) * 100) / 100, cur.targetGripForce, max.targetGripForce),
      targetHoldDurationMs: clamp(Math.round(cur.targetHoldDurationMs * (1 + rate * 0.5)), cur.targetHoldDurationMs, max.targetHoldDurationMs),
      forceTolerance: clamp(Math.round(cur.forceTolerance * (1 - rate * 0.5) * 100) / 100, max.forceTolerance, cur.forceTolerance),
    };
  },

  applyDecrease(cur, rate, min): FsrDifficultyParams {
    return {
      targetGripForce: clamp(Math.round(cur.targetGripForce * (1 - rate) * 100) / 100, min.targetGripForce, cur.targetGripForce),
      targetHoldDurationMs: clamp(Math.round(cur.targetHoldDurationMs * (1 - rate * 0.5)), min.targetHoldDurationMs, cur.targetHoldDurationMs),
      forceTolerance: clamp(Math.round(cur.forceTolerance * (1 + rate * 0.5) * 100) / 100, cur.forceTolerance, min.forceTolerance),
    };
  },
};

// =============================================
// 3. BUTTON PROFILE  (Future button games)
// =============================================

export const buttonProfile: InputProfile<ButtonDifficultyParams, ButtonBaselineData> = {
  inputType: "button" as InputType,

  getDefaults(): ButtonDifficultyParams {
    return { reactionWindowMs: 2000, sequenceLength: 3, tempoMs: 1500 };
  },
  getMinDefaults(): ButtonDifficultyParams {
    return { reactionWindowMs: 3000, sequenceLength: 1, tempoMs: 2500 };
  },
  getMaxDefaults(): ButtonDifficultyParams {
    return { reactionWindowMs: 500, sequenceLength: 10, tempoMs: 500 };
  },

  evaluateSetPerformance(reps, currentParams): PerformanceEvaluation {
    if (reps.length === 0) {
      return { overshootRatio: 0, successRate: 0, consistency: 0, avgReactionTimeMs: null, isGoodSet: false, isStrugglingSet: true };
    }
    const withReaction = reps.filter((r) => r.reactionTimeMs !== null);
    const avgRT = withReaction.length > 0
      ? withReaction.reduce((s, r) => s + (r.reactionTimeMs ?? 0), 0) / withReaction.length
      : currentParams.reactionWindowMs;
    // For button games "overshoot" = being faster than window (positive = good)
    const overshootRatio = currentParams.reactionWindowMs > 0
      ? (currentParams.reactionWindowMs - avgRT) / currentParams.reactionWindowMs : 0;
    const successRate = reps.filter((r) => r.success).length / reps.length;
    const consistency = stdDev(withReaction.map((r) => r.reactionTimeMs ?? 0));
    return {
      overshootRatio, successRate, consistency, avgReactionTimeMs: avgRT,
      isGoodSet: overshootRatio >= 0.15 && successRate >= 0.8 && consistency < 400,
      isStrugglingSet: overshootRatio < -0.15 || successRate < 0.6,
    };
  },

  computeBaseline(allReps) {
    const reactionTimes = allReps.map((r) => r.reactionTimeMs).filter((t): t is number => t !== null).sort((a, b) => a - b);
    const avgReactionTimeMs = reactionTimes.length > 0 ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length : 1500;
    const baseline: ButtonBaselineData = { reactionTimesMs: reactionTimes, sequenceLengths: [], avgReactionTimeMs, maxSequenceCompleted: 3 };
    const initialParams: ButtonDifficultyParams = {
      reactionWindowMs: Math.round(avgReactionTimeMs * 1.3),
      sequenceLength: 3,
      tempoMs: 1500,
    };
    return { baseline, initialParams };
  },

  applyIncrease(cur, rate, max): ButtonDifficultyParams {
    return {
      reactionWindowMs: clamp(Math.round(cur.reactionWindowMs * (1 - rate)), max.reactionWindowMs, cur.reactionWindowMs),
      sequenceLength: clamp(cur.sequenceLength + 1, cur.sequenceLength, max.sequenceLength),
      tempoMs: clamp(Math.round(cur.tempoMs * (1 - rate * 0.5)), max.tempoMs, cur.tempoMs),
    };
  },

  applyDecrease(cur, rate, min): ButtonDifficultyParams {
    return {
      reactionWindowMs: clamp(Math.round(cur.reactionWindowMs * (1 + rate)), cur.reactionWindowMs, min.reactionWindowMs),
      sequenceLength: clamp(Math.max(cur.sequenceLength - 1, 1), min.sequenceLength, cur.sequenceLength),
      tempoMs: clamp(Math.round(cur.tempoMs * (1 + rate * 0.5)), cur.tempoMs, min.tempoMs),
    };
  },
};

// --------------- Profile registry ---------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const profileRegistry: Record<InputType, InputProfile<any, any>> = {
  gyroscope: gyroscopeProfile,
  fsr: fsrProfile,
  button: buttonProfile,
};

/** Look up the input profile for a given type. Falls back to gyroscope. */
export function getInputProfile(inputType: string): InputProfile {
  return profileRegistry[inputType as InputType] ?? profileRegistry.gyroscope;
}
