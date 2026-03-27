import { ExerciseGame } from "./types";

export const EXERCISE_GAMES: ExerciseGame[] = [
  {
    id: "alien-abduction",
    name: "Thumb adduction - Alien Abduction",
    icon: "🛸",
    primaryMetricKey: "levelsCompleted",
    primaryMetricLabel: "Avg Level Reached",
    primaryMetricUnit: "",
    targetRepsPerDay: 50,
  },
  {
    id: "fly-swatter",
    name: "Finger Extension - Fly Swatter",
    icon: "\u{1FAB0}",
    primaryMetricKey: "accuracy",
    primaryMetricLabel: "Shoo Accuracy",
    primaryMetricUnit: "%",
    targetRepsPerDay: 50,
  },
  {
    id: "fossil-dusting",
    name: "Wrist radial and ulnar deviation - Fossil Dusting",
    icon: "🦖",
    primaryMetricKey: "avgROM",
    primaryMetricLabel: "Avg Range of Motion",
    primaryMetricUnit: "°",
    targetRepsPerDay: 40,
  },
  {
    id: "car-racer",
    name: "Wrist pronation and supination - Car Racer",
    icon: "🏎️",
    primaryMetricKey: "avgAngle",
    primaryMetricLabel: "Avg Dodge Angle",
    primaryMetricUnit: "°",
    targetRepsPerDay: 50,
  },
  {
    id: "storm-witch",
    name: "Grip Strength - Storm Witch",
    icon: "🧙",
    primaryMetricKey: "avgForce",
    primaryMetricLabel: "Avg Grip Force",
    primaryMetricUnit: "%",
    targetRepsPerDay: 50,
  },
  {
    id: "rhythm-rehab",
    name: "Wrist flexion/extension - Rhythm Rehab",
    icon: "🥁",
    primaryMetricKey: "avgReactionTime",
    primaryMetricLabel: "Avg Reaction Time",
    primaryMetricUnit: "ms",
    targetRepsPerDay: 50,
  },
];

export function getGameById(id: string): ExerciseGame | undefined {
  return EXERCISE_GAMES.find((g) => g.id === id);
}
