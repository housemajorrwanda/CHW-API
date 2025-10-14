import { prisma } from "../utils/client";
import AppError from "../utils/error";
import {
  CreateDocumentOnSlideDto,
  TDocumentOnSlideResponse,
} from "../utils/interfaces/common";
import { Prisma } from "@prisma/client";

export class DocumentOnSlideService {
  public static async createDocument(data: CreateDocumentOnSlideDto) {
    // validate chapter exists
    const chapter = await prisma.chapter.findUnique({
      where: { id: data.chapterId },
    });
    if (!chapter) throw new AppError("chapter not found", 404);

    const created = await prisma.documentOnSlide.create({
      data: {
        fileName: data.fileName,
        file: data.file,
        chapterId: data.chapterId,
      },
    });

    return { message: "Document created", statusCode: 201, data: created } as {
      message: string;
      statusCode: number;
      data: TDocumentOnSlideResponse;
    };
  }

  public static async getDocumentById(id: string) {
    const doc = await prisma.documentOnSlide.findUnique({ where: { id } });
    if (!doc) throw new AppError("Document not found", 404);
    return { message: "Document fetched", statusCode: 200, data: doc } as {
      message: string;
      statusCode: number;
      data: TDocumentOnSlideResponse;
    };
  }

  public static async updateDocument(
    id: string,
    data: CreateDocumentOnSlideDto,
  ) {
    const existing = await prisma.documentOnSlide.findUnique({ where: { id } });
    if (!existing) throw new AppError("Document not found", 404);

    const updated = await prisma.documentOnSlide.update({
      where: { id },
      data: {
        fileName: data.fileName ?? existing.fileName,
        file: data.file ?? existing.file,
        chapterId: data.chapterId ?? existing.chapterId,
      },
    });

    return { message: "Document updated", statusCode: 200, data: updated } as {
      message: string;
      statusCode: number;
      data: TDocumentOnSlideResponse;
    };
  }

  public static async deleteDocument(id: string) {
    const existing = await prisma.documentOnSlide.findUnique({ where: { id } });
    if (!existing) throw new AppError("Document not found", 404);
    await prisma.documentOnSlide.delete({ where: { id } });
    return { message: "Document deleted", statusCode: 200 };
  }

  public static async getDocuments(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    const where: Prisma.DocumentOnSlideWhereInput = {};
    if (searchq) {
      where.OR = [{ fileName: { contains: searchq, mode: "insensitive" } }];
    }

    const take = limit ?? 15;
    const skip = currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

    const docs = await prisma.documentOnSlide.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });
    const totalItems = await prisma.documentOnSlide.count({ where });

    return {
      message: "Documents fetched",
      statusCode: 200,
      data: docs,
      totalItems,
      currentPage: currentPage || 1,
      itemsPerPage: take,
    };
  }

  public static async getAllDocuments(searchq?: string) {
    const where: Prisma.DocumentOnSlideWhereInput = {};
    if (searchq)
      where.OR = [{ fileName: { contains: searchq, mode: "insensitive" } }];

    const docs = await prisma.documentOnSlide.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return { message: "Documents fetched", statusCode: 200, data: docs };
  }
}
