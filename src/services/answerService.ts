import { prisma } from "../utils/client";
import AppError from "../utils/error";
import { CreateAnswerDto, TAnswerResponse } from "../utils/interfaces/common";
import { Prisma } from "@prisma/client";

export class AnswerService {
  public static async createAnswer(data: CreateAnswerDto) {
    const answer = await prisma.answer.create({
      data: {
        label: data.label,
        image: data.image ?? null,
        questionnaireId: data.questionnaireId,
      },
    });

    return {
      message: "Answer created successfully",
      statusCode: 201,
      data: answer,
    } as { message: string; statusCode: number; data: TAnswerResponse };
  }

  public static async getAnswerById(id: string) {
    const answer = await prisma.answer.findUnique({ where: { id } });
    if (!answer) throw new AppError("Answer not found", 404);

    return {
      message: "Answer fetched successfully",
      statusCode: 200,
      data: answer,
    } as { message: string; statusCode: number; data: TAnswerResponse };
  }

  public static async updateAnswer(id: string, data: CreateAnswerDto) {
    const existing = await prisma.answer.findUnique({ where: { id } });
    if (!existing) throw new AppError("Answer not found", 404);

    const updated = await prisma.answer.update({
      where: { id },
      data: {
        label: data.label,
        image: data.image ?? null,
        questionnaireId: data.questionnaireId,
      },
    });

    return {
      message: "Answer updated successfully",
      statusCode: 200,
      data: updated,
    } as { message: string; statusCode: number; data: TAnswerResponse };
  }

  public static async deleteAnswer(id: string) {
    const existing = await prisma.answer.findUnique({ where: { id } });
    if (!existing) throw new AppError("Answer not found", 404);

    await prisma.answer.delete({ where: { id } });

    return { message: "Answer deleted successfully", statusCode: 200 };
  }

  public static async getAnswers(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    const where: Prisma.AnswerWhereInput = {};
    if (searchq) {
      where.OR = [{ label: { contains: searchq, mode: "insensitive" } }];
    }

    const take = limit ?? 15;
    const skip = currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

    const answers = await prisma.answer.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });

    const totalItems = await prisma.answer.count({ where });

    return {
      message: "Answers fetched successfully",
      statusCode: 200,
      data: answers,
      totalItems,
      currentPage: currentPage || 1,
      itemsPerPage: take,
    };
  }

  public static async getAllAnswers(searchq?: string) {
    const where: Prisma.AnswerWhereInput = {};
    if (searchq) {
      where.OR = [{ label: { contains: searchq, mode: "insensitive" } }];
    }

    const answers = await prisma.answer.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return {
      message: "Answers fetched successfully",
      statusCode: 200,
      data: answers,
    };
  }
}
