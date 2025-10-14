import {
  Body,
  Delete,
  Get,
  Middlewares,
  Path,
  Post,
  Put,
  Query,
  Route,
  Tags,
  Security,
} from "tsoa";
import { CreateAttempTestDto } from "../utils/interfaces/common";
import { AttemptTestService } from "../services/attemptTestService";
import { loggerMiddleware } from "../utils/loggers/loggingMiddleware";
import { checkRole } from "../middlewares";
import { roles } from "../utils/roles";

@Route("/api/attempts")
@Tags("Attempts")
export class AttemptTestController {
  @Post("/")
  @Security("jwt")
  @Middlewares(checkRole(roles.TRAINEE))
  public async createAttempt(@Body() body: CreateAttempTestDto) {
    return AttemptTestService.createAttempt(body);
  }

  @Get("/all")
  @Middlewares(loggerMiddleware)
  public async getAllAttempts(@Query() searchq?: string) {
    return AttemptTestService.getAllAttempts(searchq);
  }

  @Get("/")
  @Middlewares(loggerMiddleware)
  public async getAttempts(
    @Query() searchq?: string,
    @Query() limit?: number,
    @Query() page?: number,
  ) {
    return AttemptTestService.getAttempts(searchq, limit, page);
  }

  @Get("/{id}")
  @Middlewares(loggerMiddleware)
  public async getAttempt(@Path() id: string) {
    return AttemptTestService.getAttemptById(id);
  }

  @Put("/{id}")
  @Security("jwt")
  @Middlewares(
    checkRole(roles.STAFF, roles.SUPERVISOR, roles.TRAINER, roles.ADMIN),
  )
  public async updateAttempt(
    @Path() id: string,
    @Body() body: CreateAttempTestDto,
  ) {
    return AttemptTestService.updateAttempt(id, body);
  }

  @Delete("/{id}")
  @Security("jwt")
  @Middlewares(
    checkRole(roles.STAFF, roles.SUPERVISOR, roles.TRAINER, roles.ADMIN),
  )
  public async deleteAttempt(@Path() id: string) {
    return AttemptTestService.deleteAttempt(id);
  }
}
