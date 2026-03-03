-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinician" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Clinician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "MissionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "sampleRateHz" INTEGER NOT NULL,
    "firmwareVersion" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionChunk" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "t0" INTEGER NOT NULL,
    "t1" INTEGER NOT NULL,
    "samples" TEXT NOT NULL,

    CONSTRAINT "SessionChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSummary" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "repCount" INTEGER NOT NULL,
    "peakGrip" DOUBLE PRECISION NOT NULL,
    "avgGrip" DOUBLE PRECISION NOT NULL,
    "romPronation" DOUBLE PRECISION NOT NULL,
    "romSupination" DOUBLE PRECISION NOT NULL,
    "smoothness" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SessionSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameConfig" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "inputType" TEXT NOT NULL DEFAULT 'gyroscope',
    "difficultyParams" TEXT NOT NULL DEFAULT '{}',
    "calibrationComplete" BOOLEAN NOT NULL DEFAULT false,
    "calibrationSetsCompleted" INTEGER NOT NULL DEFAULT 0,
    "baselineData" TEXT,
    "autoProgressionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "consecutiveGoodSets" INTEGER NOT NULL DEFAULT 0,
    "consecutiveStruggleSets" INTEGER NOT NULL DEFAULT 0,
    "lastAdjustmentAt" TIMESTAMP(3),
    "lastAdjustmentDirection" TEXT,
    "minParams" TEXT,
    "maxParams" TEXT,

    CONSTRAINT "GameConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyProgress" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "setsTarget" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "DailyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSet" (
    "id" TEXT NOT NULL,
    "dailyProgressId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "totalReps" INTEGER NOT NULL DEFAULT 10,
    "achievedReps" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GameSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepResult" (
    "id" TEXT NOT NULL,
    "gameSetId" TEXT NOT NULL,
    "repNumber" INTEGER NOT NULL,
    "expectedDirection" TEXT NOT NULL,
    "actualDirection" TEXT,
    "achievedAngle" DOUBLE PRECISION NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "reactionTimeMs" INTEGER,

    CONSTRAINT "RepResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_clinicianId_patientId_key" ON "Assignment"("clinicianId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionPlan_patientId_key" ON "MissionPlan"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionChunk_sessionId_seq_key" ON "SessionChunk"("sessionId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "SessionSummary_sessionId_key" ON "SessionSummary"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "GameConfig_patientId_gameId_key" ON "GameConfig"("patientId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyProgress_patientId_gameId_date_key" ON "DailyProgress"("patientId", "gameId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GameSet_dailyProgressId_setNumber_key" ON "GameSet"("dailyProgressId", "setNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RepResult_gameSetId_repNumber_key" ON "RepResult"("gameSetId", "repNumber");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "Clinician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionPlan" ADD CONSTRAINT "MissionPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionChunk" ADD CONSTRAINT "SessionChunk_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSummary" ADD CONSTRAINT "SessionSummary_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameConfig" ADD CONSTRAINT "GameConfig_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyProgress" ADD CONSTRAINT "DailyProgress_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSet" ADD CONSTRAINT "GameSet_dailyProgressId_fkey" FOREIGN KEY ("dailyProgressId") REFERENCES "DailyProgress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepResult" ADD CONSTRAINT "RepResult_gameSetId_fkey" FOREIGN KEY ("gameSetId") REFERENCES "GameSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
