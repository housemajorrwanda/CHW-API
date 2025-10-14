/*
  Warnings:

  - You are about to drop the column `slideId` on the `DocumentOnSlide` table. All the data in the column will be lost.
  - You are about to drop the column `courseId` on the `PreTest` table. All the data in the column will be lost.
  - Added the required column `chapterId` to the `DocumentOnSlide` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sectionId` to the `PreTest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DocumentOnSlide" DROP CONSTRAINT "DocumentOnSlide_slideId_fkey";

-- DropForeignKey
ALTER TABLE "PreTest" DROP CONSTRAINT "PreTest_courseId_fkey";

-- AlterTable
ALTER TABLE "DocumentOnSlide" DROP COLUMN "slideId",
ADD COLUMN     "chapterId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PreTest" DROP COLUMN "courseId",
ADD COLUMN     "sectionId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "PreTest" ADD CONSTRAINT "PreTest_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentOnSlide" ADD CONSTRAINT "DocumentOnSlide_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
