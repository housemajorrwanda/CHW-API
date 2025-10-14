import { prisma } from "../utils/client";
import AppError from "../utils/error";
import {
  CreateFAQOnSlideDto,
  TFAQOnSlideResponse,
} from "../utils/interfaces/common";
import { Prisma } from "@prisma/client";

export class FAQOnSlideService {
  public static async createFAQ(data: CreateFAQOnSlideDto, userId: string) {
    // validate student and slide
    const student = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!student) throw new AppError("User not found", 404);

    const slide = await prisma.slide.findUnique({
      where: { id: data.slideId },
    });
    if (!slide) throw new AppError("Slide not found", 404);

    const created = await prisma.fAQOnSlide.create({
      data: {
        userId: data.userId,
        slideId: data.slideId,
        message: data.message,
        isPublished: data.isPublished ?? true,
      },
    });

    return { message: "FAQ created", statusCode: 201, data: created } as {
      message: string;
      statusCode: number;
      data: TFAQOnSlideResponse;
    };
  }

  public static async getFAQById(id: string) {
    const faq = await prisma.fAQOnSlide.findUnique({ where: { id } });
    if (!faq) throw new AppError("FAQ not found", 404);
    return { message: "FAQ fetched", statusCode: 200, data: faq } as {
      message: string;
      statusCode: number;
      data: TFAQOnSlideResponse;
    };
  }

  public static async updateFAQ(id: string, data: CreateFAQOnSlideDto) {
    const existing = await prisma.fAQOnSlide.findUnique({ where: { id } });
    if (!existing) throw new AppError("FAQ not found", 404);

    const updated = await prisma.fAQOnSlide.update({
      where: { id },
      data: {
        slideId: data.slideId ?? existing.slideId,
        message: data.message ?? existing.message,
        isPublished: data.isPublished ?? existing.isPublished,
      },
    });

    return { message: "FAQ updated", statusCode: 200, data: updated } as {
      message: string;
      statusCode: number;
      data: TFAQOnSlideResponse;
    };
  }

  public static async deleteFAQ(id: string) {
    const existing = await prisma.fAQOnSlide.findUnique({ where: { id } });
    if (!existing) throw new AppError("FAQ not found", 404);
    await prisma.fAQOnSlide.delete({ where: { id } });
    return { message: "FAQ deleted", statusCode: 200 };
  }

  public static async getFAQs(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    const where: Prisma.FAQOnSlideWhereInput = {};
    if (searchq) {
      where.OR = [{ message: { contains: searchq, mode: "insensitive" } }];
    }

    const take = limit ?? 15;
    const skip = currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

    const faqs = await prisma.fAQOnSlide.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });
    const totalItems = await prisma.fAQOnSlide.count({ where });

    return {
      message: "FAQs fetched",
      statusCode: 200,
      data: faqs,
      totalItems,
      currentPage: currentPage || 1,
      itemsPerPage: take,
    };
  }

  public static async getAllFAQs(searchq?: string) {
    const where: Prisma.FAQOnSlideWhereInput = {};
    if (searchq)
      where.OR = [{ message: { contains: searchq, mode: "insensitive" } }];

    const faqs = await prisma.fAQOnSlide.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return { message: "FAQs fetched", statusCode: 200, data: faqs };
  }
}
