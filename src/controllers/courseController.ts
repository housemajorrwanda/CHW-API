import {
  Body,
  Delete,
  Get,
  Middlewares,
  Path,
  Post,
  Put,
  Query,
  Request,
  Route,
  Tags,
  Security,
} from "tsoa";
import { Request as ExpressRequest } from "express";
import { CourseService } from "../services/courseService";
import {
  CreateCourseDto,
  CreateSuperCourseDto,
  UpdateSuperCourseDto,
} from "../utils/interfaces/common";
import { loggerMiddleware } from "../utils/loggers/loggingMiddleware";
import { appendCoverIconPhoto, checkRole } from "../middlewares";
import { roles } from "../utils/roles";
import upload from "../utils/cloudinary";

@Route("/api/courses")
@Tags("Courses")
export class CourseController {
  @Post("/")
  @Security("jwt")
  @Middlewares(
    upload.single("coverIcon"),
    appendCoverIconPhoto,
    checkRole(roles.STAFF, roles.SUPERVISOR, roles.TRAINER, roles.ADMIN),
  )
  public async createCourse(
    @Body() body: CreateCourseDto,
    @Request() req: ExpressRequest,
  ) {
    const creatorId = req.user?.staff?.id as string;
    return CourseService.createCourse(body, creatorId);
  }

  @Get("/all")
  @Middlewares(loggerMiddleware)
  public getAllCourses(@Query() searchq?: string) {
    return CourseService.getAllCourses(searchq);
  }

  @Put("/{id}")
  @Security("jwt")
  @Middlewares(
    upload.single("coverIcon"),
    appendCoverIconPhoto,
    checkRole(roles.STAFF, roles.SUPERVISOR, roles.TRAINER, roles.ADMIN),
  )
  public updateCourse(@Path() id: string, @Body() body: CreateCourseDto) {
    return CourseService.updateCourse(id, body);
  }

  @Delete("/{id}")
  @Security("jwt")
  @Middlewares(
    checkRole(roles.STAFF, roles.SUPERVISOR, roles.TRAINER, roles.ADMIN),
  )
  public deleteCourse(@Path() id: string) {
    return CourseService.deleteCourse(id);
  }

  @Get("/")
  @Middlewares(loggerMiddleware)
  public getCourses(
    @Query() searchq?: string,
    @Query() limit?: number,
    @Query() page?: number,
    @Query() isPublished?: boolean,
  ) {
    return CourseService.getCourses(searchq, limit, page, isPublished);
  }

  @Get("/{id}")
  @Middlewares(loggerMiddleware)
  public getCourse(@Path() id: string) {
    return CourseService.getCourseById(id);
  }

  @Post("/super")
  @Security("jwt")
  @Middlewares(
    checkRole(roles.STAFF, roles.SUPERVISOR, roles.TRAINER, roles.ADMIN),
  )
  public async createSuperCourse(
    @Body() body: CreateSuperCourseDto,
    @Request() req: ExpressRequest,
  ) {
    const creatorId = req.user?.staff?.id as string;
    return CourseService.createSuperCourse(body, creatorId);
  }

  @Put("/super/{courseId}")
  @Security("jwt")
  @Middlewares(
    checkRole(roles.STAFF, roles.SUPERVISOR, roles.TRAINER, roles.ADMIN),
  )
  public async updateSuperCourse(
    @Path() courseId: string,
    @Body() body: CreateSuperCourseDto,
    @Request() req: ExpressRequest,
  ) {
    const creatorId = req.user?.staff?.id as string;
    const updateData: UpdateSuperCourseDto = { ...body, courseId };
    return CourseService.updateSuperCourse(updateData, creatorId);
  }
}
