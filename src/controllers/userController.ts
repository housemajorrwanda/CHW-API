/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Body,
  Get,
  Middlewares,
  Post,
  Put,
  Route,
  Security,
  Tags,
  Path,
  Delete,
  Request,
} from "tsoa";
import { UserService } from "../services/userService";
import type {
  ILoginUser,
  IPaged,
  ISignUpUser,
  IUserResponse,
  CreateUserDto,
  UpdateProfileDto,
  IPasswordLogin,
} from "../utils/interfaces/common";
import { loggerMiddleware } from "../utils/loggers/loggingMiddleware";
import { Request as ExpressRequest } from "express";
import { appendPhoto, appendSinglePhoto } from "../middlewares";
import upload from "../utils/cloudinary";

@Tags("Authentication")
@Route("/api/auth")
export class UserController {
  @Get("/users")
  @Middlewares(loggerMiddleware)
  public getUser(
    @Request() req: ExpressRequest,
  ): Promise<IPaged<IUserResponse[]>> {
    const { searchq, limit, page } = req.query;
    const currentPage = page ? parseInt(page as string) : undefined;
    return UserService.getUsers(
      searchq as string | undefined,
      limit ? parseInt(limit as string) : undefined,
      currentPage,
    );
  }

  @Get("/staffs")
  @Middlewares(loggerMiddleware)
  public getStaffs(@Request() req: ExpressRequest) {
    const { searchq, limit, page } = req.query;
    const currentPage = page ? parseInt(page as string) : undefined;
    return UserService.getStaffs(
      searchq as string | undefined,
      limit ? parseInt(limit as string) : undefined,
      currentPage,
    );
  }

  @Get("/staffs/{id}")
  @Middlewares(loggerMiddleware)
  public getStaffById(@Path() id: string) {
    return UserService.getStaffById(id);
  }

  @Get("/students")
  @Middlewares(loggerMiddleware)
  public getStudents(@Request() req: ExpressRequest) {
    const { searchq, limit, page } = req.query;
    const currentPage = page ? parseInt(page as string) : undefined;
    return UserService.getStudents(
      searchq as string | undefined,
      limit ? parseInt(limit as string) : undefined,
      currentPage,
    );
  }

  @Get("/students/{id}")
  @Middlewares(loggerMiddleware)
  public getStudentById(@Path() id: string) {
    return UserService.getStudentById(id);
  }

  //delete user
  @Delete("/delete/{id}")
  @Security("jwt")
  @Middlewares(loggerMiddleware)
  public deleteUser(@Path() id: string) {
    return UserService.deleteUser(id);
  }

  @Put("/update-password")
  @Security("jwt")
  public async updatePassword(
    @Request() req: ExpressRequest,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = body;
    return UserService.updatePassword(userId, currentPassword, newPassword);
  }

  @Post("/request-password-reset")
  public async requestPasswordReset(@Body() body: { email: string }) {
    const { email } = body;
    return UserService.requestPasswordReset(email);
  }

  @Post("/reset-password")
  public async resetPassword(
    @Body() body: { email: string; otp: string; newPassword: string },
  ) {
    const { email, otp, newPassword } = body;
    return UserService.resetPassword(email, otp, newPassword);
  }

  @Post("/verify-login")
  public verifyLogin(@Body() body: { phoneNumber: string; otp: string }) {
    const { phoneNumber, otp } = body;
    return UserService.verifyLogin(phoneNumber, otp);
  }

  @Post("/signin/student")
  public studentSignIn(@Body() user: ILoginUser) {
    return UserService.studentLogin(user);
  }

  @Post("/signin/staff")
  public staffSignIn(@Body() body: IPasswordLogin) {
    return UserService.staffLogin(body);
  }

  //user signup
  @Post("/signup")
  @Middlewares(upload.any(), appendPhoto)
  public async signup(@Body() user: ISignUpUser) {
    return UserService.signUpUser(user);
  }

  @Post("/create")
  @Middlewares(upload.any(), appendPhoto)
  public async createUser(@Body() user: CreateUserDto) {
    return UserService.createUser(user);
  }

  @Put("/update/{id}")
  @Middlewares(upload.any(), appendPhoto)
  @Security("jwt")
  public async updateUser(@Path() id: string, @Body() user: CreateUserDto) {
    return UserService.updateUser(id, user);
  }

  @Get("/me")
  @Security("jwt")
  @Middlewares(loggerMiddleware)
  public getMe(@Request() req: ExpressRequest) {
    return UserService.getMe(req);
  }

  @Get("/profile")
  @Security("jwt")
  @Middlewares(loggerMiddleware)
  public getProfile(@Request() req: ExpressRequest) {
    return UserService.getProfile(req);
  }

  @Put("/profile")
  @Security("jwt")
  @Middlewares(upload.any(), appendPhoto, loggerMiddleware)
  public async updateProfile(
    @Request() req: ExpressRequest,
    @Body() profileData: UpdateProfileDto,
  ) {
    return UserService.updateProfile(req, profileData);
  }

  @Put("/profile/avatar")
  @Security("jwt")
  @Middlewares(upload.single("photo"), appendSinglePhoto, loggerMiddleware)
  public async updateAvatar(@Request() req: ExpressRequest) {
    return UserService.updateAvatar(req, req.body.photo);
  }

  @Delete("/profile/avatar")
  @Security("jwt")
  @Middlewares(loggerMiddleware)
  public async deleteAvatar(@Request() req: ExpressRequest) {
    return UserService.deleteAvatar(req);
  }

  @Get("/validate-token")
  @Security("jwt")
  @Middlewares(loggerMiddleware)
  public validateToken(@Request() req: ExpressRequest) {
    return UserService.validateToken(req);
  }
}
