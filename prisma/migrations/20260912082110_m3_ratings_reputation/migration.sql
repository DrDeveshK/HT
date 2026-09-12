-- CreateTable
CREATE TABLE "Favourite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favourite_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Favourite_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Hotel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "groupId" TEXT,
    "regionId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "rooms" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'MID',
    "cuisinesJson" TEXT NOT NULL DEFAULT '[]',
    "languagesJson" TEXT NOT NULL DEFAULT '[]',
    "staffHousingCapacity" INTEGER NOT NULL DEFAULT 0,
    "brandStandards" TEXT,
    "ratingAggJson" TEXT NOT NULL DEFAULT '{}',
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Hotel_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "HotelGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Hotel_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Hotel" ("brandStandards", "city", "createdAt", "cuisinesJson", "groupId", "id", "languagesJson", "lat", "lng", "name", "regionId", "rooms", "staffHousingCapacity", "tier") SELECT "brandStandards", "city", "createdAt", "cuisinesJson", "groupId", "id", "languagesJson", "lat", "lng", "name", "regionId", "rooms", "staffHousingCapacity", "tier" FROM "Hotel";
DROP TABLE "Hotel";
ALTER TABLE "new_Hotel" RENAME TO "Hotel";
CREATE TABLE "new_Rating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deputationId" TEXT NOT NULL,
    "targetWorkerId" TEXT,
    "targetHotelId" TEXT,
    "raterLabel" TEXT NOT NULL,
    "raterRole" TEXT NOT NULL DEFAULT 'HOST_HOTEL',
    "score" INTEGER NOT NULL,
    "scoresJson" TEXT NOT NULL DEFAULT '{}',
    "wouldRehire" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'VISIBLE',
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rating_deputationId_fkey" FOREIGN KEY ("deputationId") REFERENCES "Deputation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rating_targetWorkerId_fkey" FOREIGN KEY ("targetWorkerId") REFERENCES "Worker" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Rating_targetHotelId_fkey" FOREIGN KEY ("targetHotelId") REFERENCES "Hotel" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Rating" ("comment", "createdAt", "deputationId", "id", "raterLabel", "score", "targetHotelId", "targetWorkerId") SELECT "comment", "createdAt", "deputationId", "id", "raterLabel", "score", "targetHotelId", "targetWorkerId" FROM "Rating";
DROP TABLE "Rating";
ALTER TABLE "new_Rating" RENAME TO "Rating";
CREATE TABLE "new_Worker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "homeHotelId" TEXT NOT NULL,
    "primaryRoleId" TEXT NOT NULL,
    "skillsJson" TEXT NOT NULL DEFAULT '[]',
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "expectedWagePaise" INTEGER NOT NULL DEFAULT 0,
    "availabilityStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "reputationScore" REAL NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "dimensionAggJson" TEXT NOT NULL DEFAULT '{}',
    "rehireRate" REAL NOT NULL DEFAULT 0,
    "deputationsCount" INTEGER NOT NULL DEFAULT 0,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "relocationPrefsJson" TEXT NOT NULL DEFAULT '{}',
    "emergencyContact" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Worker_homeHotelId_fkey" FOREIGN KEY ("homeHotelId") REFERENCES "Hotel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Worker_primaryRoleId_fkey" FOREIGN KEY ("primaryRoleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Worker" ("availabilityStatus", "consentGiven", "createdAt", "emergencyContact", "expectedWagePaise", "experienceYears", "homeHotelId", "id", "kycStatus", "name", "phone", "primaryRoleId", "ratingCount", "relocationPrefsJson", "reputationScore", "skillsJson") SELECT "availabilityStatus", "consentGiven", "createdAt", "emergencyContact", "expectedWagePaise", "experienceYears", "homeHotelId", "id", "kycStatus", "name", "phone", "primaryRoleId", "ratingCount", "relocationPrefsJson", "reputationScore", "skillsJson" FROM "Worker";
DROP TABLE "Worker";
ALTER TABLE "new_Worker" RENAME TO "Worker";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Favourite_hotelId_workerId_key" ON "Favourite"("hotelId", "workerId");
