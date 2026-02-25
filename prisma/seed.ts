import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Upsert default clinician
  await prisma.clinician.upsert({
    where: { id: "dr-tabish" },
    update: {},
    create: { id: "dr-tabish", name: "Dr. Tabish" },
  });

  // Upsert default patients
  const patients = [
    { id: "edwin-001", name: "Edwin" },
    { id: "giles-001", name: "Giles" },
    { id: "agatha-001", name: "Agatha" },
  ];

  for (const p of patients) {
    await prisma.patient.upsert({
      where: { id: p.id },
      update: { name: p.name },
      create: { id: p.id, name: p.name },
    });

    // Assign each patient to Dr. Tabish
    await prisma.assignment.upsert({
      where: {
        clinicianId_patientId: {
          clinicianId: "dr-tabish",
          patientId: p.id,
        },
      },
      update: {},
      create: {
        clinicianId: "dr-tabish",
        patientId: p.id,
      },
    });

    // Seed default GameConfig for car-racer (adaptive schema)
    const defaultGyroParams = JSON.stringify({
      targetPronation: 15,
      targetSupination: 15,
      deadZone: 5,
    });

    await prisma.gameConfig.upsert({
      where: {
        patientId_gameId: { patientId: p.id, gameId: "car-racer" },
      },
      update: {},
      create: {
        patientId: p.id,
        gameId: "car-racer",
        inputType: "gyroscope",
        difficultyParams: defaultGyroParams,
        calibrationComplete: false,
        calibrationSetsCompleted: 0,
        autoProgressionEnabled: true,
      },
    });
  }

  console.log("✅ Seed complete: Dr. Tabish + 3 patients + game configs created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
