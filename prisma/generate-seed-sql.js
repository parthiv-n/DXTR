const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}
function isoAt(daysAgo, hour, min) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function esc(s) { return s.replace(/'/g, "''"); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Game definitions with rehab-realistic parameters ──────────────────────────
// Each game defines how to generate rep data that reflects a stroke patient's
// gradual improvement over 14 days.
const GAMES = [
  {
    id: "car-racer",
    directions: ["left", "right"],
    angleRange: [10, 24],       // wrist pronation/supination degrees
    reactionRange: [400, 950],
    successBase: 0.72,
    improvementRate: 0.015,     // success rate improvement per day
    inputType: "gyroscope",
    difficultyParams: { targetPronation: 15, targetSupination: 15, deadZone: 5 },
  },
  {
    id: "alien-abduction",
    directions: ["up", "down"],
    angleRange: [600, 2800],    // FSR raw ADC value (thumb press strength)
    reactionRange: [300, 800],
    successBase: 0.78,
    improvementRate: 0.012,
    inputType: "fsr",
    difficultyParams: { threshold: 1200, holdTimeMs: 500 },
  },
  {
    id: "fossil-finder",
    directions: ["left", "right"],
    angleRange: [8, 22],        // wrist radial/ulnar deviation degrees
    reactionRange: [500, 1200],
    successBase: 0.65,
    improvementRate: 0.018,
    inputType: "imu",
    difficultyParams: { targetDeviation: 12, deadZone: 3 },
  },
  {
    id: "storm-witch",
    directions: ["up", "down"],
    angleRange: [400, 2400],    // FSR grip force (raw ADC)
    reactionRange: [350, 900],
    successBase: 0.75,
    improvementRate: 0.013,
    inputType: "fsr",
    difficultyParams: { threshold: 800, holdTimeMs: 400 },
  },
  {
    id: "fly-swatter",
    directions: ["up", "down"],
    angleRange: [5, 20],        // finger extension distance cm
    reactionRange: [400, 1100],
    successBase: 0.68,
    improvementRate: 0.016,
    inputType: "ultrasonic",
    difficultyParams: { triggerDistance: 10, cooldownMs: 500 },
  },
  {
    id: "rhythm-rehab",
    directions: ["up", "down"],
    angleRange: [8, 25],        // wrist flexion/extension pitch degrees
    reactionRange: [500, 1500],
    successBase: 0.60,
    improvementRate: 0.020,
    inputType: "imu",
    difficultyParams: { pitchThreshold: 15, reactionWindowMs: 1500 },
  },
];

const PATIENTS = [
  { id: "edwin-001",  name: "Edwin",  adherence: 0.85, setsAvg: 4.2, skillMult: 1.0  },
  { id: "giles-001",  name: "Giles",  adherence: 0.55, setsAvg: 2.8, skillMult: 0.80 },
  { id: "agatha-001", name: "Agatha", adherence: 0.92, setsAvg: 4.8, skillMult: 1.15 },
  // Stroke recovery, mid-program: limited ROM, inconsistent attendance.
  { id: "gordon-001", name: "Gordon", adherence: 0.65, setsAvg: 3.0, skillMult: 0.75 },
];

const DAYS_BACK = 14;
const SETS_TARGET = 5;
const REPS_PER_SET = 10;
const CLINICIAN_ID = "dr-tabish";

const lines = [];
const ln = (s) => lines.push(s);

ln("-- ============================================================");
ln("-- DXTR Seed SQL  (multi-game, 14 days history)");
ln("-- Run in Supabase Dashboard > SQL Editor");
ln("-- ============================================================");
ln("");

ln("-- Clinician");
ln(`INSERT INTO "Clinician" (id, name) VALUES ('${CLINICIAN_ID}', 'Dr. Tabish') ON CONFLICT (id) DO NOTHING;`);
ln("");

ln("-- Patients");
for (const p of PATIENTS) {
  ln(`INSERT INTO "Patient" (id, name) VALUES ('${p.id}', '${esc(p.name)}') ON CONFLICT (id) DO NOTHING;`);
}
ln(`INSERT INTO "Patient" (id, name) VALUES ('demo-live-001', 'Demo Patient') ON CONFLICT (id) DO NOTHING;`);
ln("");

ln("-- Assignments");
for (const p of [...PATIENTS, { id: "demo-live-001" }]) {
  ln(
    `INSERT INTO "Assignment" (id, "clinicianId", "patientId") ` +
    `SELECT gen_random_uuid()::text, '${CLINICIAN_ID}', '${p.id}' ` +
    `WHERE NOT EXISTS (SELECT 1 FROM "Assignment" WHERE "clinicianId"='${CLINICIAN_ID}' AND "patientId"='${p.id}');`
  );
}
ln("");

ln("-- GameConfigs");
for (const game of GAMES) {
  const params = esc(JSON.stringify(game.difficultyParams));
  for (const p of PATIENTS) {
    ln(
      `INSERT INTO "GameConfig" (id, "patientId", "gameId", "inputType", "difficultyParams", "calibrationComplete", "calibrationSetsCompleted", "autoProgressionEnabled") ` +
      `SELECT gen_random_uuid()::text, '${p.id}', '${game.id}', '${game.inputType}', '${params}', true, 3, true ` +
      `WHERE NOT EXISTS (SELECT 1 FROM "GameConfig" WHERE "patientId"='${p.id}' AND "gameId"='${game.id}');`
    );
  }
  ln(
    `INSERT INTO "GameConfig" (id, "patientId", "gameId", "inputType", "difficultyParams", "calibrationComplete", "calibrationSetsCompleted", "autoProgressionEnabled") ` +
    `SELECT gen_random_uuid()::text, 'demo-live-001', '${game.id}', '${game.inputType}', '${params}', false, 0, true ` +
    `WHERE NOT EXISTS (SELECT 1 FROM "GameConfig" WHERE "patientId"='demo-live-001' AND "gameId"='${game.id}');`
  );
}
ln("");

ln("-- ============================================================");
ln("-- Historical DailyProgress, GameSet, RepResult");
ln("-- ============================================================");
ln("");

for (const patient of PATIENTS) {
  ln(`-- ── ${patient.name} ──`);

  for (const game of GAMES) {
    ln(`-- ${patient.name} / ${game.id}`);

    // Not every patient plays every game every day — vary per game
    const gameAdherence = clamp(patient.adherence + rand(-0.1, 0.05), 0.3, 1.0);

    for (let daysAgo = DAYS_BACK; daysAgo >= 1; daysAgo--) {
      if (Math.random() > gameAdherence) continue;

      const date = dateStr(daysAgo);
      const progress = (DAYS_BACK - daysAgo) / DAYS_BACK; // 0 → 1 over 14 days
      const successRate = clamp(
        (game.successBase * patient.skillMult) + (game.improvementRate * (DAYS_BACK - daysAgo)),
        0.35, 0.98
      );

      const setsCompleted = clamp(
        Math.round(rand(patient.setsAvg - 1.5, patient.setsAvg + 0.5)),
        1, SETS_TARGET
      );

      const dpId = uuidv4();
      ln(
        `INSERT INTO "DailyProgress" (id, "patientId", "gameId", date, "setsTarget") ` +
        `VALUES ('${dpId}', '${patient.id}', '${game.id}', '${date}', ${SETS_TARGET}) ` +
        `ON CONFLICT ("patientId", "gameId", date) DO NOTHING;`
      );

      for (let setNum = 1; setNum <= SETS_TARGET; setNum++) {
        const isCompleted = setNum <= setsCompleted;
        const setId = uuidv4();
        const startHour = 9 + setNum;
        const startMin = randInt(0, 30);
        const startedAt = isoAt(daysAgo, startHour, startMin);
        const completedAt = isCompleted
          ? isoAt(daysAgo, startHour, startMin + randInt(1, 3))
          : null;

        let achievedReps = 0;
        const reps = [];

        if (isCompleted) {
          for (let repNum = 1; repNum <= REPS_PER_SET; repNum++) {
            const expected = game.directions[repNum % game.directions.length];
            const success = Math.random() < successRate;

            // Angle improves over time: starts near low end, trends toward high end
            const angleBase = game.angleRange[0] + (game.angleRange[1] - game.angleRange[0]) * (0.3 + progress * 0.5);
            const angleNoise = (game.angleRange[1] - game.angleRange[0]) * 0.2;
            const achievedAngle = parseFloat(
              clamp(
                angleBase + rand(-angleNoise, angleNoise) * (success ? 1 : 0.5),
                game.angleRange[0] * 0.6,
                game.angleRange[1] * 1.1
              ).toFixed(1)
            );

            // Reaction time improves over time
            const rtBase = game.reactionRange[1] - (game.reactionRange[1] - game.reactionRange[0]) * (0.2 + progress * 0.6);
            const rtNoise = (game.reactionRange[1] - game.reactionRange[0]) * 0.15;
            const reactionTimeMs = success
              ? clamp(Math.round(rtBase + rand(-rtNoise, rtNoise)), game.reactionRange[0], game.reactionRange[1])
              : null;

            if (success) achievedReps++;
            reps.push({ repNum, expected, actual: success ? expected : null, achievedAngle, success, reactionTimeMs });
          }
        }

        const completedAtSql = completedAt ? `'${completedAt}'` : "NULL";
        ln(
          `INSERT INTO "GameSet" (id, "dailyProgressId", "setNumber", "startedAt", "completedAt", completed, "totalReps", "achievedReps") ` +
          `SELECT '${setId}', id, ${setNum}, '${startedAt}', ${completedAtSql}, ${isCompleted}, ${REPS_PER_SET}, ${isCompleted ? achievedReps : 0} ` +
          `FROM "DailyProgress" WHERE "patientId"='${patient.id}' AND "gameId"='${game.id}' AND date='${date}' ` +
          `ON CONFLICT ("dailyProgressId", "setNumber") DO NOTHING;`
        );

        for (const rep of reps) {
          const repId = uuidv4();
          const actualSql = rep.actual ? `'${rep.actual}'` : "NULL";
          const reactionSql = rep.reactionTimeMs !== null ? rep.reactionTimeMs : "NULL";
          ln(
            `INSERT INTO "RepResult" (id, "gameSetId", "repNumber", "expectedDirection", "actualDirection", "achievedAngle", success, "reactionTimeMs") ` +
            `VALUES ('${repId}', '${setId}', ${rep.repNum}, '${rep.expected}', ${actualSql}, ${rep.achievedAngle}, ${rep.success}, ${reactionSql}) ` +
            `ON CONFLICT ("gameSetId", "repNumber") DO NOTHING;`
          );
        }
      }
      ln("");
    }
    ln("");
  }
}

ln("-- ============================================================");
ln("-- Demo Patient: no history. Data written in real time during gameplay.");
ln("-- ============================================================");

const outPath = path.join(__dirname, "seed.sql");
fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log("Generated: " + outPath);
console.log("Total SQL lines: " + lines.length);
