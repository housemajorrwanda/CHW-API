-- AlterTable
ALTER TABLE "ChapterProgress" ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CourseProgress" ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false;
