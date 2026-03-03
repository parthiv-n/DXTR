const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function esc(s) { return s.replace(/'/g, "''"); }

const PATIENTS = [
  { id: "edwin-001",  name: "Edwin",  adherenceRate: 0.85, avgSetsCompleted: 4.5, angleMin: 12, angleMax: 22, successRate: 0.82, reactionMin: 350,  reactionMax: 900  },
  { id: "giles-001",  name: "Giles",  adherenceRate: 0.60, avgSetsCompleted: 3.0, angleMin: 8,  angleMax: 17, successRate: 0.65, reactionMin: 500,  reactionMax: 1400 },
  { id: "agatha-001", name: "Agatha", adherenceRate: 0.95, avgSetsCompleted: 5.0, angleMin: 16, angleMax: 28, successRate: 0.91, reactionMin: 280,  reactionMax: 750  },
];

const DAYS_BACK = 14;
const SETS_TARGET = 5;
const REPS_PER_SET = 10;
const DIRECTIONS = ["left", "right"];
const GAME_ID = "car-racer";
const CLINICIAN_ID = "dr-tabish";
const gyroParams = esc(JSON.stringify({ targetPronation: 15, targetSupination: 15, deadZone: 5 }));

const lines = [];

lines.push("-- ============================================================");
lines.push("-- DXTR Seed SQL  (car-racer, 14 days history + live demo patient)");
lines.push("-- Run in Supabase Dashboard > SQL Editor");
lines.push("-- ============================================================");
lines.push("");

// Clinician
lines.push("-- Clinician");
lines.push(`INSERT INTO "Clinician" (id, name) VALUES ('${CLINICIAN_ID}', 'Dr. Tabish') ON CONFLICT (id) DO NOTHING;`);
lines.push("");

// Patients
lines.push("-- Patients");
for (const p of PATIENTS) {
  lines.push(`INSERT INTO "Patient" (id, name) VALUES ('${p.id}', '${esc(p.name)}') ON CONFLICT (id) DO NOTHING;`);
}
lines.push(`INSERT INTO "Patient" (id, name) VALUES ('demo-live-001', 'Demo Patient') ON CONFLICT (id) DO NOTHING;`);
lines.push("");

// Assignments
lines.push("-- Assignments");
for (const p of [...PATIENTS, { id: "demo-live-001" }]) {
  lines.push(
    `INSERT INTO "Assignment" (id, "clinicianId", "patientId") ` +
    `SELECT gen_random_uuid()::text, '${CLINICIAN_ID}', '${p.id}' ` +
    `WHERE NOT EXISTS (SELECT 1 FROM "Assignment" WHERE "clinicianId"='${CLINICIAN_ID}' AND "patientId"='${p.id}');`
  );
}
lines.push("");

// GameConfigs
lines.push("-- GameConfigs");
for (const p of PATIENTS) {
  lines.push(
    `INSERT INTO "GameConfig" (id, "patientId", "gameId", "inputType", "difficultyParams", "calibrationComplete", "calibrationSetsCompleted", "autoProgressionEnabled") ` +
    `SELECT gen_random_uuid()::text, '${p.id}', '${GAME_ID}', 'gyroscope', '${gyroParams}', true, 3, true ` +
    `WHERE NOT EXISTS (SELECT 1 FROM "GameConfig" WHERE "patientId"='${p.id}' AND "gameId"='${GAME_ID}');`
  );
}
// Live demo patient — not calibrated yet
lines.push(
  `INSERT INTO "GameConfig" (id, "patientId", "gameId", "inputType", "difficultyParams", "calibrationComplete", "calibrationSetsCompleted", "autoProgressionEnabled") ` +
  `SELECT gen_random_uuid()::text, 'demo-live-001', '${GAME_ID}', 'gyroscope', '${gyroParams}', false, 0, true ` +
  `WHERE NOT EXISTS (SELECT 1 FROM "GameConfig" WHERE "patientId"='demo-live-001' AND "gameId"='${GAME_ID}');`
);
lines.push("");

// Historical data
lines.push("-- ============================================================");
lines.push("-- Historical DailyProgress, GameSet, RepResult");
lines.push("-- ============================================================");
lines.push("");

for (const patient of PATIENTS) {
  lines.push(`-- ${patient.name}`);
  const improvementPerDay = (patient.angleMax - patient.angleMin) / DAYS_BACK / 3;

  for (let daysAgo = DAYS_BACK; daysAgo >= 1; daysAgo--) {
    if (Math.random() > patient.adherenceRate) continue;

    const date = dateStr(daysAgo);
    const progressFactor = (DAYS_BACK - daysAgo) / DAYS_BACK;
    const currentAngleMin = patient.angleMin + improvementPerDay * (DAYS_BACK - daysAgo);
    const currentAngleMax = patient.angleMax + improvementPerDay * (DAYS_BACK - daysAgo);
    const setsCompleted = clamp(
      Math.round(rand(patient.avgSetsCompleted - 1.5, patient.avgSetsCompleted + 0.5)),
      1,
      SETS_TARGET
    );

    const dpId = uuidv4();
    lines.push(
      `INSERT INTO "DailyProgress" (id, "patientId", "gameId", date, "setsTarget") ` +
      `VALUES ('${dpId}', '${patient.id}', '${GAME_ID}', '${date}', ${SETS_TARGET}) ` +
      `ON CONFLICT ("patientId", "gameId", date) DO NOTHING;`
    );

    for (let setNum = 1; setNum <= SETS_TARGET; setNum++) {
      const isCompleted = setNum <= setsCompleted;
      const setId = uuidv4();

      const setStartedAt = new Date();
      setStartedAt.setDate(setStartedAt.getDate() - daysAgo);
      setStartedAt.setHours(9 + setNum, randInt(0, 30), 0, 0);
      const setCompletedAt = isCompleted
        ? new Date(setStartedAt.getTime() + randInt(90, 180) * 1000)
        : null;

      let achievedReps = 0;
      const reps = [];

      if (isCompleted) {
        for (let repNum = 1; repNum <= REPS_PER_SET; repNum++) {
          const expected = DIRECTIONS[repNum % 2];
          const success = Math.random() < patient.successRate + progressFactor * 0.05;
          const achievedAngle = parseFloat(
            clamp(
              rand(currentAngleMin, currentAngleMax) * (success ? 1 : rand(0.4, 0.85)),
              2,
              45
            ).toFixed(1)
          );
          const reactionTimeMs = success ? randInt(patient.reactionMin, patient.reactionMax) : null;
          if (success) achievedReps++;
          reps.push({ repNum, expected, actual: success ? expected : null, achievedAngle, success, reactionTimeMs });
        }
      }

      const completedAtSql = setCompletedAt ? `'${setCompletedAt.toISOString()}'` : "NULL";
      lines.push(
        `INSERT INTO "GameSet" (id, "dailyProgressId", "setNumber", "startedAt", "completedAt", completed, "totalReps", "achievedReps") ` +
        `SELECT '${setId}', id, ${setNum}, '${setStartedAt.toISOString()}', ${completedAtSql}, ${isCompleted}, ${REPS_PER_SET}, ${isCompleted ? achievedReps : 0} ` +
        `FROM "DailyProgress" WHERE "patientId"='${patient.id}' AND "gameId"='${GAME_ID}' AND date='${date}' ` +
        `ON CONFLICT ("dailyProgressId", "setNumber") DO NOTHING;`
      );

      for (const rep of reps) {
        const repId = uuidv4();
        const actualSql = rep.actual ? `'${rep.actual}'` : "NULL";
        const reactionSql = rep.reactionTimeMs !== null ? rep.reactionTimeMs : "NULL";
        lines.push(
          `INSERT INTO "RepResult" (id, "gameSetId", "repNumber", "expectedDirection", "actualDirection", "achievedAngle", success, "reactionTimeMs") ` +
          `VALUES ('${repId}', '${setId}', ${rep.repNum}, '${rep.expected}', ${actualSql}, ${rep.achievedAngle}, ${rep.success}, ${reactionSql}) ` +
          `ON CONFLICT ("gameSetId", "repNumber") DO NOTHING;`
        );
      }
    }
    lines.push("");
  }
  lines.push("");
}

lines.push("-- ============================================================");
lines.push("-- Demo Patient: no history. Data is written in real time during gameplay.");
lines.push("-- Open the car game with ?patientId=demo-live-001 to collect live data.");
lines.push("-- ============================================================");

const outPath = path.join(__dirname, "seed.sql");
fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log("Generated: " + outPath);
console.log("Total SQL lines: " + lines.length);
