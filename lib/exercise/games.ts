import { ExerciseGame } from "./types";

export const EXERCISE_GAMES: ExerciseGame[] = [
  {
    id: "car-racer",
    name: "Car Racer",
    icon: "🏎️",
    primaryMetricKey: "avgAngle",
    primaryMetricLabel: "Avg Dodge Angle",
    primaryMetricUnit: "°",
    targetRepsPerDay: 50,
  },
  {
    id: "game-2",
    name: "Pinch Trainer",
    icon: "🤏",
    primaryMetricKey: "avgForce",
    primaryMetricLabel: "Avg Pinch Force",
    primaryMetricUnit: "N",
    targetRepsPerDay: 30,
  },
  {
    id: "game-3",
    name: "Wrist Flex",
    icon: "💪",
    primaryMetricKey: "avgROM",
    primaryMetricLabel: "Avg Range of Motion",
    primaryMetricUnit: "°",
    targetRepsPerDay: 40,
  },
  {
    id: "game-4",
    name: "Reaction Tap",
    icon: "⚡",
    primaryMetricKey: "avgReactionTime",
    primaryMetricLabel: "Avg Reaction Time",
    primaryMetricUnit: "ms",
    targetRepsPerDay: 50,
  },
  {
    id: "game-5",
    name: "Grip Squeeze",
    icon: "✊",
    primaryMetricKey: "avgGripStrength",
    primaryMetricLabel: "Avg Grip Strength",
    primaryMetricUnit: "%",
    targetRepsPerDay: 30,
  },
  {
    id: "game-6",
    name: "Object Sort",
    icon: "🧩",
    primaryMetricKey: "avgAccuracy",
    primaryMetricLabel: "Avg Accuracy",
    primaryMetricUnit: "%",
    targetRepsPerDay: 40,
  },
];

export function getGameById(id: string): ExerciseGame | undefined {
  return EXERCISE_GAMES.find((g) => g.id === id);
}
