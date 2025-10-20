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

  // Recompute course progress: calculate based on completed slides across all chapters
  public static async recomputeCourseProgressForStudent(
    studentId: string,
    courseId: string,
  ) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new AppError("Course not found", 404);

    // Get all slides in this course
    const totalSlides = await prisma.slide.count({
      where: {
        chapter: {
          section: { courseId },
        },
      },
    });

    // Count completed slides for this student in this course
    const completedSlides = await prisma.slideProgress.count({
      where: {
        studentId,
        isCompleted: true,
        slide: {
          chapter: {
            section: { courseId },
          },
        },
      },
    });

    // Calculate progress based on slides completed
    const progress =
      totalSlides === 0 ? 0 : (completedSlides / totalSlides) * 100;
    const rounded = Math.round(progress);

    // Also check if all chapters are completed for course completion status
    const totalChapters = await prisma.chapter.count({
      where: { section: { courseId } },
    });

    const completedChapters = await prisma.chapterProgress.count({
      where: {
        studentId,
        isCompleted: true,
        chapter: { section: { courseId } },
      },
    });

    const isCompleted =
      totalChapters > 0 && completedChapters === totalChapters;

    const existing = await prisma.courseProgress.findFirst({
      where: { studentId, courseId },
    });

    if (existing) {
      await prisma.courseProgress.update({
        where: { id: existing.id },
        data: { progress: rounded, isCompleted },
      });
    } else {
      await prisma.courseProgress.create({
        data: {
          studentId,
          courseId,
          progress: rounded,
          isCompleted,
        },
      });
    }

    return { message: "Course progress recomputed", statusCode: 200 } as {
      message: string;
      statusCode: number;
    };
  }

  // Helper: Recompute all progress for a student (chapters and courses)
  public static async recomputeAllProgressForStudent(studentId: string) {
    // Get all chapter progress records for this student
    const chapterProgresses = await prisma.chapterProgress.findMany({
      where: { studentId },
      include: {
        chapter: {
          include: {
            section: true,
          },
        },
      },
    });

    // Recompute each chapter progress
    for (const chapterProgress of chapterProgresses) {
      await this.recomputeChapterProgressForStudent(
        studentId,
        chapterProgress.chapterId,
      );
    }

    // Get unique course IDs and recompute course progress
    const courseIds = [
      ...new Set(chapterProgresses.map((cp) => cp.chapter.section.courseId)),
    ];

    for (const courseId of courseIds) {
      await this.recomputeCourseProgressForStudent(studentId, courseId);
    }

    return { message: "All progress recomputed", statusCode: 200 };
  }

  // API: Get progress by student id (return course, chapter, slide progress lists)
  public static async getProgressByStudent(studentId: string) {
    // verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new AppError("Student not found", 404);

    // First, recompute all progress to ensure accuracy
    await this.recomputeAllProgressForStudent(studentId);

    const courseProgress = await prisma.courseProgress.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            sections: {
              include: {
                chapters: true,
              },
            },
          },
        },
      },
    });

    const chapterProgress = await prisma.chapterProgress.findMany({
      where: { studentId },
      include: {
        chapter: {
          include: {
            section: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    const slideProgress = await prisma.slideProgress.findMany({
      where: { studentId },
      include: {
        slide: {
          include: {
            chapter: {
              include: {
                section: {
                  include: {
                    course: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Get last viewed location
    const lastViewedSlide = slideProgress.find((sp) => sp.isCompleted);
    let lastViewedLocation = null;

    if (lastViewedSlide) {
      const slide = lastViewedSlide.slide;
      const chapter = slide.chapter;
      const section = chapter.section;
      const course = section.course;

      lastViewedLocation = {
        courseId: course.id,
        courseTitle: course.title,
        sectionId: section.id,
        sectionTitle: section.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterNumber: chapter.chapterNumber,
        slideId: slide.id,
        lastViewedAt: lastViewedSlide.updatedAt,
      };
    }

    return {
      message: "Progress fetched",
      statusCode: 200,
      data: {
        courseProgress,
        chapterProgress,
        slideProgress,
        lastViewedLocation,
      },
    };
  }

  // API: Get comprehensive statistics for a student
  public static async getStudentStatistics(studentId: string): Promise<{
    message: string;
    statusCode: number;
    data: {
      summary: {
        totalCourses: number;
        enrolledCourses: number;
        unenrolledCourses: number;
        completedCourses: number;
        startedCourses: number;
      };
      courses: Array<{
        courseId: string;
        title: string;
        coverIcon: string;
        description?: string | null;
        totalChapters: number;
        totalTests: number;
        completedTests: number;
        courseDuration: number;
        isEnrolled: boolean;
        isStarted: boolean;
        isCompleted: boolean;
        enrollmentDate: Date | null;
        progress: number;
        createdAt: Date;
      }>;
      lastViewedLocation?: {
        courseId: string;
        courseTitle: string;
        sectionId: string;
        sectionTitle: string;
        chapterId: string;
        chapterTitle: string;
        chapterNumber: number;
        slideId: string;
        lastViewedAt: Date;
      } | null;
    };
  }> {
    // verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new AppError("Student not found", 404);

    // Get all courses with their progress and test data
    const allCourses = await prisma.course.findMany({
      where: { isPublished: true },
      include: {
        sections: {
          include: {
            chapters: {
              include: {
                slides: true,
                midTest: {
                  include: {
                    questionnaires: true,
                  },
                },
                finalTest: {
                  include: {
                    questionnaires: true,
                  },
                },
              },
            },
            preTests: {
              include: {
                questionnaires: true,
              },
            },
          },
        },
        progresses: {
          where: { studentId },
        },
      },
    });

    // Get student's test attempts
    const testAttempts = await prisma.attempTest.findMany({
      where: { studentId },
      include: {
        preTest: true,
        midTest: true,
        finalTest: true,
      },
    });

    // Get last viewed location
    const lastViewedSlide = await prisma.slideProgress.findFirst({
      where: { studentId, isCompleted: true },
      include: {
        slide: {
          include: {
            chapter: {
              include: {
                section: {
                  include: {
                    course: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    let lastViewedLocation = null;
    if (lastViewedSlide) {
      const slide = lastViewedSlide.slide;
      const chapter = slide.chapter;
      const section = chapter.section;
      const course = section.course;

      lastViewedLocation = {
        courseId: course.id,
        courseTitle: course.title,
        sectionId: section.id,
        sectionTitle: section.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterNumber: chapter.chapterNumber,
        slideId: slide.id,
        lastViewedAt: lastViewedSlide.updatedAt,
      };
    }

    // Process course statistics
    const courseStatistics = allCourses.map((course) => {
      const courseProgress = course.progresses[0]; // Student's progress for this course
      const totalChapters = course.sections.reduce(
        (sum, section) => sum + section.chapters.length,
        0,
      );

      // Calculate course duration (sum of all chapter durations)
      const courseDuration = course.sections.reduce(
        (totalDuration, section) => {
          return (
            totalDuration +
            section.chapters.reduce(
              (sectionDuration, chapter) =>
                sectionDuration + (chapter.lessonDuration || 0),
              0,
            )
          );
        },
        0,
      );

      // Count total tests in the course
      let totalTests = 0;
      course.sections.forEach((section) => {
        totalTests += section.preTests.length; // Pre-tests
        section.chapters.forEach((chapter) => {
          if (chapter.midTest) totalTests += 1; // Mid-test
          if (chapter.finalTest) totalTests += 1; // Final-test
        });
      });

      // Count completed tests for this course
      let completedTests = 0;
      course.sections.forEach((section) => {
        // Count completed pre-tests
        section.preTests.forEach((preTest) => {
          const attempt = testAttempts.find(
            (att) => att.preTestId === preTest.id && att.isCompleted,
          );
          if (attempt) completedTests += 1;
        });

        // Count completed mid and final tests
        section.chapters.forEach((chapter) => {
          if (chapter.midTest) {
            const attempt = testAttempts.find(
              (att) => att.midTestId === chapter.midTest!.id && att.isCompleted,
            );
            if (attempt) completedTests += 1;
          }
          if (chapter.finalTest) {
            const attempt = testAttempts.find(
              (att) =>
                att.finalTestId === chapter.finalTest!.id && att.isCompleted,
            );
            if (attempt) completedTests += 1;
          }
        });
      });

      // Determine enrollment status
      const isEnrolled = !!courseProgress;
      const enrollmentDate = courseProgress?.createdAt || null;
      const isStarted = isEnrolled && (courseProgress?.progress || 0) > 0;
      const isCompleted = courseProgress?.isCompleted || false;

      return {
        courseId: course.id,
        title: course.title,
        coverIcon: course.coverIcon,
        description: course.description,
        totalChapters,
        totalTests,
        completedTests,
        courseDuration,
        isEnrolled,
        isStarted,
        isCompleted,
        enrollmentDate,
        progress: courseProgress?.progress || 0,
        createdAt: course.createdAt,
      };
    });

    // Calculate summary statistics
    const totalCourses = allCourses.length;
    const enrolledCourses = courseStatistics.filter((c) => c.isEnrolled).length;
    const unenrolledCourses = totalCourses - enrolledCourses;
    const completedCourses = courseStatistics.filter(
      (c) => c.isCompleted,
    ).length;
    const startedCourses = courseStatistics.filter((c) => c.isStarted).length;

    return {
      message: "Student statistics fetched successfully",
      statusCode: 200,
      data: {
        summary: {
          totalCourses,
          enrolledCourses,
          unenrolledCourses,
          completedCourses,
          startedCourses,
        },
        courses: courseStatistics,
        lastViewedLocation,
      },
    };
  }

  // Helper: Enroll student in a course (create initial course progress)
  public static async enrollStudentInCourse(
    studentId: string,
    courseId: string,
  ) {
    // verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new AppError("Student not found", 404);

    // verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new AppError("Course not found", 404);

    // check if already enrolled
    const existingProgress = await prisma.courseProgress.findFirst({
      where: { studentId, courseId },
    });

    if (existingProgress) {
      return {
        message: "Student already enrolled in this course",
        statusCode: 200,
        data: existingProgress,
      };
    }

    // create course progress record (enrollment)
    const courseProgress = await prisma.courseProgress.create({
      data: {
        studentId,
        courseId,
        progress: 0,
        isCompleted: false,
      },
    });

    return {
      message: "Student enrolled in course successfully",
      statusCode: 201,
      data: courseProgress,
    };
  }
}
