import { prisma } from "../utils/client";
import AppError from "../utils/error";
import {
  CreateFinalTestDto,
  TFinalTestResponse,
} from "../utils/interfaces/common";
import { Prisma } from "@prisma/client";

export class FinalTestService {
  public static async createFinalTest(data: CreateFinalTestDto) {
    // ensure chapter exists
    const chapter = await prisma.chapter.findUnique({
      where: { id: data.chapterId },
    });
    if (!chapter) throw new AppError("Chapter not found", 404);

    const finalTest = await prisma.finalTest.create({
      data: {
        chapterId: data.chapterId,
        isPublished: data.isPublished ?? undefined,
      },
    });

    return {
      message: "FinalTest created successfully",
      statusCode: 201,
      data: finalTest,
    } as { message: string; statusCode: number; data: TFinalTestResponse };
  }

  public static async getFinalTestById(id: string) {
    const finalTest = await prisma.finalTest.findUnique({ where: { id } });
    if (!finalTest) throw new AppError("FinalTest not found", 404);

    return {
      message: "FinalTest fetched successfully",
      statusCode: 200,
      data: finalTest,
    } as { message: string; statusCode: number; data: TFinalTestResponse };
  }

  public static async updateFinalTest(id: string, data: CreateFinalTestDto) {
    const existing = await prisma.finalTest.findUnique({ where: { id } });
    if (!existing) throw new AppError("FinalTest not found", 404);

    // If chapterId changed, ensure chapter exists
    if (data.chapterId && data.chapterId !== existing.chapterId) {
      const chapter = await prisma.chapter.findUnique({
        where: { id: data.chapterId },
      });
      if (!chapter) throw new AppError("Chapter not found", 404);
    }

    const updated = await prisma.finalTest.update({
      where: { id },
      data: {
        chapterId: data.chapterId,
        isPublished: data.isPublished ?? existing.isPublished,
      },
    });

    return {
      message: "FinalTest updated successfully",
      statusCode: 200,
      data: updated,
    } as { message: string; statusCode: number; data: TFinalTestResponse };
  }

  public static async deleteFinalTest(id: string) {
    const existing = await prisma.finalTest.findUnique({ where: { id } });
    if (!existing) throw new AppError("FinalTest not found", 404);

    await prisma.finalTest.delete({ where: { id } });

    return { message: "FinalTest deleted successfully", statusCode: 200 };
  }

  public static async getFinalTests(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    const where: Prisma.FinalTestWhereInput = {};
    if (searchq) {
      where.OR = [{ id: { contains: searchq, mode: "insensitive" } }];
    }

    const take = limit ?? 15;
    const skip = currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

    const finalTests = await prisma.finalTest.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });

    const totalItems = await prisma.finalTest.count({ where });

    return {
      message: "FinalTests fetched successfully",
      statusCode: 200,
      data: finalTests,
      totalItems,
      currentPage: currentPage || 1,
      itemsPerPage: take,
    };
  }

  public static async getAllFinalTests(searchq?: string) {
    const where: Prisma.FinalTestWhereInput = {};
    if (searchq) {
      where.OR = [{ id: { contains: searchq, mode: "insensitive" } }];
    }

    const finalTests = await prisma.finalTest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return {
      message: "FinalTests fetched successfully",
      statusCode: 200,
      data: finalTests,
    };
  }
}
