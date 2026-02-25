-- CreateTable
CREATE TABLE "GameConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "targetPronation" REAL NOT NULL DEFAULT 15,
    "targetSupination" REAL NOT NULL DEFAULT 15,
    "deadZone" REAL NOT NULL DEFAULT 5,
    CONSTRAINT "GameConfig_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GameConfig_patientId_gameId_key" ON "GameConfig"("patientId", "gameId");
