import { prisma } from "../utils/client";
import AppError from "../utils/error";

export class ProgressService {
  // Slide progress: mark slideProgress.isCompleted true when student views slide
  public static async markSlideCompleted(studentId: string, slideId: string) {
    // ensure slide exists
    const slide = await prisma.slide.findUnique({ where: { id: slideId } });
    if (!slide) throw new AppError("Slide not found", 404);

    // ensure student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new AppError("Student not found", 404);

    // upsert slideProgress
    const existing = await prisma.slideProgress.findFirst({
      where: { studentId, slideId },
    });

    if (existing) {
      if (existing.isCompleted) {
        // make sure there is a StudentOnSlide record even if slideProgress already marked
        const existingStudentOnSlideEarly =
          await prisma.studentOnSlide.findFirst({
            where: { studentId, slideId },
          });
        if (!existingStudentOnSlideEarly) {
          await prisma.studentOnSlide.create({
            data: { studentId, slideId, progress: 100 },
          });
        }
        return { message: "Slide already marked completed", statusCode: 200 };
      }
      await prisma.slideProgress.update({
        where: { id: existing.id },
        data: { isCompleted: true },
      });
    } else {
      await prisma.slideProgress.create({
        data: { studentId, slideId, isCompleted: true },
      });
    }

    // ensure there is a StudentOnSlide record and set progress to 100
    const existingStudentOnSlide = await prisma.studentOnSlide.findFirst({
      where: { studentId, slideId },
    });
    if (existingStudentOnSlide) {
      if (
        !existingStudentOnSlide.progress ||
        existingStudentOnSlide.progress < 100
      ) {
        await prisma.studentOnSlide.update({
          where: { id: existingStudentOnSlide.id },
          data: { progress: 100 },
        });
      }
    } else {
      await prisma.studentOnSlide.create({
        data: { studentId, slideId, progress: 100 },
      });
    }

    // After marking slide completed, update chapter progress
    await ProgressService.recomputeChapterProgressForStudent(
      studentId,
      slide.chapterId,
    );

    // After updating chapter, update course progress (needs courseId)
    const chapter = await prisma.chapter.findUnique({
      where: { id: slide.chapterId },
    });
    if (chapter) {
      const section = await prisma.section.findUnique({
        where: { id: chapter.sectionId },
      });
      if (section) {
        const courseId = section.courseId;
        await ProgressService.recomputeCourseProgressForStudent(
          studentId,
          courseId,
        );
      }
    }

    return { message: "Slide marked completed", statusCode: 200 };
  }

  // Recompute chapter progress: count slides in chapter and count slideProgress with isCompleted true
  public static async recomputeChapterProgressForStudent(
    studentId: string,
    chapterId: string,
  ) {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
    });
    if (!chapter) throw new AppError("Chapter not found", 404);

    const totalSlides = await prisma.slide.count({ where: { chapterId } });

    // Count completed slides for this student in the chapter by joining slide relation
    const completedSlidesCorrect = await prisma.slideProgress.count({
      where: { studentId, isCompleted: true, slide: { chapterId } },
    });

    const progress =
      totalSlides === 0 ? 0 : (completedSlidesCorrect / totalSlides) * 100;
    const rounded = Math.round(progress);

    // upsert chapter progress
    const existing = await prisma.chapterProgress.findFirst({
      where: { studentId, chapterId },
    });
    if (existing) {
      await prisma.chapterProgress.update({
        where: { id: existing.id },
        data: { progress: rounded, isCompleted: rounded === 100 },
      });
    } else {
      await prisma.chapterProgress.create({
        data: {
          studentId,
          chapterId,
          progress: rounded,
          isCompleted: rounded === 100,
        },
      });
    }

    return { message: "Chapter progress recomputed", statusCode: 200 } as {
      message: string;
      statusCode: number;
    };
  }

  // Recompute course progress: count chapters in course and count chapterProgress isCompleted true
  public static async recomputeCourseProgressForStudent(
    studentId: string,
    courseId: string,
  ) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError("Course not found", 404);

    // count total chapters across all sections of this course
    const totalChapters = await prisma.chapter.count({
      where: { section: { courseId } },
    });

    // count completed chapters for this student (join via chapter -> section -> course)
    const completedChapters = await prisma.chapterProgress.count({
      where: {
        studentId,
        isCompleted: true,
        chapter: { section: { courseId } },
      },
    });

    const progress =
      totalChapters === 0 ? 0 : (completedChapters / totalChapters) * 100;
    const rounded = Math.round(progress);

    const existing = await prisma.courseProgress.findFirst({
      where: { studentId, courseId },
    });
    if (existing) {
      await prisma.courseProgress.update({
        where: { id: existing.id },
        data: { progress: rounded, isCompleted: rounded === 100 },
      });
    } else {
      await prisma.courseProgress.create({
        data: {
          studentId,
          courseId,
          progress: rounded,
          isCompleted: rounded === 100,
        },
      });
    }

    return { message: "Course progress recomputed", statusCode: 200 } as {
      message: string;
      statusCode: number;
    };
  }

  // API: Get progress by student id (return course, chapter, slide progress lists)
  public static async getProgressByStudent(studentId: string) {
    // verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new AppError("Student not found", 404);

    const courseProgress = await prisma.courseProgress.findMany({
      where: { studentId },
    });
    const chapterProgress = await prisma.chapterProgress.findMany({
      where: { studentId },
    });
    const slideProgress = await prisma.slideProgress.findMany({
      where: { studentId },
    });

    return {
      message: "Progress fetched",
      statusCode: 200,
      data: { courseProgress, chapterProgress, slideProgress },
    };
  }
}
