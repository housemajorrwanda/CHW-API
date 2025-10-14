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
              },
            },
          },
        },
      },
    });
    if (!course) throw new AppError("Course not found", 404);

    return {
      message: "Course fetched successfully",
      statusCode: 200,
      data: course,
    } as { message: string; statusCode: number; data: TCourseResponse };
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
  ) {
    const where: Prisma.CourseWhereInput = {};
    if (searchq) {
      where.OR = [
        { title: { contains: searchq, mode: "insensitive" } },
        { description: { contains: searchq, mode: "insensitive" } },
      ];
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
              },
            },
          },
        },
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
    const where: Prisma.CourseWhereInput = {};
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
                        answers: true,
                        options: true,
                      },
                    },
                  },
                },
                finalTest: {
                  include: {
                    questionnaires: {
                      include: {
                        answers: true,
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
                    answers: true,
                    options: true,
                  },
                },
              },
            },
          },
        },
        intro: true,
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

          // Create MidTest if there's an activity slide
          let midTest = null;
          const activitySlide = chapterData.slides.find(
            (slide) => slide.isActivitySlide,
          );
          if (activitySlide?.activity) {
            midTest = await tx.midTest.create({
              data: {
                chapterId: chapter.id,
                questionToBeAnswered:
                  activitySlide.activity.instruction.questionToBeAnswered,
                marksToPass: activitySlide.activity.instruction.marksToPass,
                description: activitySlide.activity.instruction.description,
              },
            });

            // Create questionnaires for midtest
            for (const questionData of activitySlide.activity.questions) {
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

  // Super Course Update Method
  public static async updateSuperCourse(
    data: UpdateSuperCourseDto,
    creatorId: string,
  ) {
    // ensure creator (staff) exists
    const staff = await prisma.staff.findUnique({
      where: { id: creatorId },
    });
    if (!staff) {
      throw new AppError("Creator (staff) not found", 404);
    }

    // ensure course exists
    const existingCourse = await prisma.course.findUnique({
      where: { id: data.courseId },
    });
    if (!existingCourse) {
      throw new AppError("Course not found", 404);
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
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
      const existingIntro = await tx.courseIntro.findUnique({
        where: { courseId: course.id },
      });

      let courseIntro;
      if (existingIntro) {
        courseIntro = await tx.courseIntro.update({
          where: { id: existingIntro.id },
          data: {
            title: data.courseIntro.title,
            summary: data.courseIntro.summary,
            bannerImage: data.courseIntro.bannerImage ?? null,
            thumbnail: data.courseIntro.thumbnail,
          },
        });
      } else {
        courseIntro = await tx.courseIntro.create({
          data: {
            courseId: course.id,
            title: data.courseIntro.title,
            summary: data.courseIntro.summary,
            bannerImage: data.courseIntro.bannerImage ?? null,
            thumbnail: data.courseIntro.thumbnail,
          },
        });
      }

      // 3. Delete existing sections and their nested content (cascade will handle nested deletions)
      await tx.section.deleteMany({
        where: { courseId: course.id },
      });

      // 4. Create new sections with nested content (similar to create method)
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

        // Create Chapters (similar logic as create method)
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

          // Create MidTest if there's an activity slide
          let midTest = null;
          const activitySlide = chapterData.slides.find(
            (slide) => slide.isActivitySlide,
          );
          if (activitySlide?.activity) {
            midTest = await tx.midTest.create({
              data: {
                chapterId: chapter.id,
                questionToBeAnswered:
                  activitySlide.activity.instruction.questionToBeAnswered,
                marksToPass: activitySlide.activity.instruction.marksToPass,
                description: activitySlide.activity.instruction.description,
              },
            });

            // Create questionnaires for midtest
            for (const questionData of activitySlide.activity.questions) {
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
      message: "Super course updated successfully",
      statusCode: 200,
      data: result,
    };
  }
}
