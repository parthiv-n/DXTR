-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Clinician" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clinicianId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    CONSTRAINT "Assignment_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "Clinician" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MissionPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    CONSTRAINT "MissionPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "sampleRateHz" INTEGER NOT NULL,
    "firmwareVersion" TEXT,
    CONSTRAINT "Session_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "t0" INTEGER NOT NULL,
    "t1" INTEGER NOT NULL,
    "samples" TEXT NOT NULL,
    CONSTRAINT "SessionChunk_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "repCount" INTEGER NOT NULL,
    "peakGrip" REAL NOT NULL,
    "avgGrip" REAL NOT NULL,
    "romPronation" REAL NOT NULL,
    "romSupination" REAL NOT NULL,
    "smoothness" REAL NOT NULL,
    CONSTRAINT "SessionSummary_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_clinicianId_patientId_key" ON "Assignment"("clinicianId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionPlan_patientId_key" ON "MissionPlan"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionChunk_sessionId_seq_key" ON "SessionChunk"("sessionId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "SessionSummary_sessionId_key" ON "SessionSummary"("sessionId");
