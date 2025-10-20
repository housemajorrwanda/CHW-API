import { prisma } from "../utils/client";
import AppError from "../utils/error";
import { CreatePreTestDto, TPreTestResponse } from "../utils/interfaces/common";
import { Prisma } from "@prisma/client";

export class PreTestService {
  public static async createPreTest(data: CreatePreTestDto) {
    // ensure section exists
    const section = await prisma.section.findUnique({
      where: { id: data.sectionId },
    });
    if (!section) throw new AppError("section not found", 404);

    const preTest = await prisma.preTest.create({
      data: {
        sectionId: data.sectionId,
        questionToBeAnswered: data.questionToBeAnswered,
        marksToPass: data.marksToPass,
        description: data.description,
        isPublished: data.isPublished ?? undefined,
      },
    });

    return {
      message: "PreTest created successfully",
      statusCode: 201,
      data: preTest,
    } as { message: string; statusCode: number; data: TPreTestResponse };
  }

  public static async getPreTestById(id: string) {
    const preTest = await prisma.preTest.findUnique({
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
    if (!preTest) throw new AppError("PreTest not found", 404);

    return {
      message: "PreTest fetched successfully",
      statusCode: 200,
      data: preTest,
    } as { message: string; statusCode: number; data: TPreTestResponse };
  }

  public static async updatePreTest(id: string, data: CreatePreTestDto) {
    const existing = await prisma.preTest.findUnique({ where: { id } });
    if (!existing) throw new AppError("PreTest not found", 404);

    // If sectionId changed, ensure section exists
    if (data.sectionId && data.sectionId !== existing.sectionId) {
      const section = await prisma.section.findUnique({
        where: { id: data.sectionId },
      });
      if (!section) throw new AppError("section not found", 404);
    }

    const updated = await prisma.preTest.update({
      where: { id },
      data: {
        sectionId: data.sectionId,
        questionToBeAnswered:
          data.questionToBeAnswered ?? existing.questionToBeAnswered,
        marksToPass: data.marksToPass ?? existing.marksToPass,
        description: data.description ?? existing.description,
        isPublished: data.isPublished ?? existing.isPublished,
      },
    });

    return {
      message: "PreTest updated successfully",
      statusCode: 200,
      data: updated,
    } as { message: string; statusCode: number; data: TPreTestResponse };
  }

  public static async deletePreTest(id: string) {
    const existing = await prisma.preTest.findUnique({ where: { id } });
    if (!existing) throw new AppError("PreTest not found", 404);

    await prisma.preTest.delete({ where: { id } });

    return { message: "PreTest deleted successfully", statusCode: 200 };
  }

  public static async getPreTests(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    const where: Prisma.PreTestWhereInput = {};
    if (searchq) {
      where.OR = [{ id: { contains: searchq, mode: "insensitive" } }];
    }

    const take = limit ?? 15;
    const skip = currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

    const preTests = await prisma.preTest.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });

    const totalItems = await prisma.preTest.count({ where });

    return {
      message: "PreTests fetched successfully",
      statusCode: 200,
      data: preTests,
      totalItems,
      currentPage: currentPage || 1,
      itemsPerPage: take,
    };
  }

  public static async getAllPreTests(searchq?: string) {
    const where: Prisma.PreTestWhereInput = {};
    if (searchq) {
      where.OR = [{ id: { contains: searchq, mode: "insensitive" } }];
    }

    const preTests = await prisma.preTest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return {
      message: "PreTests fetched successfully",
      statusCode: 200,
      data: preTests,
    };
  }
}
