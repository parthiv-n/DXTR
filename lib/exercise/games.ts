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
    id: "game-2",
    name: "Cylindrical grip",
    icon: "",
    primaryMetricKey: "avgForce",
    primaryMetricLabel: "Avg Grip Force",
    primaryMetricUnit: "N",
    targetRepsPerDay: 30,
  },
  {
    id: "game-3",
    name: "Finger extension",
    icon: "",
    primaryMetricKey: "avgROM",
    primaryMetricLabel: "Avg Range of Motion",
    primaryMetricUnit: "°",
    targetRepsPerDay: 40,
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
    id: "game-5",
    name: "Wrist flexion/extension",
    icon: "",
    primaryMetricKey: "avgROM",
    primaryMetricLabel: "Avg Range of Motion",
    primaryMetricUnit: "°",
    targetRepsPerDay: 40,
  },
];

export function getGameById(id: string): ExerciseGame | undefined {
  return EXERCISE_GAMES.find((g) => g.id === id);
}
