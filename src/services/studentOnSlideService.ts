import { prisma } from "../utils/client";
import AppError from "../utils/error";
import {
  CreateStudentOnSlideDto,
  TStudentOnSlideResponse,
} from "../utils/interfaces/common";
import { Prisma } from "@prisma/client";

export class StudentOnSlideService {
  public static async createStudentOnSlide(data: CreateStudentOnSlideDto) {
    // validate student and slide
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });
    if (!student) throw new AppError("Student not found", 404);

    const slide = await prisma.slide.findUnique({
      where: { id: data.slideId },
    });
    if (!slide) throw new AppError("Slide not found", 404);

    const created = await prisma.studentOnSlide.create({
      data: {
        studentId: data.studentId,
        slideId: data.slideId,
        progress: data.progress ?? 0,
      },
    });

    return {
      message: "StudentOnSlide created",
      statusCode: 201,
      data: created,
    } as { message: string; statusCode: number; data: TStudentOnSlideResponse };
  }

  public static async getStudentOnSlideById(id: string) {
    const res = await prisma.studentOnSlide.findUnique({ where: { id } });
    if (!res) throw new AppError("StudentOnSlide not found", 404);
    return {
      message: "StudentOnSlide fetched",
      statusCode: 200,
      data: res,
    } as { message: string; statusCode: number; data: TStudentOnSlideResponse };
  }

  public static async updateStudentOnSlide(
    id: string,
    data: CreateStudentOnSlideDto,
  ) {
    const existing = await prisma.studentOnSlide.findUnique({ where: { id } });
    if (!existing) throw new AppError("StudentOnSlide not found", 404);

    // validate if student changed
    if (data.studentId && data.studentId !== existing.studentId) {
      const student = await prisma.student.findUnique({
        where: { id: data.studentId },
      });
      if (!student) throw new AppError("Student not found", 404);
    }

    const updated = await prisma.studentOnSlide.update({
      where: { id },
      data: {
        studentId: data.studentId ?? existing.studentId,
        slideId: data.slideId ?? existing.slideId,
        progress: data.progress ?? existing.progress,
      },
    });

    return {
      message: "StudentOnSlide updated",
      statusCode: 200,
      data: updated,
    } as { message: string; statusCode: number; data: TStudentOnSlideResponse };
  }

  public static async deleteStudentOnSlide(id: string) {
    const existing = await prisma.studentOnSlide.findUnique({ where: { id } });
    if (!existing) throw new AppError("StudentOnSlide not found", 404);
    await prisma.studentOnSlide.delete({ where: { id } });
    return { message: "StudentOnSlide deleted", statusCode: 200 };
  }

  public static async getStudentOnSlides(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    const where: Prisma.StudentOnSlideWhereInput = {};
    if (searchq) {
      where.OR = [{ studentId: { contains: searchq, mode: "insensitive" } }];
    }

    const take = limit ?? 15;
    const skip = currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

    const res = await prisma.studentOnSlide.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });
    const totalItems = await prisma.studentOnSlide.count({ where });

    return {
      message: "StudentOnSlides fetched",
      statusCode: 200,
      data: res,
      totalItems,
      currentPage: currentPage || 1,
      itemsPerPage: take,
    };
  }

  public static async getAllStudentOnSlides(searchq?: string) {
    const where: Prisma.StudentOnSlideWhereInput = {};
    if (searchq)
      where.OR = [{ studentId: { contains: searchq, mode: "insensitive" } }];

    const res = await prisma.studentOnSlide.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return { message: "StudentOnSlides fetched", statusCode: 200, data: res };
  }

  // special: get students on a slide where slideProgress isCompleted = true
  public static async getStudentsOnSlideWithCompletedProgress(slideId: string) {
    // find slide to ensure exists
    const slide = await prisma.slide.findUnique({ where: { id: slideId } });
    if (!slide) throw new AppError("Slide not found", 404);

    // find students who have slideProgress with isCompleted = true for this slide
    const completed = await prisma.slideProgress.findMany({
      where: { slideId, isCompleted: true },
      include: { student: true },
    });

    const students = completed.map((c) => c.student);
    return { message: "Students fetched", statusCode: 200, data: students };
  }
}
