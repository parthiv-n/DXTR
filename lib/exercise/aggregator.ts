import {
  AggregatedProgress,
  DayBucket,
  GameAggregate,
  GameStatus,
  WeeklyBreakdown,
  ExerciseGame,
} from "./types";
import { DailySummary } from "@/lib/types";

type PerGameDailySummaries = {
  gameId: string;
  summaries: DailySummary[];
};

export function aggregateProgress(
  perGameData: PerGameDailySummaries[],
  games: ExerciseGame[],
  startDate: string,
  endDate: string
): AggregatedProgress {
  const days = getDaysInRange(startDate, endDate);
  const numDays = days.length;

  const dailyBuckets: DayBucket[] = days.map((date) => {
    let totalReps = 0;
    let expectedReps = 0;
    const perGame: Record<string, { reps: number; primaryMetricValue: number | null }> = {};

    for (const game of games) {
      const gameData = perGameData.find((g) => g.gameId === game.id);
      const daySummary = gameData?.summaries.find((s) => s.date === date);
      const reps = daySummary?.totalReps ?? 0;
      const metric = daySummary
        ? (daySummary.avgLeftAngle + daySummary.avgRightAngle) / 2 || null
        : null;

      totalReps += reps;
      expectedReps += game.targetRepsPerDay;
      perGame[game.id] = { reps, primaryMetricValue: metric };
    }

    return {
      date,
      totalReps,
      expectedReps,
      homeReps: totalReps,
      clinicReps: 0,
      perGame,
      events: [],
    };
  });

  const totalReps = dailyBuckets.reduce((s, d) => s + d.totalReps, 0);
  const expectedReps = dailyBuckets.reduce((s, d) => s + d.expectedReps, 0);
  const completionPct = expectedReps > 0 ? Math.round((totalReps / expectedReps) * 100) : 0;

  const lastActivityAt = findLastActivity(dailyBuckets);
  const streak = computeStreak(dailyBuckets);
  const missedDays = dailyBuckets.filter((d) => d.totalReps === 0).length;
  const weeklyBreakdown = computeWeeklyBreakdown(dailyBuckets);

  const perGame: GameAggregate[] = games.map((game) => {
    const gameData = perGameData.find((g) => g.gameId === game.id);
    const summaries = gameData?.summaries ?? [];

    const reps = summaries.reduce((s, d) => s + d.totalReps, 0);
    const gameExpected = game.targetRepsPerDay * numDays;
    const gamePct = gameExpected > 0 ? Math.round((reps / gameExpected) * 100) : 0;

    const lastDay = summaries.length > 0
      ? summaries[summaries.length - 1].date
      : null;

    const trend = days.map((date) => {
      const day = summaries.find((s) => s.date === date);
      return day ? (day.avgLeftAngle + day.avgRightAngle) / 2 : 0;
    });

    const currentAvg = computeAvgMetric(summaries);
    const { delta, deltaPct } = computeMetricDelta(summaries, startDate, numDays);

    const status = computeGameStatus(summaries, gamePct, deltaPct);

    const reviewFlag = computeReviewFlag(gamePct, deltaPct, lastDay, endDate);

    return {
      gameId: game.id,
      reps,
      expectedReps: gameExpected,
      completionPct: gamePct,
      homeReps: reps,
      clinicReps: 0,
      lastPlayed: lastDay,
      primaryMetricTrend: trend,
      primaryMetricDelta: delta,
      primaryMetricDeltaPct: deltaPct,
      status,
      reviewFlag,
    };
  });

  return {
    totalReps,
    expectedReps,
    completionPct,
    homeReps: totalReps,
    clinicReps: 0,
    lastActivityAt,
    streak,
    missedDays,
    weeklyBreakdown,
    dailyBuckets,
    perGame,
  };
}

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const current = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (current <= last) {
    days.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function findLastActivity(buckets: DayBucket[]): string | null {
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (buckets[i].totalReps > 0) return buckets[i].date;
  }
  return null;
}

function computeStreak(buckets: DayBucket[]): number {
  let streak = 0;
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (buckets[i].totalReps > 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computeWeeklyBreakdown(buckets: DayBucket[]): WeeklyBreakdown[] {
  const weeks: WeeklyBreakdown[] = [];
  for (let i = 0; i < buckets.length; i += 7) {
    const weekBuckets = buckets.slice(i, i + 7);
    const reps = weekBuckets.reduce((s, d) => s + d.totalReps, 0);
    const expected = weekBuckets.reduce((s, d) => s + d.expectedReps, 0);
    weeks.push({
      label: `Week ${weeks.length + 1}`,
      reps,
      expected,
    });
  }
  return weeks;
}

function computeAvgMetric(summaries: DailySummary[]): number {
  if (summaries.length === 0) return 0;
  const sum = summaries.reduce(
    (s, d) => s + (d.avgLeftAngle + d.avgRightAngle) / 2,
    0
  );
  return sum / summaries.length;
}

function computeMetricDelta(
  summaries: DailySummary[],
  startDate: string,
  rangeDays: number
): { delta: number; deltaPct: number } {
  if (summaries.length < 2) return { delta: 0, deltaPct: 0 };

  const prevStart = new Date(startDate + "T00:00:00");
  prevStart.setDate(prevStart.getDate() - rangeDays);
  const prevStartStr = prevStart.toISOString().split("T")[0];

  const currentSummaries = summaries.filter((s) => s.date >= startDate);
  const prevSummaries = summaries.filter(
    (s) => s.date >= prevStartStr && s.date < startDate
  );

  const currentAvg = computeAvgMetric(currentSummaries);
  const prevAvg = computeAvgMetric(prevSummaries);

  if (prevAvg === 0) return { delta: 0, deltaPct: 0 };

  const delta = Math.round((currentAvg - prevAvg) * 10) / 10;
  const deltaPct = Math.round(((currentAvg - prevAvg) / prevAvg) * 100);
  return { delta, deltaPct };
}

function computeGameStatus(
  summaries: DailySummary[],
  completionPct: number,
  deltaPct: number
): GameStatus {
  if (summaries.length < 3) return "insufficient_data";
  if (deltaPct > 5) return "improving";
  if (deltaPct < -5) return "declining";
  return "stable";
}

function computeReviewFlag(
  completionPct: number,
  deltaPct: number,
  lastPlayed: string | null,
  endDate: string
): { flagged: boolean; reason: string } | null {
  if (completionPct < 40) {
    return { flagged: true, reason: `Adherence only ${completionPct}% over this period` };
  }
  if (deltaPct < -10) {
    return { flagged: true, reason: `Primary metric dropped ${Math.abs(deltaPct)}% vs previous period` };
  }
  if (lastPlayed) {
    const lastDate = new Date(lastPlayed + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    const daysSince = Math.round((end.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 5) {
      return { flagged: true, reason: `No activity in the last ${daysSince} days` };
    }
  } else {
    return { flagged: true, reason: "No sessions recorded for this game" };
  }
  return null;
}
