import { prisma } from "../utils/client";
import AppError from "../utils/error";
import {
  CreateAttempTestDto,
  TAttempTestResponse,
} from "../utils/interfaces/common";
import { Prisma } from "@prisma/client";

function arraysEqualUnordered(a: string[], b: string[]) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((v) => setA.has(v));
}

export class AttemptTestService {
  public static async createAttempt(data: CreateAttempTestDto) {
    // validate student
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });
    if (!student) throw new AppError("Student not found", 404);

    // ensure only one test id is provided
    const testIds = [data.preTestId, data.midTestId, data.finalTestId].filter(
      Boolean,
    );
    if (testIds.length === 0)
      throw new AppError(
        "One of preTestId, midTestId or finalTestId must be provided",
        400,
      );
    if (testIds.length > 1)
      throw new AppError(
        "Provide only one test id (preTestId OR midTestId OR finalTestId)",
        400,
      );

    // validate referenced test
    if (data.preTestId) {
      const pre = await prisma.preTest.findUnique({
        where: { id: data.preTestId },
      });
      if (!pre) throw new AppError("PreTest not found", 404);
    }
    if (data.midTestId) {
      const mid = await prisma.midTest.findUnique({
        where: { id: data.midTestId },
      });
      if (!mid) throw new AppError("MidTest not found", 404);
    }
    if (data.finalTestId) {
      const fin = await prisma.finalTest.findUnique({
        where: { id: data.finalTestId },
      });
      if (!fin) throw new AppError("FinalTest not found", 404);
    }

    // Use transaction: create attempt, create attemptAnswers (evaluated) if provided, update marks
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.attempTest.create({
        data: {
          studentId: data.studentId,
          preTestId: data.preTestId ?? null,
          midTestId: data.midTestId ?? null,
          finalTestId: data.finalTestId ?? null,
          tryCount: data.tryCount ?? 1,
        },
      });

      if (data.questionAnswers && data.questionAnswers.length > 0) {
        let correctCount = 0;
        for (const qa of data.questionAnswers) {
          const questionnaire = await tx.questionnaire.findUnique({
            where: { id: qa.questionnaireId },
            include: {
              answers: true,
              options: true,
            },
          });
          if (!questionnaire)
            throw new AppError("Questionnaire not found", 404);

          // ensure questionnaire belongs to the same test type as the attempt
          if (
            created.preTestId &&
            questionnaire.preTestId !== created.preTestId
          ) {
            throw new AppError(
              "Questionnaire does not belong to the attempt's preTest",
              400,
            );
          }
          if (
            created.midTestId &&
            questionnaire.midTestId !== created.midTestId
          ) {
            throw new AppError(
              "Questionnaire does not belong to the attempt's midTest",
              400,
            );
          }
          if (
            created.finalTestId &&
            questionnaire.finalTestId !== created.finalTestId
          ) {
            throw new AppError(
              "Questionnaire does not belong to the attempt's finalTest",
              400,
            );
          }

          const correctAnswerIds = questionnaire.answers.map((a) => a.id) || [];
          const selected = qa.selectedAnswerIds || [];
          const isCorrect = arraysEqualUnordered(correctAnswerIds, selected);
          if (isCorrect) correctCount += 1;

          await tx.attemptAnswer.create({
            data: {
              attemptId: created.id,
              questionnaireId: qa.questionnaireId,
              selectedAnswerIds: selected,
              isCorrect,
              marks: isCorrect ? 1 : 0,
            },
          });
        }

        const totalQuestions = data.questionAnswers.length;
        const percentage =
          totalQuestions === 0 ? 0 : (correctCount / totalQuestions) * 100;
        const rounded = Math.round(percentage);

        await tx.attempTest.update({
          where: { id: created.id },
          data: { marks: rounded, isCompleted: true },
        });

        const updatedAttempt = await tx.attempTest.findUnique({
          where: { id: created.id },
          include: { attemptAnswers: true },
        });
        return updatedAttempt;
      }

      return created;
    });

    return {
      message: "Attempt created successfully",
      statusCode: 201,
      data: result,
    } as { message: string; statusCode: number; data: TAttempTestResponse };
  }

  public static async getAttemptById(id: string) {
    const attempt = await prisma.attempTest.findUnique({
      where: { id },
      include: { attemptAnswers: true },
    });
    if (!attempt) throw new AppError("Attempt not found", 404);
    return { message: "Attempt fetched", statusCode: 200, data: attempt } as {
      message: string;
      statusCode: number;
      data: TAttempTestResponse;
    };
  }

  public static async updateAttempt(id: string, data: CreateAttempTestDto) {
    const existing = await prisma.attempTest.findUnique({ where: { id } });
    if (!existing) throw new AppError("Attempt not found", 404);

    // validate student if changed
    if (data.studentId && data.studentId !== existing.studentId) {
      const student = await prisma.student.findUnique({
        where: { id: data.studentId },
      });
      if (!student) throw new AppError("Student not found", 404);
    }

    // If questionAnswers are provided on update -> evaluate and compute marks
    if (data.questionAnswers && data.questionAnswers.length > 0) {
      // evaluate each submitted question
      let correctCount = 0;
      for (const qa of data.questionAnswers) {
        const questionnaire = await prisma.questionnaire.findUnique({
          where: { id: qa.questionnaireId },
          include: {
            answers: true,
            options: true,
          },
        });
        if (!questionnaire) throw new AppError("Questionnaire not found", 404);

        // ensure questionnaire belongs to the same test type as the attempt
        if (
          existing.preTestId &&
          questionnaire.preTestId !== existing.preTestId
        ) {
          throw new AppError(
            "Questionnaire does not belong to the attempt's preTest",
            400,
          );
        }
        if (
          existing.midTestId &&
          questionnaire.midTestId !== existing.midTestId
        ) {
          throw new AppError(
            "Questionnaire does not belong to the attempt's midTest",
            400,
          );
        }
        if (
          existing.finalTestId &&
          questionnaire.finalTestId !== existing.finalTestId
        ) {
          throw new AppError(
            "Questionnaire does not belong to the attempt's finalTest",
            400,
          );
        }

        const correctAnswerIds = questionnaire.answers.map((a) => a.id) || [];
        const selected = qa.selectedAnswerIds || [];
        const isCorrect = arraysEqualUnordered(correctAnswerIds, selected);

        if (isCorrect) correctCount += 1;

        // upsert AttemptAnswer
        const existingAnswer = await prisma.attemptAnswer.findFirst({
          where: { attemptId: id, questionnaireId: qa.questionnaireId },
        });
        if (existingAnswer) {
          await prisma.attemptAnswer.update({
            where: { id: existingAnswer.id },
            data: {
              selectedAnswerIds: selected,
              isCorrect,
              marks: isCorrect ? 1 : 0,
            },
          });
        } else {
          await prisma.attemptAnswer.create({
            data: {
              attemptId: id,
              questionnaireId: qa.questionnaireId,
              selectedAnswerIds: selected,
              isCorrect,
              marks: isCorrect ? 1 : 0,
            },
          });
        }
      }

      const totalQuestions = data.questionAnswers.length;
      const percentage =
        totalQuestions === 0 ? 0 : (correctCount / totalQuestions) * 100;
      const rounded = Math.round(percentage);

      const updatedAttempt = await prisma.attempTest.update({
        where: { id },
        data: { marks: rounded, isCompleted: true },
      });

      return {
        message: "Attempt evaluated",
        statusCode: 200,
        data: updatedAttempt,
      } as {
        message: string;
        statusCode: number;
        data: TAttempTestResponse;
      };
    }

    const updated = await prisma.attempTest.update({
      where: { id },
      data: {
        studentId: data.studentId ?? existing.studentId,
        preTestId: data.preTestId ?? existing.preTestId,
        midTestId: data.midTestId ?? existing.midTestId,
        finalTestId: data.finalTestId ?? existing.finalTestId,
        tryCount: data.tryCount ?? existing.tryCount,
      },
    });

    return { message: "Attempt updated", statusCode: 200, data: updated } as {
      message: string;
      statusCode: number;
      data: TAttempTestResponse;
    };
  }

  public static async deleteAttempt(id: string) {
    const existing = await prisma.attempTest.findUnique({ where: { id } });
    if (!existing) throw new AppError("Attempt not found", 404);
    await prisma.attempTest.delete({ where: { id } });
    return { message: "Attempt deleted", statusCode: 200 };
  }

  public static async getAttempts(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    const where: Prisma.AttempTestWhereInput = {};
    if (searchq) {
      where.OR = [{ studentId: { contains: searchq, mode: "insensitive" } }];
    }

    const take = limit ?? 15;
    const skip = currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

    const attempts = await prisma.attempTest.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });
    const totalItems = await prisma.attempTest.count({ where });

    return {
      message: "Attempts fetched",
      statusCode: 200,
      data: attempts,
      totalItems,
      currentPage: currentPage || 1,
      itemsPerPage: take,
    };
  }

  public static async getAllAttempts(searchq?: string) {
    const where: Prisma.AttempTestWhereInput = {};
    if (searchq)
      where.OR = [{ studentId: { contains: searchq, mode: "insensitive" } }];

    const attempts = await prisma.attempTest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return { message: "Attempts fetched", statusCode: 200, data: attempts };
  }
}
