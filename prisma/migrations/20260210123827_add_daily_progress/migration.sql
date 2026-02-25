-- CreateTable
CREATE TABLE "DailyProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "setsTarget" INTEGER NOT NULL DEFAULT 5,
    CONSTRAINT "DailyProgress_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyProgressId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "totalReps" INTEGER NOT NULL DEFAULT 10,
    "achievedReps" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "GameSet_dailyProgressId_fkey" FOREIGN KEY ("dailyProgressId") REFERENCES "DailyProgress" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RepResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameSetId" TEXT NOT NULL,
    "repNumber" INTEGER NOT NULL,
    "expectedDirection" TEXT NOT NULL,
    "actualDirection" TEXT,
    "achievedAngle" REAL NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "reactionTimeMs" INTEGER,
    CONSTRAINT "RepResult_gameSetId_fkey" FOREIGN KEY ("gameSetId") REFERENCES "GameSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyProgress_patientId_gameId_date_key" ON "DailyProgress"("patientId", "gameId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GameSet_dailyProgressId_setNumber_key" ON "GameSet"("dailyProgressId", "setNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RepResult_gameSetId_repNumber_key" ON "RepResult"("gameSetId", "repNumber");
