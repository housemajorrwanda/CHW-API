import { prisma } from "../utils/client";
import AppError from "../utils/error";
import { CreateMidTestDto, TMidTestResponse } from "../utils/interfaces/common";
import { Prisma } from "@prisma/client";

export class MidTestService {
  public static async createMidTest(data: CreateMidTestDto) {
    // ensure chapter exists
    const chapter = await prisma.chapter.findUnique({
      where: { id: data.chapterId },
    });
    if (!chapter) throw new AppError("Chapter not found", 404);

    const midTest = await prisma.midTest.create({
      data: {
        chapterId: data.chapterId,
        questionToBeAnswered: data.questionToBeAnswered,
        marksToPass: data.marksToPass,
        description: data.description,
      },
    });

    return {
      message: "MidTest created successfully",
      statusCode: 201,
      data: midTest,
    } as { message: string; statusCode: number; data: TMidTestResponse };
  }

  public static async getMidTestById(id: string) {
    const midTest = await prisma.midTest.findUnique({
      where: { id },
      include: {
        questionnaires: {
          include: {
            options: true,
            answers: true,
          },
        },
      },
    });
    if (!midTest) throw new AppError("MidTest not found", 404);

    return {
      message: "MidTest fetched successfully",
      statusCode: 200,
      data: midTest,
    } as { message: string; statusCode: number; data: TMidTestResponse };
  }

  public static async updateMidTest(id: string, data: CreateMidTestDto) {
    const existing = await prisma.midTest.findUnique({ where: { id } });
    if (!existing) throw new AppError("MidTest not found", 404);

    // If chapterId changed, ensure chapter exists
    if (data.chapterId && data.chapterId !== existing.chapterId) {
      const chapter = await prisma.chapter.findUnique({
        where: { id: data.chapterId },
      });
      if (!chapter) throw new AppError("Chapter not found", 404);
    }

    const updated = await prisma.midTest.update({
      where: { id },
      data: {
        chapterId: data.chapterId,
        questionToBeAnswered:
          data.questionToBeAnswered ?? existing.questionToBeAnswered,
        marksToPass: data.marksToPass ?? existing.marksToPass,
        description: data.description ?? existing.description,
      },
    });

    return {
      message: "MidTest updated successfully",
      statusCode: 200,
      data: updated,
    } as { message: string; statusCode: number; data: TMidTestResponse };
  }

  public static async deleteMidTest(id: string) {
    const existing = await prisma.midTest.findUnique({ where: { id } });
    if (!existing) throw new AppError("MidTest not found", 404);

    await prisma.midTest.delete({ where: { id } });

    return { message: "MidTest deleted successfully", statusCode: 200 };
  }

  public static async getMidTests(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    const where: Prisma.MidTestWhereInput = {};
    if (searchq) {
      where.OR = [{ id: { contains: searchq, mode: "insensitive" } }];
    }

    const take = limit ?? 15;
    const skip = currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

    const midTests = await prisma.midTest.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });

    const totalItems = await prisma.midTest.count({ where });

    return {
      message: "MidTests fetched successfully",
      statusCode: 200,
      data: midTests,
      totalItems,
      currentPage: currentPage || 1,
      itemsPerPage: take,
    };
  }

  public static async getAllMidTests(searchq?: string) {
    const where: Prisma.MidTestWhereInput = {};
    if (searchq) {
      where.OR = [{ id: { contains: searchq, mode: "insensitive" } }];
    }

    const midTests = await prisma.midTest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return {
      message: "MidTests fetched successfully",
      statusCode: 200,
      data: midTests,
    };
  }
}
