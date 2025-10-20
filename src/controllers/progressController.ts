import {
  Body,
  Get,
  Middlewares,
  Post,
  Route,
  Tags,
  Security,
  Request,
  Path,
} from "tsoa";
import {
  CreateSlideProgressDto,
  CreateChapterProgressDto,
  CreateCourseProgressDto,
  TStudentStatisticsResponse,
} from "../utils/interfaces/common";
import { ProgressService } from "../services/progressService";
import { loggerMiddleware } from "../utils/loggers/loggingMiddleware";
import { Request as ExpressRequest } from "express";
import { prisma } from "../utils/client";

@Route("/api/progress")
@Tags("Progress")
export class ProgressController {
  /**
   * Helper method to get student ID from authenticated user
   */
  private async getStudentId(req: ExpressRequest): Promise<string> {
    // Try to get student ID from the user's student relationship first
    let studentId = req.user?.student?.id;

    if (!studentId) {
      // If no direct student relationship, try to find student by userId
      const userId = req.user?.id;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Find student by userId
      const student = await prisma.student.findUnique({
        where: { userId: userId },
      });

      if (!student) {
        throw new Error("Student record not found for this user");
      }

      studentId = student.id;
    }

    return studentId;
  }
  @Post("/slide/complete")
  @Security("jwt")
  public async markSlideCompleted(
    @Body() body: CreateSlideProgressDto,
    @Request() req: ExpressRequest,
  ) {
    const studentId = await this.getStudentId(req);
    return ProgressService.markSlideCompleted(studentId, body.slideId);
  }

  @Get("/student")
  @Security("jwt")
  @Middlewares(loggerMiddleware)
  public async getProgressByStudent(@Request() req: ExpressRequest) {
    const studentId = await this.getStudentId(req);
    return ProgressService.getProgressByStudent(studentId);
  }

  @Get("/student/statistics")
  @Security("jwt")
  @Middlewares(loggerMiddleware)
  public async getStudentStatistics(@Request() req: ExpressRequest): Promise<{
    message: string;
    statusCode: number;
    data: TStudentStatisticsResponse;
  }> {
    const studentId = await this.getStudentId(req);
    return ProgressService.getStudentStatistics(studentId);
  }

  @Post("/enroll/{courseId}")
  @Security("jwt")
  @Middlewares(loggerMiddleware)
  public async enrollInCourse(
    @Path() courseId: string,
    @Request() req: ExpressRequest,
  ) {
    const studentId = await this.getStudentId(req);
    return ProgressService.enrollStudentInCourse(studentId, courseId);
  }

  // Helpers: recompute progress for a specific chapter (can be used internally or for admin)
  @Post("/chapter/recompute")
  @Security("jwt")
  public async recomputeChapterProgress(
    @Body() body: CreateChapterProgressDto,
  ) {
    return ProgressService.recomputeChapterProgressForStudent(
      body.studentId,
      body.chapterId,
    );
  }

  // Helpers: recompute progress for a specific course
  @Post("/course/recompute")
  @Security("jwt")
  public async recomputeCourseProgress(@Body() body: CreateCourseProgressDto) {
    return ProgressService.recomputeCourseProgressForStudent(
      body.studentId,
      body.courseId,
    );
  }
}
