-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deputationId" TEXT NOT NULL,
    "byParty" TEXT NOT NULL,
    "wagePerDayPaise" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "housingProvided" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Offer_deputationId_fkey" FOREIGN KEY ("deputationId") REFERENCES "Deputation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
