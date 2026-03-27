import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

interface GameDef {
  id: string;
  directions: string[];
  angleRange: [number, number];
  reactionRange: [number, number];
  successBase: number;
  improvementRate: number;
  inputType: string;
  difficultyParams: Record<string, unknown>;
}

interface PatientProfile {
  id: string;
  name: string;
  adherence: number;
  setsAvg: number;
  skillMult: number;
}

const GAMES: GameDef[] = [
  {
    id: "car-racer",
    directions: ["left", "right"],
    angleRange: [10, 24],
    reactionRange: [400, 950],
    successBase: 0.72,
    improvementRate: 0.015,
    inputType: "gyroscope",
    difficultyParams: { targetPronation: 15, targetSupination: 15, deadZone: 5 },
  },
  {
    id: "alien-abduction",
    directions: ["up", "down"],
    angleRange: [600, 2800],
    reactionRange: [300, 800],
    successBase: 0.78,
    improvementRate: 0.012,
    inputType: "fsr",
    difficultyParams: { threshold: 1200, holdTimeMs: 500 },
  },
  {
    id: "fossil-finder",
    directions: ["left", "right"],
    angleRange: [8, 22],
    reactionRange: [500, 1200],
    successBase: 0.65,
    improvementRate: 0.018,
    inputType: "imu",
    difficultyParams: { targetDeviation: 12, deadZone: 3 },
  },
  {
    id: "storm-witch",
    directions: ["up", "down"],
    angleRange: [400, 2400],
    reactionRange: [350, 900],
    successBase: 0.75,
    improvementRate: 0.013,
    inputType: "fsr",
    difficultyParams: { threshold: 800, holdTimeMs: 400 },
  },
  {
    id: "fly-swatter",
    directions: ["up", "down"],
    angleRange: [5, 20],
    reactionRange: [400, 1100],
    successBase: 0.68,
    improvementRate: 0.016,
    inputType: "ultrasonic",
    difficultyParams: { triggerDistance: 10, cooldownMs: 500 },
  },
  {
    id: "rhythm-rehab",
    directions: ["up", "down"],
    angleRange: [8, 25],
    reactionRange: [500, 1500],
    successBase: 0.60,
    improvementRate: 0.020,
    inputType: "imu",
    difficultyParams: { pitchThreshold: 15, reactionWindowMs: 1500 },
  },
];

const PATIENTS: PatientProfile[] = [
  { id: "edwin-001", name: "Edwin", adherence: 0.85, setsAvg: 4.2, skillMult: 1.0 },
  { id: "giles-001", name: "Giles", adherence: 0.55, setsAvg: 2.8, skillMult: 0.80 },
  { id: "agatha-001", name: "Agatha", adherence: 0.92, setsAvg: 4.8, skillMult: 1.15 },
];

const DAYS_BACK = 14;
const SETS_TARGET = 5;
const REPS_PER_SET = 10;
const CLINICIAN_ID = "dr-tabish";

async function seedGameHistory(
  patient: PatientProfile,
  game: GameDef,
): Promise<void> {
  const gameAdherence = clamp(patient.adherence + rand(-0.1, 0.05), 0.3, 1.0);

  for (let daysAgo = DAYS_BACK; daysAgo >= 1; daysAgo--) {
    if (Math.random() > gameAdherence) continue;

    const date = dateStr(daysAgo);
    const progress = (DAYS_BACK - daysAgo) / DAYS_BACK;
    const successRate = clamp(
      game.successBase * patient.skillMult + game.improvementRate * (DAYS_BACK - daysAgo),
      0.35,
      0.98,
    );

    const setsCompleted = clamp(
      Math.round(rand(patient.setsAvg - 1.5, patient.setsAvg + 0.5)),
      1,
      SETS_TARGET,
    );

    const dp = await prisma.dailyProgress.upsert({
      where: { patientId_gameId_date: { patientId: patient.id, gameId: game.id, date } },
      update: {},
      create: { patientId: patient.id, gameId: game.id, date, setsTarget: SETS_TARGET },
    });

    for (let setNum = 1; setNum <= SETS_TARGET; setNum++) {
      const isCompleted = setNum <= setsCompleted;
      const startHour = 9 + setNum;
      const startMin = randInt(0, 30);
      const startedAt = new Date();
      startedAt.setDate(startedAt.getDate() - daysAgo);
      startedAt.setHours(startHour, startMin, 0, 0);
      const completedAt = isCompleted
        ? new Date(startedAt.getTime() + randInt(60, 180) * 1000)
        : null;

      let achievedReps = 0;
      const repsData: {
        repNumber: number;
        expectedDirection: string;
        actualDirection: string | null;
        achievedAngle: number;
        success: boolean;
        reactionTimeMs: number | null;
      }[] = [];

      if (isCompleted) {
        for (let repNum = 1; repNum <= REPS_PER_SET; repNum++) {
          const expected = game.directions[repNum % game.directions.length];
          const success = Math.random() < successRate;

          const angleBase =
            game.angleRange[0] +
            (game.angleRange[1] - game.angleRange[0]) * (0.3 + progress * 0.5);
          const angleNoise = (game.angleRange[1] - game.angleRange[0]) * 0.2;
          const achievedAngle = parseFloat(
            clamp(
              angleBase + rand(-angleNoise, angleNoise) * (success ? 1 : 0.5),
              game.angleRange[0] * 0.6,
              game.angleRange[1] * 1.1,
            ).toFixed(1),
          );

          const rtBase =
            game.reactionRange[1] -
            (game.reactionRange[1] - game.reactionRange[0]) * (0.2 + progress * 0.6);
          const rtNoise = (game.reactionRange[1] - game.reactionRange[0]) * 0.15;
          const reactionTimeMs = success
            ? clamp(
                Math.round(rtBase + rand(-rtNoise, rtNoise)),
                game.reactionRange[0],
                game.reactionRange[1],
              )
            : null;

          if (success) achievedReps++;
          repsData.push({
            repNumber: repNum,
            expectedDirection: expected,
            actualDirection: success ? expected : null,
            achievedAngle,
            success,
            reactionTimeMs,
          });
        }
      }

      const gameSet = await prisma.gameSet.upsert({
        where: { dailyProgressId_setNumber: { dailyProgressId: dp.id, setNumber: setNum } },
        update: {},
        create: {
          dailyProgressId: dp.id,
          setNumber: setNum,
          startedAt,
          completedAt,
          completed: isCompleted,
          totalReps: REPS_PER_SET,
          achievedReps: isCompleted ? achievedReps : 0,
        },
      });

      for (const rep of repsData) {
        await prisma.repResult.upsert({
          where: { gameSetId_repNumber: { gameSetId: gameSet.id, repNumber: rep.repNumber } },
          update: {},
          create: {
            gameSetId: gameSet.id,
            repNumber: rep.repNumber,
            expectedDirection: rep.expectedDirection,
            actualDirection: rep.actualDirection,
            achievedAngle: rep.achievedAngle,
            success: rep.success,
            reactionTimeMs: rep.reactionTimeMs,
          },
        });
      }
    }
  }
}

async function main() {
  console.log("Seeding database...\n");

  await prisma.clinician.upsert({
    where: { id: CLINICIAN_ID },
    update: {},
    create: { id: CLINICIAN_ID, name: "Dr. Tabish" },
  });

  for (const patient of PATIENTS) {
    await prisma.patient.upsert({
      where: { id: patient.id },
      update: { name: patient.name },
      create: { id: patient.id, name: patient.name },
    });

    await prisma.assignment.upsert({
      where: { clinicianId_patientId: { clinicianId: CLINICIAN_ID, patientId: patient.id } },
      update: {},
      create: { clinicianId: CLINICIAN_ID, patientId: patient.id },
    });

    for (const game of GAMES) {
      await prisma.gameConfig.upsert({
        where: { patientId_gameId: { patientId: patient.id, gameId: game.id } },
        update: {},
        create: {
          patientId: patient.id,
          gameId: game.id,
          inputType: game.inputType,
          difficultyParams: JSON.stringify(game.difficultyParams),
          calibrationComplete: true,
          calibrationSetsCompleted: 3,
          autoProgressionEnabled: true,
        },
      });

      console.log(`  Seeding ${patient.name} / ${game.id}...`);
      await seedGameHistory(patient, game);
    }
    console.log(`  Done: ${patient.name}\n`);
  }

  // Demo patient — no history
  const liveId = "demo-live-001";
  await prisma.patient.upsert({
    where: { id: liveId },
    update: { name: "Demo Patient" },
    create: { id: liveId, name: "Demo Patient" },
  });
  await prisma.assignment.upsert({
    where: { clinicianId_patientId: { clinicianId: CLINICIAN_ID, patientId: liveId } },
    update: {},
    create: { clinicianId: CLINICIAN_ID, patientId: liveId },
  });
  for (const game of GAMES) {
    await prisma.gameConfig.upsert({
      where: { patientId_gameId: { patientId: liveId, gameId: game.id } },
      update: {},
      create: {
        patientId: liveId,
        gameId: game.id,
        inputType: game.inputType,
        difficultyParams: JSON.stringify(game.difficultyParams),
        calibrationComplete: false,
        calibrationSetsCompleted: 0,
        autoProgressionEnabled: true,
      },
    });
  }
  console.log("  Demo patient created (no history)\n");
  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
