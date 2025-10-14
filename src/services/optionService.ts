import { prisma } from "../utils/client";
import AppError from "../utils/error";
import { CreateOptionDto, TOptionResponse } from "../utils/interfaces/common";
import { Prisma } from "@prisma/client";

export class OptionService {
  public static async createOption(data: CreateOptionDto) {
    const option = await prisma.option.create({
      data: {
        label: data.label,
        image: data.image ?? null,
        questionnaireId: data.questionnaireId,
      },
    });

    return {
      message: "Option created successfully",
      statusCode: 201,
      data: option,
    } as { message: string; statusCode: number; data: TOptionResponse };
  }

  public static async getOptionById(id: string) {
    const option = await prisma.option.findUnique({ where: { id } });
    if (!option) throw new AppError("Option not found", 404);

    return {
      message: "Option fetched successfully",
      statusCode: 200,
      data: option,
    } as { message: string; statusCode: number; data: TOptionResponse };
  }

  public static async updateOption(id: string, data: CreateOptionDto) {
    const existing = await prisma.option.findUnique({ where: { id } });
    if (!existing) throw new AppError("Option not found", 404);

    const updated = await prisma.option.update({
      where: { id },
      data: {
        label: data.label,
        image: data.image ?? null,
        questionnaireId: data.questionnaireId,
      },
    });

    return {
      message: "Option updated successfully",
      statusCode: 200,
      data: updated,
    } as { message: string; statusCode: number; data: TOptionResponse };
  }

  public static async deleteOption(id: string) {
    const existing = await prisma.option.findUnique({ where: { id } });
    if (!existing) throw new AppError("Option not found", 404);

    await prisma.option.delete({ where: { id } });

    return { message: "Option deleted successfully", statusCode: 200 };
  }

  public static async getOptions(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    const where: Prisma.OptionWhereInput = {};
    if (searchq) {
      where.OR = [{ label: { contains: searchq, mode: "insensitive" } }];
    }

    const take = limit ?? 15;
    const skip = currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

    const options = await prisma.option.findMany({
      where,
      take,
      skip,
      orderBy: { createdAt: "desc" },
    });

    const totalItems = await prisma.option.count({ where });

    return {
      message: "Options fetched successfully",
      statusCode: 200,
      data: options,
      totalItems,
      currentPage: currentPage || 1,
      itemsPerPage: take,
    };
  }

  public static async getAllOptions(searchq?: string) {
    const where: Prisma.OptionWhereInput = {};
    if (searchq) {
      where.OR = [{ label: { contains: searchq, mode: "insensitive" } }];
    }

    const options = await prisma.option.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return {
      message: "Options fetched successfully",
      statusCode: 200,
      data: options,
    };
  }
}
