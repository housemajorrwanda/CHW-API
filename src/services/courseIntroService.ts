import { prisma } from "../utils/client";
import AppError from "../utils/error";
import {
  CreateCourseIntroDto,
  TCourseIntroResponse,
} from "../utils/interfaces/common";
import { Prisma } from "@prisma/client";

export class CourseIntroService {
  public static async createCourseIntro(data: CreateCourseIntroDto) {
    // ensure course exists
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
    });
    if (!course) {
      throw new AppError("Course not found", 404);
    }

    const intro = await prisma.courseIntro.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        summary: data.summary,
        bannerImage: data.bannerImage ?? null,
        thumbnail: data.thumbnail,
      },
    });

    return {
      message: "Course intro created successfully",
      statusCode: 201,
      data: intro,
    } as { message: string; statusCode: number; data: TCourseIntroResponse };
  }

  public static async getCourseIntroById(id: string) {
    const intro = await prisma.courseIntro.findUnique({ where: { id } });
    if (!intro) throw new AppError("Course intro not found", 404);

    return {
      message: "Course intro fetched successfully",
      statusCode: 200,
      data: intro,
    } as { message: string; statusCode: number; data: TCourseIntroResponse };
  }

  public static async updateCourseIntro(
    id: string,
    data: CreateCourseIntroDto,
  ) {
    const existing = await prisma.courseIntro.findUnique({ where: { id } });
    if (!existing) throw new AppError("Course intro not found", 404);

    // If courseId changed, ensure course exists
    if (data.courseId && data.courseId !== existing.courseId) {
      const course = await prisma.course.findUnique({
        where: { id: data.courseId },
      });
      if (!course) throw new AppError("Course not found", 404);
    }

    const updated = await prisma.courseIntro.update({
      where: { id },
      data: {
        courseId: data.courseId,
        title: data.title,
        summary: data.summary,
        bannerImage: data.bannerImage ?? null,
        thumbnail: data.thumbnail,
      },
    });

    return {
      message: "Course intro updated successfully",
      statusCode: 200,
      data: updated,
    } as { message: string; statusCode: number; data: TCourseIntroResponse };
  }

  public static async deleteCourseIntro(id: string) {
    const existing = await prisma.courseIntro.findUnique({ where: { id } });
    if (!existing) throw new AppError("Course intro not found", 404);

    await prisma.courseIntro.delete({ where: { id } });

    return { message: "Course intro deleted successfully", statusCode: 200 };
  }

  public static async getCourseIntros(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    const where: Prisma.CourseIntroWhereInput = {};
    if (searchq) {
      where.OR = [
        { title: { contains: searchq, mode: "insensitive" } },
        { summary: { contains: searchq, mode: "insensitive" } },
      ];
    }

    const take = limit ?? 15;
    const skip = currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

    const intros = await prisma.courseIntro.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });

    const totalItems = await prisma.courseIntro.count({ where });

    return {
      message: "Course intros fetched successfully",
      statusCode: 200,
      data: intros,
      totalItems,
      currentPage: currentPage || 1,
      itemsPerPage: take,
    };
  }

  public static async getAllCourseIntros(searchq?: string) {
    const where: Prisma.CourseIntroWhereInput = {};
    if (searchq) {
      where.OR = [
        { title: { contains: searchq, mode: "insensitive" } },
        { summary: { contains: searchq, mode: "insensitive" } },
      ];
    }

    const intros = await prisma.courseIntro.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return {
      message: "Course intros fetched successfully",
      statusCode: 200,
      data: intros,
    };
  }
}
