-- CreateTable
CREATE TABLE "WorkerSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT "WorkerSkill_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HotelAmenity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,
    CONSTRAINT "HotelAmenity_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HotelAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Hotel_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "HotelGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Hotel_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Hotel" ("city", "createdAt", "groupId", "id", "lat", "lng", "name", "regionId", "rooms", "tier") SELECT "city", "createdAt", "groupId", "id", "lat", "lng", "name", "regionId", "rooms", "tier" FROM "Hotel";
DROP TABLE "Hotel";
ALTER TABLE "new_Hotel" RENAME TO "Hotel";
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
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "relocationPrefsJson" TEXT NOT NULL DEFAULT '{}',
    "emergencyContact" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Worker_homeHotelId_fkey" FOREIGN KEY ("homeHotelId") REFERENCES "Hotel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Worker_primaryRoleId_fkey" FOREIGN KEY ("primaryRoleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Worker" ("availabilityStatus", "consentGiven", "createdAt", "expectedWagePaise", "experienceYears", "homeHotelId", "id", "kycStatus", "name", "phone", "primaryRoleId", "ratingCount", "reputationScore", "skillsJson") SELECT "availabilityStatus", "consentGiven", "createdAt", "expectedWagePaise", "experienceYears", "homeHotelId", "id", "kycStatus", "name", "phone", "primaryRoleId", "ratingCount", "reputationScore", "skillsJson" FROM "Worker";
DROP TABLE "Worker";
ALTER TABLE "new_Worker" RENAME TO "Worker";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "WorkerSkill_workerId_skillId_key" ON "WorkerSkill"("workerId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "HotelAmenity_hotelId_amenityId_key" ON "HotelAmenity"("hotelId", "amenityId");
