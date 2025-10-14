-- CreateTable
CREATE TABLE "SlideProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "slideId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlideProgress_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SlideProgress" ADD CONSTRAINT "SlideProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlideProgress" ADD CONSTRAINT "SlideProgress_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "Slide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
