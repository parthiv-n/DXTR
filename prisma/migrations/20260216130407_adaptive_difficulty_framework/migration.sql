/*
  Warnings:

  - You are about to drop the column `deadZone` on the `GameConfig` table. All the data in the column will be lost.
  - You are about to drop the column `targetPronation` on the `GameConfig` table. All the data in the column will be lost.
  - You are about to drop the column `targetSupination` on the `GameConfig` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GameConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "lastAdjustmentAt" DATETIME,
    "lastAdjustmentDirection" TEXT,
    "minParams" TEXT,
    "maxParams" TEXT,
    CONSTRAINT "GameConfig_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GameConfig" ("gameId", "id", "patientId") SELECT "gameId", "id", "patientId" FROM "GameConfig";
DROP TABLE "GameConfig";
ALTER TABLE "new_GameConfig" RENAME TO "GameConfig";
CREATE UNIQUE INDEX "GameConfig_patientId_gameId_key" ON "GameConfig"("patientId", "gameId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
