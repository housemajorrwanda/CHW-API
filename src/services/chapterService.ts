import { prisma } from "../utils/client";
import AppError from "../utils/error";
import { CreateChapterDto, TChapterResponse } from "../utils/interfaces/common";
import { Prisma } from "@prisma/client";

export class ChapterService {
  public static async createChapter(data: CreateChapterDto) {
    // ensure section exists
    const section = await prisma.section.findUnique({
      where: { id: data.sectionId },
    });
    if (!section) {
      throw new AppError("Section not found", 404);
    }

    // determine chapter number if not provided
    const chapterNumber = data.chapterNumber ?? section.totalChapter + 1;

    const chapter = await prisma.chapter.create({
      data: {
        sectionId: data.sectionId,
        title: data.title,
        description: data.description ?? null,
        chapterNumber,
        activityAt: data.activityAt ?? null,
        lessonDuration: data.lessonDuration ?? undefined,
        isPublished: data.isPublished ?? undefined,
      },
    });

    // update section totalChapter
    await prisma.section.update({
      where: { id: section.id },
      data: { totalChapter: section.totalChapter + 1 },
    });

    return {
      message: "Chapter created successfully",
      statusCode: 201,
      data: chapter,
    } as { message: string; statusCode: number; data: TChapterResponse };
  }

  public static async getChapterById(id: string) {
    const chapter = await prisma.chapter.findUnique({
      where: { id },

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
    });
    if (!chapter) throw new AppError("Chapter not found", 404);

    return {
      message: "Chapter fetched successfully",
      statusCode: 200,
      data: chapter,
    } as { message: string; statusCode: number; data: TChapterResponse };
  }

  public static async updateChapter(id: string, data: CreateChapterDto) {
    const existing = await prisma.chapter.findUnique({ where: { id } });
    if (!existing) throw new AppError("Chapter not found", 404);

    const updated = await prisma.chapter.update({
      where: { id },
      data: {
        sectionId: data.sectionId,
        title: data.title,
        description: data.description ?? null,
        chapterNumber: data.chapterNumber ?? existing.chapterNumber,
        activityAt: data.activityAt ?? existing.activityAt,
        lessonDuration: data.lessonDuration ?? existing.lessonDuration,
        isPublished: data.isPublished ?? existing.isPublished,
      },
    });

    return {
      message: "Chapter updated successfully",
      statusCode: 200,
      data: updated,
    } as { message: string; statusCode: number; data: TChapterResponse };
  }

  public static async deleteChapter(id: string) {
    const existing = await prisma.chapter.findUnique({ where: { id } });
    if (!existing) throw new AppError("Chapter not found", 404);

    await prisma.chapter.delete({ where: { id } });

    // decrement section totalChapter
    const section = await prisma.section.findUnique({
      where: { id: existing.sectionId },
    });
    if (section) {
      await prisma.section.update({
        where: { id: section.id },
        data: { totalChapter: Math.max(0, section.totalChapter - 1) },
      });
    }

    return { message: "Chapter deleted successfully", statusCode: 200 };
  }

  public static async getChapters(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    const where: Prisma.ChapterWhereInput = {};
    if (searchq) {
      where.OR = [
        { title: { contains: searchq, mode: "insensitive" } },
        { description: { contains: searchq, mode: "insensitive" } },
      ];
    }

    const take = limit ?? 15;
    const skip = currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

    const chapters = await prisma.chapter.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });

    const totalItems = await prisma.chapter.count({ where });

    return {
      message: "Chapters fetched successfully",
      statusCode: 200,
      data: chapters,
      totalItems,
      currentPage: currentPage || 1,
      itemsPerPage: take,
    };
  }

  public static async getAllChapters(searchq?: string) {
    const where: Prisma.ChapterWhereInput = {};
    if (searchq) {
      where.OR = [
        { title: { contains: searchq, mode: "insensitive" } },
        { description: { contains: searchq, mode: "insensitive" } },
      ];
    }

    const chapters = await prisma.chapter.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return {
      message: "Chapters fetched successfully",
      statusCode: 200,
      data: chapters,
    };
  }
}
