import { prisma } from "../utils/client";
import AppError from "../utils/error";
import { CreateSectionDto, TSectionResponse } from "../utils/interfaces/common";
import { Prisma } from "@prisma/client";

export class SectionService {
  public static async createSection(data: CreateSectionDto) {
    // ensure course exists
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
    });
    if (!course) {
      throw new AppError("Course not found", 404);
    }

    const section = await prisma.section.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description ?? null,
      },
    });

    return {
      message: "Section created successfully",
      statusCode: 201,
      data: section,
    } as { message: string; statusCode: number; data: TSectionResponse };
  }

  public static async getSectionById(id: string) {
    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) throw new AppError("Section not found", 404);

    return {
      message: "Section fetched successfully",
      statusCode: 200,
      data: section,
    } as { message: string; statusCode: number; data: TSectionResponse };
  }

  public static async updateSection(id: string, data: CreateSectionDto) {
    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing) throw new AppError("Section not found", 404);

    // If courseId changed, ensure course exists
    if (data.courseId && data.courseId !== existing.courseId) {
      const course = await prisma.course.findUnique({
        where: { id: data.courseId },
      });
      if (!course) throw new AppError("Course not found", 404);
    }

    const updated = await prisma.section.update({
      where: { id },
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description ?? null,
      },
    });

    return {
      message: "Section updated successfully",
      statusCode: 200,
      data: updated,
    } as { message: string; statusCode: number; data: TSectionResponse };
  }

  public static async deleteSection(id: string) {
    const existing = await prisma.section.findUnique({ where: { id } });
    if (!existing) throw new AppError("Section not found", 404);

    await prisma.section.delete({ where: { id } });

    return { message: "Section deleted successfully", statusCode: 200 };
  }

  public static async getSections(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    const where: Prisma.SectionWhereInput = {};
    if (searchq) {
      where.OR = [
        { title: { contains: searchq, mode: "insensitive" } },
        { description: { contains: searchq, mode: "insensitive" } },
      ];
    }

    const take = limit ?? 15;
    const skip = currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

    const sections = await prisma.section.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });

    const totalItems = await prisma.section.count({ where });

    return {
      message: "Sections fetched successfully",
      statusCode: 200,
      data: sections,
      totalItems,
      currentPage: currentPage || 1,
      itemsPerPage: take,
    };
  }

  public static async getAllSections(searchq?: string) {
    const where: Prisma.SectionWhereInput = {};
    if (searchq) {
      where.OR = [
        { title: { contains: searchq, mode: "insensitive" } },
        { description: { contains: searchq, mode: "insensitive" } },
      ];
    }

    const sections = await prisma.section.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return {
      message: "Sections fetched successfully",
      statusCode: 200,
      data: sections,
    };
  }
}
