// Core sample type from device sensors
export type Sample = {
  t: number;           // ms since session start
  fsrGrip: number;     // 0..1 normalized
  fsrThumb: number;    // 0..1 normalized
  fsrExt: number;      // 0..1 normalized
  pronationDeg: number;   // e.g., -90..90
  supinationDeg: number;  // e.g., -90..90
  wristFlexDeg: number;   // -90..90
  wristDevDeg: number;    // -30..30
};

// Session start request
export type StartSessionRequest = {
  patientId: string;
  gameId: string;
  source: "usb" | "sim" | "wifi";
  sampleRateHz: number;
  firmwareVersion?: string;
};

// Session start response
export type StartSessionResponse = {
  sessionId: string;
  startedAt: string;
  chunkIntervalMs: number;
};

// Chunk upload request
export type ChunkRequest = {
  seq: number;
  t0: number;
  t1: number;
  samples: Sample[];
};

// Chunk upload response
export type ChunkResponse = {
  ok: boolean;
  receivedSeq: number;
  deduped: boolean;
};

// End session request
export type EndSessionRequest = {
  endedAtT: number;
};

// Session summary (computed on end)
export type SessionSummary = {
  durationMs: number;
  repCount: number;
  peakGrip: number;
  avgGrip: number;
  romPronation: number;
  romSupination: number;
  smoothness: number;
};

// End session response
export type EndSessionResponse = {
  ok: boolean;
  summary: SessionSummary;
};

// Patient info for dashboard
export type PatientInfo = {
  id: string;
  name: string;
};

// Mission plan
export type Mission = {
  id: string;
  name: string;
  description: string;
  targetReps: number;
  completed: boolean;
};

export type MissionPlanData = {
  missions: Mission[];
};

// =============================================
// DAILY MISSION PROGRESS TYPES
// =============================================

export type AlienRepMetrics = {
  peakFsr?: number;
  holdDurationMs?: number;
  beamActivations?: number;
  timeToFirstActivationMs?: number;
  avgBeamOnTimePerCowMs?: number;
};

export type AlienSetMetrics = {
  sessionDurationMs: number;
  cowsMissed: number;
  forceConsistency: number;
  timeAboveThresholdPct: number;
};

export type RepResultData = {
  repNumber: number;         // 1-10
  expectedDirection: string; // "left" | "right"
  actualDirection: string | null;
  achievedAngle: number;     // roll angle in degrees
  success: boolean;
  reactionTimeMs: number | null;
  metrics?: Record<string, unknown>;
};

export type CompleteSetRequest = {
  patientId: string;
  gameId: string;
  reps: RepResultData[];
  setMetrics?: Record<string, unknown>;
};

export type CompleteSetResponse = {
  ok: boolean;
  dailyProgressId: string;
  setNumber: number;
  setsCompletedToday: number;
  setsTarget: number;
  allSetsComplete: boolean;
  // Adaptive difficulty feedback
  difficultyAdjustment?: {
    action: string;   // "increased" | "decreased" | "maintained" | "calibrating"
    message: string;
  };
};

export type GameSetSummary = {
  setNumber: number;
  completed: boolean;
  achievedReps: number;
  totalReps: number;
  completedAt: string | null;
  reps: RepResultData[];
};

export type DailyProgressData = {
  date: string;             // "YYYY-MM-DD"
  gameId: string;
  setsTarget: number;
  setsCompleted: number;
  allComplete: boolean;
  sets: GameSetSummary[];
};

// =============================================
// ADAPTIVE GAME CONFIGURATION
// =============================================

export type GameConfigData = {
  patientId: string;
  gameId: string;
  inputType: string;             // "gyroscope" | "fsr" | "button"

  // Backward-compatible top-level fields (derived from difficultyParams)
  targetPronation: number;
  targetSupination: number;
  deadZone: number;

  // Full difficulty params JSON (input-type-specific)
  difficultyParams: Record<string, number>;

  // Calibration
  calibrationComplete: boolean;
  calibrationSetsCompleted: number;

  // Adaptive progression
  autoProgressionEnabled: boolean;
  consecutiveGoodSets: number;
  consecutiveStruggleSets: number;
  lastAdjustmentAt: string | null;
  lastAdjustmentDirection: string | null; // "up" | "down" | null

  // Clinician safety rails
  minParams: Record<string, number> | null;
  maxParams: Record<string, number> | null;
};

export type UpdateGameConfigRequest = {
  gameId: string;
  // Legacy flat fields (still accepted for backward compat)
  targetPronation?: number;
  targetSupination?: number;
  deadZone?: number;
  // New fields
  difficultyParams?: Record<string, number>;
  autoProgressionEnabled?: boolean;
  minParams?: Record<string, number>;
  maxParams?: Record<string, number>;
};

// =============================================
// GAME PROGRESS METRICS (for clinician dashboard)
// =============================================

export type DailySummary = {
  date: string;              // "YYYY-MM-DD"
  setsCompleted: number;
  setsTarget: number;
  allComplete: boolean;
  avgLeftAngle: number;      // average achieved angle on left dodges
  avgRightAngle: number;     // average achieved angle on right dodges
  successRate: number;       // 0-100 percentage
  avgReactionTimeMs: number; // average reaction time in ms
  totalReps: number;
  successfulReps: number;
  avgLevelCompleted?: number; // alien-abduction: mean of achievedAngle (level number)
  avgPeakFsr?: number;
  avgForceConsistency?: number;
  avgCowsMissed?: number;
  avgTimeAboveThresholdPct?: number;
  avgSessionDurationMs?: number;
};

export type GameProgressMetrics = {
  patientId: string;
  gameId: string;
  dailySummaries: DailySummary[];
  overallStats: {
    avgLeftAngle: number;
    avgRightAngle: number;
    successRate: number;       // 0-100
    avgReactionTimeMs: number;
    totalSetsCompleted: number;
    totalDaysPlayed: number;
    totalReps: number;
    successfulReps: number;
    avgPeakFsr?: number;
    avgForceConsistency?: number;
    avgCowsMissed?: number;
    avgTimeAboveThresholdPct?: number;
    avgSessionDurationMs?: number;
  };
};

// Dashboard metrics
export type DashboardMetrics = {
  patient: PatientInfo;
  latestSummary: SessionSummary | null;
  sessionCount: number;
  averageMetrics: {
    avgGrip: number;
    avgRomPronation: number;
    avgRomSupination: number;
    avgSmoothness: number;
  } | null;
  recentSessions: {
    id: string;
    gameId: string;
    startedAt: string;
    summary: SessionSummary | null;
  }[];
  missionPlan: MissionPlanData | null;
};
