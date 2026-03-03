export type ExerciseGame = {
  id: string;
  name: string;
  icon: string;
  primaryMetricKey: string;
  primaryMetricLabel: string;
  primaryMetricUnit: string;
  targetRepsPerDay: number;
};

export type EventMarker = {
  type: "plan_updated" | "clinic_session";
  label: string;
};

export type DayBucket = {
  date: string;
  totalReps: number;
  expectedReps: number;
  homeReps: number;
  clinicReps: number;
  perGame: Record<string, { reps: number; primaryMetricValue: number | null }>;
  events: EventMarker[];
};

export type WeeklyBreakdown = {
  label: string;
  reps: number;
  expected: number;
};

export type ReviewFlag = {
  flagged: boolean;
  reason: string;
};

export type GameStatus = "improving" | "stable" | "declining" | "insufficient_data";

export type GameAggregate = {
  gameId: string;
  reps: number;
  expectedReps: number;
  completionPct: number;
  homeReps: number;
  clinicReps: number;
  lastPlayed: string | null;
  primaryMetricTrend: number[];
  primaryMetricDelta: number;
  primaryMetricDeltaPct: number;
  status: GameStatus;
  reviewFlag: ReviewFlag | null;
};

export type AggregatedProgress = {
  totalReps: number;
  expectedReps: number;
  completionPct: number;
  homeReps: number;
  clinicReps: number;
  lastActivityAt: string | null;
  streak: number;
  missedDays: number;
  weeklyBreakdown: WeeklyBreakdown[];
  dailyBuckets: DayBucket[];
  perGame: GameAggregate[];
};

export type DateRangePreset = "7" | "14" | "30" | "custom";

export type DateRange = {
  start: string;
  end: string;
  preset: DateRangePreset;
};
