import { Sample, SessionSummary } from "@/lib/types";

/**
 * Compute session summary metrics from sample data
 */
export function computeSummary(samples: Sample[], durationMs: number): SessionSummary {
  if (samples.length === 0) {
    return {
      durationMs,
      repCount: 0,
      peakGrip: 0,
      avgGrip: 0,
      romPronation: 0,
      romSupination: 0,
      smoothness: 0,
    };
  }

  // Peak and average grip
  const gripValues = samples.map((s) => s.fsrGrip);
  const peakGrip = Math.max(...gripValues);
  const avgGrip = gripValues.reduce((a, b) => a + b, 0) / gripValues.length;

  // ROM calculations
  const pronationValues = samples.map((s) => s.pronationDeg);
  const supinationValues = samples.map((s) => s.supinationDeg);

  const romPronation = Math.max(...pronationValues) - Math.min(...pronationValues);
  const romSupination = Math.max(...supinationValues) - Math.min(...supinationValues);

  // Rep count: threshold crossing on grip (rising past 0.6, then falling past 0.4)
  const repCount = countReps(gripValues, 0.6, 0.4);

  // Smoothness: 1 / (1 + mean absolute delta of pronation)
  const smoothness = computeSmoothness(pronationValues);

  return {
    durationMs,
    repCount,
    peakGrip: Math.round(peakGrip * 100) / 100,
    avgGrip: Math.round(avgGrip * 100) / 100,
    romPronation: Math.round(romPronation * 10) / 10,
    romSupination: Math.round(romSupination * 10) / 10,
    smoothness: Math.round(smoothness * 100) / 100,
  };
}

/**
 * Count reps using threshold crossing detection
 * A rep is counted when value rises above highThresh and then falls below lowThresh
 */
function countReps(values: number[], highThresh: number, lowThresh: number): number {
  let reps = 0;
  let above = false;

  for (const value of values) {
    if (!above && value >= highThresh) {
      above = true;
    } else if (above && value <= lowThresh) {
      above = false;
      reps++;
    }
  }

  return reps;
}

/**
 * Compute smoothness as inverse of mean absolute change in values
 */
function computeSmoothness(values: number[]): number {
  if (values.length < 2) return 1;

  let totalDelta = 0;
  for (let i = 1; i < values.length; i++) {
    totalDelta += Math.abs(values[i] - values[i - 1]);
  }

  const meanDelta = totalDelta / (values.length - 1);
  return 1 / (1 + meanDelta / 10); // Normalized to 0-1 range
}

/**
 * Parse samples from JSON string stored in database
 */
export function parseSamplesFromChunks(chunkSamplesJsonArray: string[]): Sample[] {
  const allSamples: Sample[] = [];
  for (const json of chunkSamplesJsonArray) {
    try {
      const samples = JSON.parse(json) as Sample[];
      allSamples.push(...samples);
    } catch {
      console.error("Failed to parse chunk samples");
    }
  }
  return allSamples;
}
