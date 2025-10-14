/*
  Warnings:

  - You are about to drop the column `type` on the `Chapter` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Slide` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Chapter" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "Slide" DROP COLUMN "type";

-- DropEnum
DROP TYPE "ChapterType";

-- DropEnum
DROP TYPE "SlideType";
