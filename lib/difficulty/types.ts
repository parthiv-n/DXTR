// =============================================
// Adaptive Difficulty Framework — Type Definitions
// =============================================

// --------------- Input types ---------------

export type InputType = "gyroscope" | "fsr" | "button";

// --------------- Difficulty params per input type ---------------

export type GyroscopeDifficultyParams = {
  targetPronation: number;  // target left-dodge angle (degrees)
  targetSupination: number; // target right-dodge angle (degrees)
  deadZone: number;         // dead zone to ignore jitter (degrees)
};

export type FsrDifficultyParams = {
  targetGripForce: number;      // 0-1 normalized target grip strength
  targetHoldDurationMs: number; // how long to hold in ms
  forceTolerance: number;       // acceptable deviation from target (0-1)
};

export type ButtonDifficultyParams = {
  reactionWindowMs: number;  // time window to react (ms)
  sequenceLength: number;    // number of presses in a sequence
  tempoMs: number;           // interval between prompts (ms)
};

/** Union of all input-specific difficulty parameter shapes */
export type DifficultyParams =
  | GyroscopeDifficultyParams
  | FsrDifficultyParams
  | ButtonDifficultyParams;

// --------------- Baseline data per input type ---------------

export type GyroscopeBaselineData = {
  achievedAngles: number[];
  reactionTimesMs: number[];
  maxPronation: number;
  maxSupination: number;
  avgReactionTimeMs: number;
};

export type FsrBaselineData = {
  gripForces: number[];
  holdDurationsMs: number[];
  maxGripForce: number;
  avgGripForce: number;
  gripEnduranceMs: number;
};

export type ButtonBaselineData = {
  reactionTimesMs: number[];
  sequenceLengths: number[];
  avgReactionTimeMs: number;
  maxSequenceCompleted: number;
};

export type BaselineData =
  | GyroscopeBaselineData
  | FsrBaselineData
  | ButtonBaselineData;

// --------------- Performance evaluation ---------------

export type PerformanceEvaluation = {
  /** (avgAchieved - target) / target; positive = overshoot */
  overshootRatio: number;
  /** 0-1 fraction of successful reps */
  successRate: number;
  /** standard deviation of the primary achieved metric */
  consistency: number;
  /** average reaction time in ms (null if not applicable) */
  avgReactionTimeMs: number | null;
  /** Whether this set qualifies as "good" for progression */
  isGoodSet: boolean;
  /** Whether this set qualifies as "struggling" for regression */
  isStrugglingSet: boolean;
};

// --------------- Adjustment result ---------------

export type AdjustmentAction = "increased" | "decreased" | "maintained" | "calibrating";

export type AdjustmentResult = {
  action: AdjustmentAction;
  /** Human-readable message for the game / dashboard */
  message: string;
  /** Updated difficulty params (null if no change) */
  newDifficultyParams: DifficultyParams | null;
  /** Updated consecutive-good-sets counter */
  consecutiveGoodSets: number;
  /** Updated consecutive-struggle-sets counter */
  consecutiveStruggleSets: number;
  /** Whether calibration just completed this set */
  calibrationJustCompleted: boolean;
};

// --------------- Rep data (input-agnostic wrapper) ---------------

/**
 * Minimal rep data passed into the adaptive engine.
 * Each game maps its own rep format into this shape.
 */
export type AdaptiveRepData = {
  /** Primary metric: angle for gyro, force for FSR, reaction time for button */
  achievedValue: number;
  success: boolean;
  reactionTimeMs: number | null;
  /** "left" | "right" — for gyroscope games */
  direction?: string;
};

// --------------- Input profile interface ---------------

/**
 * Every input type implements this interface to plug into the engine.
 */
export interface InputProfile<
  P extends DifficultyParams = DifficultyParams,
  B extends BaselineData = BaselineData,
> {
  readonly inputType: InputType;

  /** Default difficulty params for a brand-new config */
  getDefaults(): P;

  /** Minimum safe difficulty values */
  getMinDefaults(): P;

  /** Maximum safe difficulty values */
  getMaxDefaults(): P;

  /** Evaluate a completed set of reps against the current params */
  evaluateSetPerformance(reps: AdaptiveRepData[], currentParams: P): PerformanceEvaluation;

  /** Compute initial targets from calibration baseline (80th percentile -> 70% target) */
  computeBaseline(allReps: AdaptiveRepData[]): { baseline: B; initialParams: P };

  /** Return params bumped up by ~rate (e.g. 0.10 = 10%), clamped by max */
  applyIncrease(currentParams: P, rate: number, maxParams: P): P;

  /** Return params reduced by ~rate (e.g. 0.08 = 8%), clamped by min */
  applyDecrease(currentParams: P, rate: number, minParams: P): P;
}
