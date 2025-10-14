import {
  Body,
  Get,
  Middlewares,
  Post,
  Route,
  Tags,
  Security,
  Request,
} from "tsoa";
import {
  CreateSlideProgressDto,
  CreateChapterProgressDto,
  CreateCourseProgressDto,
} from "../utils/interfaces/common";
import { ProgressService } from "../services/progressService";
import { loggerMiddleware } from "../utils/loggers/loggingMiddleware";
import { Request as ExpressRequest } from "express";

@Route("/api/progress")
@Tags("Progress")
export class ProgressController {
  @Post("/slide/complete")
  @Security("jwt")
  public async markSlideCompleted(
    @Body() body: CreateSlideProgressDto,
    @Request() req: ExpressRequest,
  ) {
    const studentId = req.user?.student?.id as string;
    return ProgressService.markSlideCompleted(studentId, body.slideId);
  }

  @Get("/student")
  @Middlewares(loggerMiddleware)
  public async getProgressByStudent(@Request() req: ExpressRequest) {
    const studentId = req.user?.student?.id as string;
    return ProgressService.getProgressByStudent(studentId);
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
