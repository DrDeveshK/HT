/*
  Warnings:

  - Added the required column `state` to the `Region` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Region" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "dominantType" TEXT NOT NULL
);
INSERT INTO "new_Region" ("code", "dominantType", "id", "name", "zone") SELECT "code", "dominantType", "id", "name", "zone" FROM "Region";
DROP TABLE "Region";
ALTER TABLE "new_Region" RENAME TO "Region";
CREATE UNIQUE INDEX "Region_code_key" ON "Region"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
