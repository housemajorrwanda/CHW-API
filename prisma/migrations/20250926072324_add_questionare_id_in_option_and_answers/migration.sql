/*
  Warnings:

  - You are about to drop the column `answerIds` on the `Questionnaire` table. All the data in the column will be lost.
  - You are about to drop the column `optionIds` on the `Questionnaire` table. All the data in the column will be lost.
  - Added the required column `questionnaireId` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionnaireId` to the `Option` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "questionnaireId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Option" ADD COLUMN     "questionnaireId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Questionnaire" DROP COLUMN "answerIds",
DROP COLUMN "optionIds";

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
