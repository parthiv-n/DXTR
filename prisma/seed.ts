import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────

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

// ─── types ───────────────────────────────────────────────────────────────────

interface PatientProfile {
  id: string;
  name: string;
  /** 0–1: probability that the patient shows up on any given day */
  adherenceRate: number;
  /** 1–5: how many sets they typically complete when they do show up */
  avgSetsCompleted: number;
  /** degrees: their typical achieved angle range */
  angleMin: number;
  angleMax: number;
  /** 0–1: probability a rep succeeds */
  successRate: number;
  /** ms: typical reaction time range */
  reactionMin: number;
  reactionMax: number;
}

// ─── patient profiles ────────────────────────────────────────────────────────

const PATIENTS: PatientProfile[] = [
  {
    // Good adherence, improving over time
    id: "edwin-001",
    name: "Edwin",
    adherenceRate: 0.85,
    avgSetsCompleted: 4.5,
    angleMin: 12,
    angleMax: 22,
    successRate: 0.82,
    reactionMin: 350,
    reactionMax: 900,
  },
  {
    // Moderate adherence, struggles more
    id: "giles-001",
    name: "Giles",
    adherenceRate: 0.6,
    avgSetsCompleted: 3.0,
    angleMin: 8,
    angleMax: 17,
    successRate: 0.65,
    reactionMin: 500,
    reactionMax: 1400,
  },
  {
    // High adherence, strong performer
    id: "agatha-001",
    name: "Agatha",
    adherenceRate: 0.95,
    avgSetsCompleted: 5.0,
    angleMin: 16,
    angleMax: 28,
    successRate: 0.91,
    reactionMin: 280,
    reactionMax: 750,
  },
];

// ─── seed historical data ────────────────────────────────────────────────────

async function seedHistoricalData(
  patient: PatientProfile,
  daysBack: number
): Promise<void> {
  const SETS_TARGET = 5;
  const REPS_PER_SET = 10;
  const DIRECTIONS: ("left" | "right")[] = ["left", "right"];

  // Angle improves slightly over time (rehabilitation progress)
  const improvementPerDay = (patient.angleMax - patient.angleMin) / daysBack / 3;

  for (let daysAgo = daysBack; daysAgo >= 1; daysAgo--) {
    // Skip days randomly based on adherence
    if (Math.random() > patient.adherenceRate) continue;

    const date = dateStr(daysAgo);
    const progressFactor = (daysBack - daysAgo) / daysBack; // 0 → 1 as days pass
    const currentAngleMin = patient.angleMin + improvementPerDay * (daysBack - daysAgo);
    const currentAngleMax = patient.angleMax + improvementPerDay * (daysBack - daysAgo);

    // How many sets completed today (biased toward avgSetsCompleted)
    const setsCompleted = clamp(
      Math.round(rand(patient.avgSetsCompleted - 1.5, patient.avgSetsCompleted + 0.5)),
      1,
      SETS_TARGET
    );

    // Create DailyProgress
    const dailyProgressId = uuidv4();
    await prisma.dailyProgress.upsert({
      where: { patientId_gameId_date: { patientId: patient.id, gameId: "car-racer", date } },
      update: {},
      create: {
        id: dailyProgressId,
        patientId: patient.id,
        gameId: "car-racer",
        date,
        setsTarget: SETS_TARGET,
      },
    });

    // Re-fetch the id in case it already existed (upsert doesn't return on no-op easily)
    const dp = await prisma.dailyProgress.findUnique({
      where: { patientId_gameId_date: { patientId: patient.id, gameId: "car-racer", date } },
    });
    if (!dp) continue;

    for (let setNum = 1; setNum <= SETS_TARGET; setNum++) {
      const isCompleted = setNum <= setsCompleted;

      // Reps for this set
      const repsData: {
        id: string;
        gameSetId: string;
        repNumber: number;
        expectedDirection: string;
        actualDirection: string | null;
        achievedAngle: number;
        success: boolean;
        reactionTimeMs: number | null;
      }[] = [];

      let achievedReps = 0;

      if (isCompleted) {
        for (let repNum = 1; repNum <= REPS_PER_SET; repNum++) {
          const expected = DIRECTIONS[repNum % 2];
          const success =
            Math.random() < patient.successRate + progressFactor * 0.05;
          const achievedAngle = parseFloat(
            clamp(
              rand(currentAngleMin, currentAngleMax) * (success ? 1 : rand(0.4, 0.85)),
              2,
              45
            ).toFixed(1)
          );
          const reactionTimeMs = success
            ? randInt(patient.reactionMin, patient.reactionMax)
            : null;

          if (success) achievedReps++;

          repsData.push({
            id: uuidv4(),
            gameSetId: "", // filled after GameSet creation
            repNumber: repNum,
            expectedDirection: expected,
            actualDirection: success ? expected : null,
            achievedAngle,
            success,
            reactionTimeMs,
          });
        }
      }

      const setStartedAt = new Date();
      setStartedAt.setDate(setStartedAt.getDate() - daysAgo);
      setStartedAt.setHours(9 + setNum, randInt(0, 30), 0, 0);

      const setCompletedAt = isCompleted ? new Date(setStartedAt.getTime() + randInt(90, 180) * 1000) : null;

      // Upsert GameSet
      await prisma.gameSet.upsert({
        where: { dailyProgressId_setNumber: { dailyProgressId: dp.id, setNumber: setNum } },
        update: {},
        create: {
          id: uuidv4(),
          dailyProgressId: dp.id,
          setNumber: setNum,
          startedAt: setStartedAt,
          completedAt: setCompletedAt,
          completed: isCompleted,
          totalReps: REPS_PER_SET,
          achievedReps: isCompleted ? achievedReps : 0,
        },
      });

      if (!isCompleted || repsData.length === 0) continue;

      // Re-fetch set id
      const gameSet = await prisma.gameSet.findUnique({
        where: { dailyProgressId_setNumber: { dailyProgressId: dp.id, setNumber: setNum } },
      });
      if (!gameSet) continue;

      // Upsert RepResults
      for (const rep of repsData) {
        await prisma.repResult.upsert({
          where: { gameSetId_repNumber: { gameSetId: gameSet.id, repNumber: rep.repNumber } },
          update: {},
          create: {
            id: uuidv4(),
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

  console.log(`  ✓ Historical data seeded for ${patient.name}`);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...\n");

  // Upsert clinician
  await prisma.clinician.upsert({
    where: { id: "dr-tabish" },
    update: {},
    create: { id: "dr-tabish", name: "Dr. Tabish" },
  });

  const defaultGyroParams = JSON.stringify({
    targetPronation: 15,
    targetSupination: 15,
    deadZone: 5,
  });

  // ── Seed the 3 example patients with historical data ──────────────────────
  for (const profile of PATIENTS) {
    await prisma.patient.upsert({
      where: { id: profile.id },
      update: { name: profile.name },
      create: { id: profile.id, name: profile.name },
    });

    await prisma.assignment.upsert({
      where: { clinicianId_patientId: { clinicianId: "dr-tabish", patientId: profile.id } },
      update: {},
      create: { clinicianId: "dr-tabish", patientId: profile.id },
    });

    await prisma.gameConfig.upsert({
      where: { patientId_gameId: { patientId: profile.id, gameId: "car-racer" } },
      update: {},
      create: {
        patientId: profile.id,
        gameId: "car-racer",
        inputType: "gyroscope",
        difficultyParams: defaultGyroParams,
        calibrationComplete: true,
        calibrationSetsCompleted: 3,
        autoProgressionEnabled: true,
      },
    });

    console.log(`Seeding historical data for ${profile.name}...`);
    await seedHistoricalData(profile, 14);
  }

  // ── Seed the live demo patient (no history, ready for real gameplay) ───────
  const livePatient = { id: "demo-live-001", name: "Demo Patient" };

  await prisma.patient.upsert({
    where: { id: livePatient.id },
    update: { name: livePatient.name },
    create: { id: livePatient.id, name: livePatient.name },
  });

  await prisma.assignment.upsert({
    where: { clinicianId_patientId: { clinicianId: "dr-tabish", patientId: livePatient.id } },
    update: {},
    create: { clinicianId: "dr-tabish", patientId: livePatient.id },
  });

  await prisma.gameConfig.upsert({
    where: { patientId_gameId: { patientId: livePatient.id, gameId: "car-racer" } },
    update: {},
    create: {
      patientId: livePatient.id,
      gameId: "car-racer",
      inputType: "gyroscope",
      difficultyParams: defaultGyroParams,
      calibrationComplete: false,
      calibrationSetsCompleted: 0,
      autoProgressionEnabled: true,
    },
  });

  console.log(`  ✓ Live demo patient created (no history — data populates during gameplay)`);

  console.log("\n✅ Seed complete!");
  console.log("   Patients: Edwin, Giles, Agatha (14 days history) + Demo Patient (live)");
  console.log("   To play as the live patient, open the car game with ?patientId=demo-live-001");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
