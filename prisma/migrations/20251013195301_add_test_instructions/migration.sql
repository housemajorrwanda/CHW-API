-- AlterTable
ALTER TABLE "FinalTest" ADD COLUMN     "description" TEXT,
ADD COLUMN     "marksToPass" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "questionToBeAnswered" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "MidTest" ADD COLUMN     "description" TEXT,
ADD COLUMN     "marksToPass" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "questionToBeAnswered" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "PreTest" ADD COLUMN     "description" TEXT,
ADD COLUMN     "marksToPass" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "questionToBeAnswered" INTEGER NOT NULL DEFAULT 1;
