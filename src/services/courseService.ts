/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../utils/client";
import AppError from "../utils/error";
import {
  CreateCourseDto,
  TCourseResponse,
  CreateSuperCourseDto,
  UpdateSuperCourseDto,
} from "../utils/interfaces/common";
import { Prisma } from "@prisma/client";

export class CourseService {
  public static async createCourse(data: CreateCourseDto, creatorId: string) {
    // ensure creator (staff) exists
    const staff = await prisma.staff.findUnique({
      where: { id: creatorId },
    });
    if (!staff) {
      throw new AppError("Creator (staff) not found", 404);
    }

    const course = await prisma.course.create({
      data: {
        creatorId: creatorId,
        title: data.title,
        coverIcon: data.coverIcon,
        description: data.description ?? null,
      },
    });

    return {
      message: "Course created successfully",
      statusCode: 201,
      data: course,
    } as { message: string; statusCode: number; data: TCourseResponse };
  }

  public static async getCourseById(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        staff: {
          include: {
            user: true,
          },
        },

        sections: {
          include: {
            chapters: {
              include: {
                slides: true,
                midTest: {
                  include: {
                    questionnaires: {
                      include: {
                        options: true,
                      },
                    },
                  },
                },
                finalTest: {
                  include: {
                    questionnaires: {
                      include: {
                        options: true,
                      },
                    },
                  },
                },
              },
            },

            preTests: {
              include: {
                questionnaires: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
        intro: true,
        progresses: true,
      },
    });
    if (!course) throw new AppError("Course not found", 404);

    return {
      message: "Course fetched successfully",
      statusCode: 200,
      data: course,
    };
  }

  public static async updateCourse(id: string, data: CreateCourseDto) {
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) throw new AppError("Course not found", 404);

    // If creatorId changed, ensure staff exists
    if (data.creatorId) {
      const staff = await prisma.staff.findUnique({
        where: { id: data.creatorId },
      });
      if (!staff) throw new AppError("Creator (staff) not found", 404);
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        creatorId: data.creatorId,
        title: data.title,
        coverIcon: data.coverIcon,
        description: data.description ?? null,
        isPublished: data.isPublished ?? true,
      },
    });

    return {
      message: "Course updated successfully",
      statusCode: 200,
      data: updated,
    } as { message: string; statusCode: number; data: TCourseResponse };
  }

  public static async deleteCourse(id: string) {
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) throw new AppError("Course not found", 404);

    await prisma.course.delete({ where: { id } });

    return { message: "Course deleted successfully", statusCode: 200 };
  }

  public static async getCourses(
    searchq?: string,
    limit?: number,
    currentPage?: number,
    isPublished?: boolean,
  ) {
    const where: Prisma.CourseWhereInput = {};
    if (searchq) {
      where.OR = [
        { title: { contains: searchq, mode: "insensitive" } },
        { description: { contains: searchq, mode: "insensitive" } },
      ];
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    const take = limit ?? 15;
    const skip = currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

    const courses = await prisma.course.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        staff: {
          include: {
            user: true,
          },
        },
        sections: {
          include: {
            chapters: {
              include: {
                slides: true,
                midTest: {
                  include: {
                    questionnaires: {
                      include: {
                        options: true,
                      },
                    },
                  },
                },
                finalTest: {
                  include: {
                    questionnaires: {
                      include: {
                        options: true,
                      },
                    },
                  },
                },
              },
            },

            preTests: {
              include: {
                questionnaires: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
        intro: true,
        progresses: true,
      },
    });

    const totalItems = await prisma.course.count({ where });

    return {
      message: "Courses fetched successfully",
      statusCode: 200,
      data: courses,
      totalItems,
      currentPage: currentPage || 1,
      itemsPerPage: take,
    };
  }

  public static async getAllCourses(searchq?: string) {
    const where: Prisma.CourseWhereInput = {
      isPublished: true,
    };
    if (searchq) {
      where.OR = [
        { title: { contains: searchq, mode: "insensitive" } },
        { description: { contains: searchq, mode: "insensitive" } },
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        staff: {
          include: {
            user: true,
          },
        },

        sections: {
          include: {
            chapters: {
              include: {
                slides: true,
                midTest: {
                  include: {
                    questionnaires: {
                      include: {
                        options: true,
                      },
                    },
                  },
                },
                finalTest: {
                  include: {
                    questionnaires: {
                      include: {
                        options: true,
                      },
                    },
                  },
                },
              },
            },

            preTests: {
              include: {
                questionnaires: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
        intro: true,
        progresses: true,
      },
    });

    return {
      message: "Courses fetched successfully",
      statusCode: 200,
      data: courses,
    };
  }

  // Super Course Creation Method
  public static async createSuperCourse(
    data: CreateSuperCourseDto,
    creatorId: string,
  ) {
    // ensure creator (staff) exists
    const staff = await prisma.staff.findUnique({
      where: { id: creatorId },
    });
    if (!staff) {
      throw new AppError("Creator (staff) not found", 404);
    }
    console.log("recieved data:", data);
    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Course
      const course = await tx.course.create({
        data: {
          creatorId: creatorId,
          title: data.title,
          coverIcon: data.coverIcon,
          description: data.description ?? null,
          isPublished: data.isPublished ?? true,
        },
      });

      // 2. Create Course Intro
      const courseIntro = await tx.courseIntro.create({
        data: {
          courseId: course.id,
          title: data.courseIntro.title,
          summary: data.courseIntro.summary,
          bannerImage: data.courseIntro.bannerImage ?? null,
          thumbnail: data.courseIntro.thumbnail,
        },
      });

      // 3. Create Sections with nested content
      const sections = [];
      for (const sectionData of data.sections) {
        const section = await tx.section.create({
          data: {
            courseId: course.id,
            title: sectionData.title,
            description: sectionData.description ?? null,
          },
        });

        // Create PreTest if provided
        let preTest = null;
        if (sectionData.preTestSlide?.activity) {
          preTest = await tx.preTest.create({
            data: {
              sectionId: section.id,
              questionToBeAnswered:
                sectionData.preTestSlide.activity.instruction
                  .questionToBeAnswered,
              marksToPass:
                sectionData.preTestSlide.activity.instruction.marksToPass,
              description:
                sectionData.preTestSlide.activity.instruction.description,
              isPublished: sectionData.preTestSlide.isPublished ?? true,
            },
          });

          // Create questionnaires for pretest
          for (const questionData of sectionData.preTestSlide.activity
            .questions) {
            const questionnaire = await tx.questionnaire.create({
              data: {
                question: questionData.question,
                questionImage: questionData.questionImage ?? null,
                allowMultiple: questionData.allowMultiple,
                preTestId: preTest.id,
              },
            });

            // Create options
            for (const optionData of questionData.options) {
              await tx.option.create({
                data: {
                  label: optionData.label,
                  image: optionData.image ?? null,
                  questionnaireId: questionnaire.id,
                },
              });
            }

            // Create correct answers
            if (questionData.correctAnswer) {
              await tx.answer.create({
                data: {
                  label: questionData.correctAnswer.label,
                  image: questionData.correctAnswer.image ?? null,
                  questionnaireId: questionnaire.id,
                },
              });
            }

            if (
              questionData.correctAnswers &&
              questionData.correctAnswers.length > 0
            ) {
              for (const correctIndex of questionData.correctAnswers) {
                const correctOption = questionData.options[correctIndex];
                if (correctOption) {
                  await tx.answer.create({
                    data: {
                      label: correctOption.label,
                      image: correctOption.image ?? null,
                      questionnaireId: questionnaire.id,
                    },
                  });
                }
              }
            }
          }
        }

        // Create Chapters
        const chapters: Array<{
          id: string;
          sectionId: string;
          title: string;
          description: string | null;
          totalSlide: number;
          chapterNumber: number;
          activityAt: number | null;
          lessonDuration: number;
          isPublished: boolean;
          createdAt: Date;
          updatedAt: Date;
        }> = [];
        for (const chapterData of sectionData.chapters) {
          const chapterNumber =
            chapterData.chapterNumber ?? chapters.length + 1;
          const chapter = await tx.chapter.create({
            data: {
              sectionId: section.id,
              title: chapterData.title,
              description: chapterData.description ?? null,
              chapterNumber,
              activityAt: chapterData.activityAt ?? null,
              lessonDuration: chapterData.lessonDuration ?? 5,
              isPublished: chapterData.isPublished ?? true,
            },
          });

          // Create MidTest if provided
          let midTest = null;
          if (chapterData.midTestSlide?.activity) {
            midTest = await tx.midTest.create({
              data: {
                chapterId: chapter.id,
                questionToBeAnswered:
                  chapterData.midTestSlide.activity.instruction
                    .questionToBeAnswered,
                marksToPass:
                  chapterData.midTestSlide.activity.instruction.marksToPass,
                description:
                  chapterData.midTestSlide.activity.instruction.description,
              },
            });

            // Create questionnaires for midtest
            for (const questionData of chapterData.midTestSlide.activity
              .questions) {
              const questionnaire = await tx.questionnaire.create({
                data: {
                  question: questionData.question,
                  questionImage: questionData.questionImage ?? null,
                  allowMultiple: questionData.allowMultiple,
                  midTestId: midTest.id,
                },
              });

              // Create options
              for (const optionData of questionData.options) {
                await tx.option.create({
                  data: {
                    label: optionData.label,
                    image: optionData.image ?? null,
                    questionnaireId: questionnaire.id,
                  },
                });
              }

              // Create correct answers
              if (questionData.correctAnswer) {
                await tx.answer.create({
                  data: {
                    label: questionData.correctAnswer.label,
                    image: questionData.correctAnswer.image ?? null,
                    questionnaireId: questionnaire.id,
                  },
                });
              }

              if (
                questionData.correctAnswers &&
                questionData.correctAnswers.length > 0
              ) {
                for (const correctIndex of questionData.correctAnswers) {
                  const correctOption = questionData.options[correctIndex];
                  if (correctOption) {
                    await tx.answer.create({
                      data: {
                        label: correctOption.label,
                        image: correctOption.image ?? null,
                        questionnaireId: questionnaire.id,
                      },
                    });
                  }
                }
              }
            }
          }

          // Create FinalTest if provided
          let finalTest = null;
          if (chapterData.finalTestSlide?.activity) {
            finalTest = await tx.finalTest.create({
              data: {
                chapterId: chapter.id,
                questionToBeAnswered:
                  chapterData.finalTestSlide.activity.instruction
                    .questionToBeAnswered,
                marksToPass:
                  chapterData.finalTestSlide.activity.instruction.marksToPass,
                description:
                  chapterData.finalTestSlide.activity.instruction.description,
                isPublished: chapterData.finalTestSlide.isPublished ?? true,
              },
            });

            // Create questionnaires for final test
            for (const questionData of chapterData.finalTestSlide.activity
              .questions) {
              const questionnaire = await tx.questionnaire.create({
                data: {
                  question: questionData.question,
                  questionImage: questionData.questionImage ?? null,
                  allowMultiple: questionData.allowMultiple,
                  finalTestId: finalTest.id,
                },
              });

              // Create options
              for (const optionData of questionData.options) {
                await tx.option.create({
                  data: {
                    label: optionData.label,
                    image: optionData.image ?? null,
                    questionnaireId: questionnaire.id,
                  },
                });
              }

              // Create correct answers
              if (questionData.correctAnswer) {
                await tx.answer.create({
                  data: {
                    label: questionData.correctAnswer.label,
                    image: questionData.correctAnswer.image ?? null,
                    questionnaireId: questionnaire.id,
                  },
                });
              }

              if (
                questionData.correctAnswers &&
                questionData.correctAnswers.length > 0
              ) {
                for (const correctIndex of questionData.correctAnswers) {
                  const correctOption = questionData.options[correctIndex];
                  if (correctOption) {
                    await tx.answer.create({
                      data: {
                        label: correctOption.label,
                        image: correctOption.image ?? null,
                        questionnaireId: questionnaire.id,
                      },
                    });
                  }
                }
              }
            }
          }

          // Create Slides
          const slides = [];
          for (const slideData of chapterData.slides) {
            const slide = await tx.slide.create({
              data: {
                chapterId: chapter.id,
                note: slideData.note ?? null,
                description: slideData.description ?? null,
                slideNumber: slideData.slideNumber,
                file: slideData.file ?? null,
                isPublished: slideData.isPublished ?? true,
              },
            });
            slides.push(slide);
          }

          // Update chapter totalSlide
          await tx.chapter.update({
            where: { id: chapter.id },
            data: { totalSlide: slides.length },
          });

          chapters.push(chapter);
        }

        // Update section totalChapter
        await tx.section.update({
          where: { id: section.id },
          data: { totalChapter: chapters.length },
        });

        sections.push(section);
      }

      return {
        course,
        courseIntro,
        sections,
      };
    });

    return {
      message: "Super course created successfully",
      statusCode: 201,
      data: result,
    };
  }

  private static readonly BATCH_SIZE = 5;
  private static readonly TRANSACTION_TIMEOUT = 120000; // 2 minutes
  private static readonly MAX_WAIT = 60000; // 1 minute

  /**
   * Safe super course update that preserves existing data and only updates changes
   */
  public static async updateSuperCourse(
    data: UpdateSuperCourseDto,
    creatorId: string,
  ) {
    // Validate input data size to prevent overly large operations
    this.validateDataSize(data);

    // Ensure creator (staff) exists
    const staff = await prisma.staff.findUnique({
      where: { id: creatorId },
    });
    if (!staff) {
      throw new AppError("Creator (staff) not found", 404);
    }

    // Ensure course exists
    const existingCourse = await prisma.course.findUnique({
      where: { id: data.courseId },
    });
    if (!existingCourse) {
      throw new AppError("Course not found", 404);
    }

    try {
      // Use transaction with increased timeout for safe updates
      const result = await prisma.$transaction(
        async (tx) => {
          // 1. Update Course
          const course = await tx.course.update({
            where: { id: data.courseId },
            data: {
              title: data.title,
              coverIcon: data.coverIcon,
              description: data.description ?? null,
              isPublished: data.isPublished ?? true,
            },
          });

          // 2. Update or Create Course Intro
          const courseIntro = await this.upsertCourseIntro(
            tx,
            course.id,
            data.courseIntro,
          );

          // 3. Safely update course content without deletion
          const sections = await this.safeUpdateCourseContent(
            tx,
            course.id,
            data.sections,
          );

          return {
            course,
            courseIntro,
            sections,
          };
        },
        {
          timeout: this.TRANSACTION_TIMEOUT,
          maxWait: this.MAX_WAIT,
        },
      );

      return {
        message: "Super course updated successfully",
        statusCode: 200,
        data: result,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2028") {
          throw new AppError(
            "Course update took too long. Please try again with smaller content or contact support.",
            408,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Validate data size to prevent overly large operations
   */
  private static validateDataSize(data: UpdateSuperCourseDto): void {
    const totalQuestions = data.sections.reduce((total, section) => {
      let sectionQuestions = 0;

      // Pre-test questions
      if (section.preTestSlide?.activity?.questions) {
        sectionQuestions += section.preTestSlide.activity.questions.length;
      }

      // Chapter questions
      section.chapters.forEach((chapter) => {
        // Mid-test questions (using midTestSlide property)
        if (chapter.midTestSlide?.activity?.questions) {
          sectionQuestions += chapter.midTestSlide.activity.questions.length;
        }

        // Final test questions
        if (chapter.finalTestSlide?.activity?.questions) {
          sectionQuestions += chapter.finalTestSlide.activity.questions.length;
        }
      });

      return total + sectionQuestions;
    }, 0);

    if (totalQuestions > 500) {
      throw new AppError(
        "Course content too large. Maximum 500 questions allowed per course.",
        400,
      );
    }

    if (data.sections.length > 20) {
      throw new AppError(
        "Too many sections. Maximum 20 sections allowed per course.",
        400,
      );
    }
  }

  /**
   * Upsert course intro (update or create)
   */
  private static async upsertCourseIntro(
    tx: any,
    courseId: string,
    courseIntroData: any,
  ) {
    const existingIntro = await tx.courseIntro.findUnique({
      where: { courseId },
    });

    if (existingIntro) {
      return await tx.courseIntro.update({
        where: { id: existingIntro.id },
        data: {
          title: courseIntroData.title,
          summary: courseIntroData.summary,
          bannerImage: courseIntroData.bannerImage ?? null,
          thumbnail: courseIntroData.thumbnail,
        },
      });
    } else {
      return await tx.courseIntro.create({
        data: {
          courseId,
          title: courseIntroData.title,
          summary: courseIntroData.summary,
          bannerImage: courseIntroData.bannerImage ?? null,
          thumbnail: courseIntroData.thumbnail,
        },
      });
    }
  }

  /**
   * Create chapters for a section
   */
  private static async createChaptersForSection(
    tx: any,
    sectionId: string,
    chaptersData: any[],
  ) {
    const createdChapters = [];

    for (const chapterData of chaptersData) {
      const chapterNumber: number =
        chapterData.chapterNumber ?? createdChapters.length + 1;

      const chapter = await tx.chapter.create({
        data: {
          sectionId,
          title: chapterData.title,
          description: chapterData.description ?? null,
          chapterNumber,
          activityAt: chapterData.activityAt ?? null,
          lessonDuration: chapterData.lessonDuration ?? 5,
          isPublished: chapterData.isPublished ?? true,
        },
      });

      // Create mid-test if provided
      if (chapterData.midTestSlide?.activity) {
        await this.createMidTest(
          tx,
          chapter.id,
          chapterData.midTestSlide.activity,
        );
      }

      // Create final test if provided
      if (chapterData.finalTestSlide?.activity) {
        await this.createFinalTest(tx, chapter.id, chapterData.finalTestSlide);
      }

      // Create slides
      const slides = await this.createSlidesForChapter(
        tx,
        chapter.id,
        chapterData.slides,
      );

      // Update chapter totalSlide
      await tx.chapter.update({
        where: { id: chapter.id },
        data: { totalSlide: slides.length },
      });

      createdChapters.push(chapter);
    }

    return createdChapters;
  }

  /**
   * Create slides for a chapter
   */
  private static async createSlidesForChapter(
    tx: any,
    chapterId: string,
    slidesData: any[],
  ) {
    const createdSlides = [];

    for (const slideData of slidesData) {
      // Skip activity slides as they're handled separately
      if (slideData.isActivitySlide) continue;

      const slide = await tx.slide.create({
        data: {
          chapterId,
          note: slideData.note ?? null,
          description: slideData.description ?? null,
          slideNumber: slideData.slideNumber,
          file: slideData.file ?? null,
          isPublished: slideData.isPublished ?? true,
        },
      });
      createdSlides.push(slide);
    }

    return createdSlides;
  }

  /**
   * Create pre-test with questionnaires and answers
   */
  private static async createPreTest(
    tx: any,
    sectionId: string,
    preTestSlide: any,
  ) {
    const preTest = await tx.preTest.create({
      data: {
        sectionId,
        questionToBeAnswered:
          preTestSlide.activity.instruction.questionToBeAnswered,
        marksToPass: preTestSlide.activity.instruction.marksToPass,
        description: preTestSlide.activity.instruction.description,
        isPublished: preTestSlide.isPublished ?? true,
      },
    });

    await this.createQuestionnairesForTest(
      tx,
      preTestSlide.activity.questions,
      { preTestId: preTest.id },
    );

    return preTest;
  }

  /**
   * Create mid-test with questionnaires and answers
   */
  private static async createMidTest(
    tx: any,
    chapterId: string,
    activity: any,
  ) {
    const midTest = await tx.midTest.create({
      data: {
        chapterId,
        questionToBeAnswered: activity.instruction.questionToBeAnswered,
        marksToPass: activity.instruction.marksToPass,
        description: activity.instruction.description,
      },
    });

    await this.createQuestionnairesForTest(tx, activity.questions, {
      midTestId: midTest.id,
    });

    return midTest;
  }

  /**
   * Create final test with questionnaires and answers
   */
  private static async createFinalTest(
    tx: any,
    chapterId: string,
    finalTestSlide: any,
  ) {
    const finalTest = await tx.finalTest.create({
      data: {
        chapterId,
        questionToBeAnswered:
          finalTestSlide.activity.instruction.questionToBeAnswered,
        marksToPass: finalTestSlide.activity.instruction.marksToPass,
        description: finalTestSlide.activity.instruction.description,
        isPublished: finalTestSlide.isPublished ?? true,
      },
    });

    await this.createQuestionnairesForTest(
      tx,
      finalTestSlide.activity.questions,
      { finalTestId: finalTest.id },
    );

    return finalTest;
  }

  /**
   * Create questionnaires, options, and answers for a test
   */
  private static async createQuestionnairesForTest(
    tx: any,
    questions: any[],
    testRelation: {
      preTestId?: string;
      midTestId?: string;
      finalTestId?: string;
    },
  ) {
    for (const questionData of questions) {
      const questionnaire = await tx.questionnaire.create({
        data: {
          question: questionData.question,
          questionImage: questionData.questionImage ?? null,
          allowMultiple: questionData.allowMultiple,
          ...testRelation,
        },
      });

      // Create options
      const options = await Promise.all(
        questionData.options.map((optionData: any) =>
          tx.option.create({
            data: {
              label: optionData.label,
              image: optionData.image ?? null,
              questionnaireId: questionnaire.id,
            },
          }),
        ),
      );

      // Create correct answers
      await this.createCorrectAnswers(
        tx,
        questionnaire.id,
        questionData,
        options,
      );
    }
  }

  /**
   * Create correct answers for a questionnaire
   */
  private static async createCorrectAnswers(
    tx: any,
    questionnaireId: string,
    questionData: any,
    options: any[],
  ) {
    // Single correct answer
    if (questionData.correctAnswer) {
      await tx.answer.create({
        data: {
          label: questionData.correctAnswer.label,
          image: questionData.correctAnswer.image ?? null,
          questionnaireId,
        },
      });
    }

    // Multiple correct answers
    if (questionData.correctAnswers && questionData.correctAnswers.length > 0) {
      const answerPromises = questionData.correctAnswers.map(
        (correctIndex: number) => {
          const correctOption = options[correctIndex];
          if (correctOption) {
            return tx.answer.create({
              data: {
                label: correctOption.label,
                image: correctOption.image ?? null,
                questionnaireId,
              },
            });
          }
          return Promise.resolve();
        },
      );

      await Promise.all(answerPromises);
    }
  }

  /**
   * Safely update course content without deleting existing data
   */
  private static async safeUpdateCourseContent(
    tx: any,
    courseId: string,
    sectionsData: any[],
  ) {
    // Get existing sections
    const existingSections = await tx.section.findMany({
      where: { courseId },
      include: {
        chapters: {
          include: {
            slides: true,
            midTest: {
              include: {
                questionnaires: {
                  include: {
                    options: true,
                    answers: true,
                  },
                },
              },
            },
            finalTest: {
              include: {
                questionnaires: {
                  include: {
                    options: true,
                    answers: true,
                  },
                },
              },
            },
          },
        },
        preTests: {
          include: {
            questionnaires: {
              include: {
                options: true,
                answers: true,
              },
            },
          },
        },
      },
    });

    const updatedSections = [];

    // Process each section from the update data
    for (let i = 0; i < sectionsData.length; i++) {
      const sectionData = sectionsData[i];
      const existingSection = existingSections[i]; // Match by index/order

      let section;
      if (existingSection) {
        // Update existing section
        section = await tx.section.update({
          where: { id: existingSection.id },
          data: {
            title: sectionData.title,
            description: sectionData.description ?? null,
          },
        });

        // Update pre-test
        await this.safeUpdatePreTest(
          tx,
          existingSection,
          sectionData.preTestSlide,
        );
      } else {
        // Create new section
        section = await tx.section.create({
          data: {
            courseId,
            title: sectionData.title,
            description: sectionData.description ?? null,
          },
        });

        // Create pre-test if provided
        if (sectionData.preTestSlide?.activity) {
          await this.createPreTest(tx, section.id, sectionData.preTestSlide);
        }
      }

      // Update chapters
      const chapters = await this.safeUpdateChapters(
        tx,
        section.id,
        existingSection?.chapters || [],
        sectionData.chapters,
      );

      // Update section totalChapter
      await tx.section.update({
        where: { id: section.id },
        data: { totalChapter: chapters.length },
      });

      updatedSections.push({
        ...section,
        chapters,
      });
    }

    return updatedSections;
  }

  /**
   * Safely update pre-test without losing existing data
   */
  private static async safeUpdatePreTest(
    tx: any,
    existingSection: any,
    preTestSlideData: any,
  ) {
    const existingPreTest = existingSection.preTests[0]; // Assuming one pre-test per section

    if (preTestSlideData?.activity) {
      if (existingPreTest) {
        // Update existing pre-test
        await tx.preTest.update({
          where: { id: existingPreTest.id },
          data: {
            questionToBeAnswered:
              preTestSlideData.activity.instruction.questionToBeAnswered,
            marksToPass: preTestSlideData.activity.instruction.marksToPass,
            description: preTestSlideData.activity.instruction.description,
            isPublished: preTestSlideData.isPublished ?? true,
          },
        });

        // Update questionnaires
        await this.safeUpdateQuestionnaires(
          tx,
          existingPreTest.questionnaires,
          preTestSlideData.activity.questions,
          { preTestId: existingPreTest.id },
        );
      } else {
        // Create new pre-test
        await this.createPreTest(tx, existingSection.id, preTestSlideData);
      }
    }
  }

  /**
   * Safely update chapters without losing existing data
   */
  private static async safeUpdateChapters(
    tx: any,
    sectionId: string,
    existingChapters: any[],
    chaptersData: any[],
  ) {
    const updatedChapters = [];

    for (let i = 0; i < chaptersData.length; i++) {
      const chapterData = chaptersData[i];
      const existingChapter = existingChapters[i]; // Match by index/order

      let chapter;
      if (existingChapter) {
        // Update existing chapter
        chapter = await tx.chapter.update({
          where: { id: existingChapter.id },
          data: {
            title: chapterData.title,
            description: chapterData.description ?? null,
            chapterNumber: chapterData.chapterNumber ?? i + 1,
            activityAt: chapterData.activityAt ?? null,
            lessonDuration: chapterData.lessonDuration ?? 5,
            isPublished: chapterData.isPublished ?? true,
          },
        });

        // Update tests
        await this.safeUpdateMidTest(
          tx,
          existingChapter,
          chapterData.midTestSlide,
        );
        await this.safeUpdateFinalTest(
          tx,
          existingChapter,
          chapterData.finalTestSlide,
        );

        // Update slides
        await this.safeUpdateSlides(
          tx,
          existingChapter.slides,
          chapterData.slides,
          chapter.id,
        );
      } else {
        // Create new chapter
        chapter = await tx.chapter.create({
          data: {
            sectionId,
            title: chapterData.title,
            description: chapterData.description ?? null,
            chapterNumber: chapterData.chapterNumber ?? i + 1,
            activityAt: chapterData.activityAt ?? null,
            lessonDuration: chapterData.lessonDuration ?? 5,
            isPublished: chapterData.isPublished ?? true,
          },
        });

        // Create tests
        if (chapterData.midTestSlide?.activity) {
          await this.createMidTest(
            tx,
            chapter.id,
            chapterData.midTestSlide.activity,
          );
        }
        if (chapterData.finalTestSlide?.activity) {
          await this.createFinalTest(
            tx,
            chapter.id,
            chapterData.finalTestSlide,
          );
        }

        // Create slides
        const slides = await this.createSlidesForChapter(
          tx,
          chapter.id,
          chapterData.slides,
        );

        // Update chapter totalSlide
        await tx.chapter.update({
          where: { id: chapter.id },
          data: { totalSlide: slides.length },
        });
      }

      updatedChapters.push(chapter);
    }

    return updatedChapters;
  }

  /**
   * Safely update mid-test without losing existing data
   */
  private static async safeUpdateMidTest(
    tx: any,
    existingChapter: any,
    midTestSlideData: any,
  ) {
    const existingMidTest = existingChapter.midTest;

    if (midTestSlideData?.activity) {
      if (existingMidTest) {
        // Update existing mid-test
        await tx.midTest.update({
          where: { id: existingMidTest.id },
          data: {
            questionToBeAnswered:
              midTestSlideData.activity.instruction.questionToBeAnswered,
            marksToPass: midTestSlideData.activity.instruction.marksToPass,
            description: midTestSlideData.activity.instruction.description,
          },
        });

        // Update questionnaires
        await this.safeUpdateQuestionnaires(
          tx,
          existingMidTest.questionnaires,
          midTestSlideData.activity.questions,
          { midTestId: existingMidTest.id },
        );
      } else {
        // Create new mid-test
        await this.createMidTest(
          tx,
          existingChapter.id,
          midTestSlideData.activity,
        );
      }
    }
  }

  /**
   * Safely update final test without losing existing data
   */
  private static async safeUpdateFinalTest(
    tx: any,
    existingChapter: any,
    finalTestSlideData: any,
  ) {
    const existingFinalTest = existingChapter.finalTest;

    if (finalTestSlideData?.activity) {
      if (existingFinalTest) {
        // Update existing final test
        await tx.finalTest.update({
          where: { id: existingFinalTest.id },
          data: {
            questionToBeAnswered:
              finalTestSlideData.activity.instruction.questionToBeAnswered,
            marksToPass: finalTestSlideData.activity.instruction.marksToPass,
            description: finalTestSlideData.activity.instruction.description,
            isPublished: finalTestSlideData.isPublished ?? true,
          },
        });

        // Update questionnaires
        await this.safeUpdateQuestionnaires(
          tx,
          existingFinalTest.questionnaires,
          finalTestSlideData.activity.questions,
          { finalTestId: existingFinalTest.id },
        );
      } else {
        // Create new final test
        await this.createFinalTest(tx, existingChapter.id, finalTestSlideData);
      }
    }
  }

  /**
   * Safely update slides without losing existing data
   */
  private static async safeUpdateSlides(
    tx: any,
    existingSlides: any[],
    slidesData: any[],
    chapterId: string,
  ) {
    const updatedSlides = [];

    // Filter out activity slides as they're handled separately
    const regularSlidesData = slidesData.filter(
      (slide) => !slide.isActivitySlide,
    );

    for (let i = 0; i < regularSlidesData.length; i++) {
      const slideData = regularSlidesData[i];
      const existingSlide = existingSlides[i]; // Match by index/order

      if (existingSlide) {
        // Update existing slide
        const slide = await tx.slide.update({
          where: { id: existingSlide.id },
          data: {
            note: slideData.note ?? null,
            description: slideData.description ?? null,
            slideNumber: slideData.slideNumber,
            file: slideData.file ?? null,
            isPublished: slideData.isPublished ?? true,
          },
        });
        updatedSlides.push(slide);
      } else {
        // Create new slide
        const slide = await tx.slide.create({
          data: {
            chapterId,
            note: slideData.note ?? null,
            description: slideData.description ?? null,
            slideNumber: slideData.slideNumber,
            file: slideData.file ?? null,
            isPublished: slideData.isPublished ?? true,
          },
        });
        updatedSlides.push(slide);
      }
    }

    // Update chapter totalSlide count
    await tx.chapter.update({
      where: { id: chapterId },
      data: { totalSlide: updatedSlides.length },
    });

    return updatedSlides;
  }

  /**
   * Safely update questionnaires without losing existing data
   */
  private static async safeUpdateQuestionnaires(
    tx: any,
    existingQuestionnaires: any[],
    questionsData: any[],
    testRelation: {
      preTestId?: string;
      midTestId?: string;
      finalTestId?: string;
    },
  ) {
    for (let i = 0; i < questionsData.length; i++) {
      const questionData = questionsData[i];
      const existingQuestionnaire = existingQuestionnaires[i]; // Match by index/order

      if (existingQuestionnaire) {
        // Update existing questionnaire
        await tx.questionnaire.update({
          where: { id: existingQuestionnaire.id },
          data: {
            question: questionData.question,
            questionImage: questionData.questionImage ?? null,
            allowMultiple: questionData.allowMultiple,
          },
        });

        // Update options and answers
        await this.safeUpdateOptions(
          tx,
          existingQuestionnaire.options,
          questionData.options,
          existingQuestionnaire.id,
        );
        await this.safeUpdateAnswers(
          tx,
          existingQuestionnaire.answers,
          questionData,
          existingQuestionnaire.options,
          existingQuestionnaire.id,
        );
      } else {
        // Create new questionnaire
        const questionnaire = await tx.questionnaire.create({
          data: {
            question: questionData.question,
            questionImage: questionData.questionImage ?? null,
            allowMultiple: questionData.allowMultiple,
            ...testRelation,
          },
        });

        // Create options
        const options = await Promise.all(
          questionData.options.map((optionData: any) =>
            tx.option.create({
              data: {
                label: optionData.label,
                image: optionData.image ?? null,
                questionnaireId: questionnaire.id,
              },
            }),
          ),
        );

        // Create correct answers
        await this.createCorrectAnswers(
          tx,
          questionnaire.id,
          questionData,
          options,
        );
      }
    }
  }

  /**
   * Safely update options without losing existing data
   */
  private static async safeUpdateOptions(
    tx: any,
    existingOptions: any[],
    optionsData: any[],
    questionnaireId: string,
  ) {
    const updatedOptions = [];

    for (let i = 0; i < optionsData.length; i++) {
      const optionData = optionsData[i];
      const existingOption = existingOptions[i]; // Match by index/order

      if (existingOption) {
        // Update existing option
        const option = await tx.option.update({
          where: { id: existingOption.id },
          data: {
            label: optionData.label,
            image: optionData.image ?? null,
          },
        });
        updatedOptions.push(option);
      } else {
        // Create new option
        const option = await tx.option.create({
          data: {
            label: optionData.label,
            image: optionData.image ?? null,
            questionnaireId,
          },
        });
        updatedOptions.push(option);
      }
    }

    return updatedOptions;
  }

  /**
   * Safely update answers without losing existing data
   */
  private static async safeUpdateAnswers(
    tx: any,
    existingAnswers: any[],
    questionData: any,
    existingOptions: any[],
    questionnaireId: string,
  ) {
    // Clear existing answers for this questionnaire (but preserve attempts)
    // We only update the correct answer definitions, not student attempts
    await tx.answer.deleteMany({
      where: { questionnaireId },
    });

    // Recreate correct answers based on new data
    if (questionData.correctAnswer) {
      await tx.answer.create({
        data: {
          label: questionData.correctAnswer.label,
          image: questionData.correctAnswer.image ?? null,
          questionnaireId,
        },
      });
    }

    // Handle multiple correct answers
    if (questionData.correctAnswers && questionData.correctAnswers.length > 0) {
      for (const correctIndex of questionData.correctAnswers) {
        const correctOption = questionData.options[correctIndex];
        if (correctOption) {
          await tx.answer.create({
            data: {
              label: correctOption.label,
              image: correctOption.image ?? null,
              questionnaireId,
            },
          });
        }
      }
    }
  }
}
