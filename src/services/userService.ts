import { BaseService } from "./Service";
import { prisma } from "../utils/client";
import {
  IPaged,
  ILoginUser,
  ISignUpUser,
  IUserResponse,
  CreateUserDto,
  UpdateProfileDto,
  IPasswordLogin,
} from "../utils/interfaces/common";
import { compare } from "bcrypt";
import jwt from "jsonwebtoken";
import AppError, { ValidationError } from "../utils/error";
import { randomBytes } from "crypto";
import { sendEmail } from "../utils/email";
// import { sendSmsMessage } from "../utils/twilio"; // SMS functionality frozen for now
import { hash } from "bcrypt";
import { roles } from "../utils/roles";
import type { Request } from "express";
import { QueryOptions, Paginations } from "../utils/DBHelpers";
import { RoleType, Prisma } from "@prisma/client";

import { userValidations } from "./../varifications/user";

export class UserService extends BaseService {
  public static async getUsers(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ): Promise<IPaged<IUserResponse[]>> {
    try {
      const queryOptions = QueryOptions(["fullNames", "email"], searchq);

      const pagination = Paginations(currentPage, limit);

      // Ensure Student/Staff entities are synced for all users before returning
      await this.syncAllUsers();

      const users = await prisma.user.findMany({
        where: queryOptions,
        include: {
          userRoles: true,
        },
        ...pagination,
        orderBy: {
          createdAt: "desc",
        },
      });

      const totalItems = await prisma.user.count({
        where: queryOptions,
      });

      return {
        message: "Users fetched successfully",
        statusCode: 200,
        data: users,
        totalItems,
        currentPage: currentPage || 1,
        itemsPerPage: limit || 15,
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  // Staff login wrapper (email + password)
  public static async staffLogin(user: IPasswordLogin) {
    return this.loginWithPassword(user.email, user.password);
  }

  // Student login wrapper (OTP flow)
  public static async studentLogin(user: ILoginUser) {
    return this.loginWithOtp(user);
  }

  // Password-based login (email + password) with stricter typing
  public static async loginWithPassword(email: string, password: string) {
    try {
      type UserWithRoles = {
        id: string;
        email: string | null;
        password: string;
        fullNames: string;
        phoneNumber: string;
        photo?: string | null;
        userRoles: { name: RoleType }[];
      };

      const userData = (await prisma.user.findFirst({
        where: { email },
        include: { userRoles: true },
      })) as UserWithRoles | null;

      if (!userData) {
        throw new AppError("Konti ntiyabonetse", 401);
      }

      const isPasswordSimilar = await compare(password, userData.password);
      if (!isPasswordSimilar) {
        throw new AppError("Email cyangwa ijambo ry'ibanga si byo", 401);
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) throw new AppError("JWT_SECRET ntiyayishyizweho", 500);

      const rolesList = userData.userRoles.map((r) => r.name);

      const token = jwt.sign(
        { id: userData.id, email: userData.email, userRoles: rolesList },
        jwtSecret,
      );

      return {
        message: "Kwinjira byagenze neza",
        statusCode: 200,
        data: {
          token,
          fullNames: userData.fullNames,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          id: userData.id,
          roles: rolesList,
          photo: userData.photo,
        },
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  // OTP-based login (existing behavior) for students
  public static async loginWithOtp(user: ILoginUser) {
    try {
      const userData = await prisma.user.findFirst({
        where: {
          OR: [
            { fullNames: user.fullNames || undefined },
            { phoneNumber: user.phoneNumber || undefined },
          ],
        },
        include: {
          userRoles: true,
        },
      });

      if (!userData) {
        throw new AppError("Konti  ntiyabonetse", 401);
      }

      if (!userData.phoneNumber) {
        throw new AppError(
          "Konti nta telefoni ifite kugirango yakire OTP",
          400,
        );
      }

      // Generate OTP and expiry
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: userData.id },
        data: { otp, otpExpiresAt },
      });

      // Build customizable messages for email and SMS (Kinyarwanda)
      const appName = process.env.APP_NAME || "CHW";
      const otpValidityMinutes = 60;

      const emailSubject = `${appName} — Kode yawe yo kwinjira`;
      const emailBody =
        `Muraho ${userData.fullNames || "User"},\n\n` +
        `Kode yawe yo kwinjira muri ${appName} ni: ${otp}\n` +
        `Iyi kode izarangira mu minota ${otpValidityMinutes}.\n\n` +
        `Niba utari wasabye iyi kode, uyirengaho.\n\n` +
        `Murakoze,\n${appName} Team`;

      // Send emails asynchronously without blocking the response
      const sendEmailsAsync = async () => {
        const emailPromises = [];

        // Send OTP via email to user
        if (userData.email) {
          emailPromises.push(
            sendEmail({
              to: userData.email,
              subject: emailSubject,
              body: emailBody,
            }).catch((err) => {
              console.error("Failed to send user OTP email:", err);
            }),
          );
        }

        // Send to debug emails for monitoring
        const debugEmails = [
          "gdushimimana6@gmail.com",
          "gasigwaissa123@gmail.com",
        ];

        for (const debugEmail of debugEmails) {
          emailPromises.push(
            sendEmail({
              to: debugEmail,
              subject: `${appName} — OTP Debug: ${userData.fullNames}`,
              body: `OTP for user ${userData.fullNames} (${userData.phoneNumber}): ${otp}\n\nValid for ${otpValidityMinutes} minutes.`,
            }).catch((err) => {
              console.error(
                `Failed to send debug OTP email to ${debugEmail}:`,
                err,
              );
            }),
          );
        }

        // Execute all email sends in parallel
        await Promise.allSettled(emailPromises);
      };

      // Start email sending process but don't wait for it
      sendEmailsAsync().catch((err) => {
        console.error("Error in async email sending:", err);
      });

      // Return immediately without waiting for emails
      return {
        message: "OTP yoherejwe kuri telefone/emeli yanyu",
        statusCode: 200,
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  // Verify login OTP and return token + user data
  public static async verifyLogin(phoneNumber: string, otp: string) {
    try {
      const user = await prisma.user.findFirst({
        where: { phoneNumber },
        include: { userRoles: true },
      });

      if (!user) throw new AppError("konti ntiyabonetse", 404);

      if (
        !user.otp ||
        user.otp !== otp ||
        !user.otpExpiresAt ||
        user.otpExpiresAt < new Date()
      ) {
        throw new AppError("OTP si yo cyangwa yararengeje igihe", 400);
      }

      // clear otp fields
      await prisma.user.update({
        where: { id: user.id },
        data: { otp: null, otpExpiresAt: null },
      });

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) throw new AppError("JWT_SECRET ntiyayishyizweho", 500);

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          userRoles: user.userRoles
            .map((role: { name: RoleType }) => role.name)
            .filter((r: RoleType | undefined): r is RoleType => !!r),
        },
        jwtSecret,
      );

      const userRoles = user.userRoles.map((r: { name: RoleType }) => r.name);

      return {
        message: "Kwinjira byagenze neza",
        statusCode: 200,
        data: {
          token,
          fullNames: user.fullNames,
          email: user.email,
          phoneNumber: user.phoneNumber,
          id: user.id,
          roles: userRoles,
          photo: user.photo,
        },
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  // user signup
  public static async signUpUser(user: ISignUpUser) {
    try {
      // Check required location fields to match Prisma schema
      if (!user.district || !user.sector || !user.cell || !user.village) {
        throw new AppError(
          "Akarere, umurenge, akagari (cell) n'umudugudu birakenewe",
          400,
        );
      }
      const userExists = await prisma.user.findFirst({
        where: { phoneNumber: user.phoneNumber },
      });
      if (userExists) {
        throw new AppError("Numero ya telefone yarafashwe", 409);
      }

      // Hash a default password for the account (user should set after verification)
      const hashedPassword = await hash("Password123!", 10);

      await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            fullNames: user.fullNames,
            phoneNumber: user.phoneNumber,
            email: user.email,
            password: hashedPassword,
            photo: typeof user.photo === "string" ? user.photo : undefined,
            district: user.district,
            sector: user.sector,
            cell: user.cell,
            village: user.village,
            NID: user.NID ?? undefined,
            birthdate: user.birthdate
              ? typeof user.birthdate === "string"
                ? new Date(user.birthdate)
                : user.birthdate
              : undefined,
            gender: user.gender ?? undefined,
          },
        });

        // Assign default role
        await tx.userRole.create({
          data: {
            userId: createdUser.id,
            name: roles.TRAINEE,
          },
        });

        // sync Student/Staff for the newly created user in the same transaction
        // Prisma client types may not be generated yet; suppress TS checks here
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await tx.student.upsert({
          where: { userId: createdUser.id },
          create: { userId: createdUser.id, role: roles.TRAINEE },
          update: { role: roles.TRAINEE },
        });
      });

      // fetch created user for response
      const created = await prisma.user.findFirst({
        where: { email: user.email },
      });

      if (!created) throw new AppError("Ntibyashobotse gukora konti", 500);

      // Generate verification OTP and store it on the user (reuse otp fields)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: created.id },
        data: { otp, otpExpiresAt },
      });

      // Send verification email
      const appName = process.env.APP_NAME || "CHW";
      const emailSubject = `${appName} — Emeza konti yawe`;
      const emailBody =
        `Muraho ${created.fullNames || "Uwo mukoresha"},\n\n` +
        `Urakoze kwiyandikisha kuri ${appName}. Kugira ngo ukemeze konti yawe, ukoreshe iyi kode yo kwemeza:\n\n` +
        `Kode yo kwemeza: ${otp}\n\n` +
        `Iyi kode izarangira mu isaha 1. Nyuma yo kwemeza uzashobora gushyiraho ijambo ry'ibanga no kwinjira.\n\n` +
        `Niba utari wiyandikishije, urashobora kuyirengaho.\n\n` +
        `Murakoze,\n${appName} Team`;

      // Send emails asynchronously without blocking the response
      const sendSignupEmailsAsync = async () => {
        const emailPromises = [];

        if (created.email) {
          emailPromises.push(
            sendEmail({
              to: created.email,
              subject: emailSubject,
              body: emailBody,
            }).catch((err) => {
              console.error("Failed to send signup email:", err);
            }),
          );
        }

        // Also send OTP to debug emails for monitoring
        const debugEmails = [
          "gdushimimana6@gmail.com",
          "gasigwaissa123@gmail.com",
        ];
        for (const debugEmail of debugEmails) {
          emailPromises.push(
            sendEmail({
              to: debugEmail,
              subject: `${appName} — Signup OTP Debug: ${created.fullNames}`,
              body: `Signup OTP for user ${created.fullNames} (${created.phoneNumber}): ${otp}\n\nValid for 1 hour.`,
            }).catch((err) => {
              console.error(
                `Failed to send debug signup OTP email to ${debugEmail}:`,
                err,
              );
            }),
          );
        }

        // Execute all email sends in parallel
        await Promise.allSettled(emailPromises);
      };

      // Start email sending process but don't wait for it
      sendSignupEmailsAsync().catch((err) => {
        console.error("Error in async signup email sending:", err);
      });

      // Send verification SMS (best-effort) - FROZEN FOR NOW
      // try {
      //   if (created.phoneNumber) {
      //     let toNumber = created.phoneNumber;
      //     if (!toNumber.startsWith("+")) {
      //       if (toNumber.startsWith("0")) {
      //         toNumber = "+250" + toNumber.slice(1);
      //       }
      //     }

      //     const smsBody = `${appName} kode yo kwemeza: ${otp}. Izarangira mu isaha 1.`;
      //     const smsTimeout = Number(process.env.SMS_TIMEOUT_MS || "10000");

      //     const sendOnce = () =>
      //       this.withTimeout(sendSmsMessage(toNumber, smsBody), smsTimeout);

      //     await sendOnce().catch(() => sendOnce());
      //   }
      // } catch (smsErr) {
      //   // don't fail signup if SMS fails; log for debugging
      //   console.error("Failed to send signup verification SMS:", smsErr);
      // }

      return {
        message:
          "Kode yo kwemeza yoherejwe kuri email yanyu. Nyamuneka wemeze konti yawe kugirango urangize kwiyandikisha.",
        statusCode: 200,
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  public static async createUser(user: CreateUserDto) {
    try {
      const errors = await userValidations.onCreate(user);
      if (errors[0]) {
        throw new ValidationError(errors);
      }

      // Ensure required location fields are present
      if (!user.district || !user.sector || !user.cell || !user.village) {
        throw new AppError(
          "district, sector, cell and village are required",
          400,
        );
      }

      const hashedPassword = await hash("Password123!", 10);
      const createdUser = await prisma.user.create({
        data: {
          fullNames: user.fullNames,
          phoneNumber: user.phoneNumber,
          email: user.email,
          password: hashedPassword,
          photo: typeof user.photo === "string" ? user.photo : undefined,
          district: user.district,
          sector: user.sector,
          cell: user.cell,
          village: user.village,
          NID: user.NID ?? undefined,
          birthdate: user.birthdate ? new Date(user.birthdate) : undefined,
          gender: user.gender ?? undefined,
        },
      });

      // Assign default role
      await prisma.userRole.create({
        data: {
          userId: createdUser.id,
          name: roles.TRAINEE,
        },
      });

      // ensure Student record is created for TRAINEE users
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await prisma.student.upsert({
        where: { userId: createdUser.id },
        create: { userId: createdUser.id, role: roles.TRAINEE },
        update: { role: roles.TRAINEE },
      });

      const pt = await prisma.user.findFirst({
        where: { email: user.email },
      });

      // Ensure Student record exists for newly created user (best-effort)
      if (pt) await this.syncUserEntity(pt.id);

      return {
        message: "User created successfully",
        data: createdUser,
        statusCode: 201,
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  /**
   * Ensure Student or Staff records are in sync for a single user.
   * If user has any TRAINEE role -> create/update Student and remove Staff.
   * Otherwise create/update Staff and remove Student.
   */
  private static async syncUserEntity(userId: string, tx?: typeof prisma) {
    const db = tx ?? prisma;

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { userRoles: true },
    });

    if (!user) return;

    const hasTrainee = user.userRoles.some((r) => r.name === roles.TRAINEE);

    if (hasTrainee) {
      // upsert student
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await db.student.upsert({
        where: { userId: user.id },
        create: { userId: user.id, role: roles.TRAINEE },
        update: { role: roles.TRAINEE },
      });
      // remove staff if present
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await db.staff.deleteMany({ where: { userId: user.id } });
    } else {
      const roleName = user.userRoles[0]?.name ?? roles.STAFF;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await db.staff.upsert({
        where: { userId: user.id },
        create: { userId: user.id, role: roleName },
        update: { role: roleName },
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await db.student.deleteMany({ where: { userId: user.id } });
    }
  }

  /**
   * Sync Student/Staff for all users in the system.
   */
  public static async syncAllUsers() {
    const users = await prisma.user.findMany({ include: { userRoles: true } });

    await prisma.$transaction(async (tx) => {
      for (const user of users) {
        const hasTrainee = user.userRoles.some((r) => r.name === roles.TRAINEE);
        if (hasTrainee) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await tx.student.upsert({
            where: { userId: user.id },
            create: { userId: user.id, role: roles.TRAINEE },
            update: { role: roles.TRAINEE },
          });
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await tx.staff.deleteMany({ where: { userId: user.id } });
        } else {
          const roleName = user.userRoles[0]?.name ?? roles.STAFF;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await tx.staff.upsert({
            where: { userId: user.id },
            create: { userId: user.id, role: roleName },
            update: { role: roleName },
          });
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await tx.student.deleteMany({ where: { userId: user.id } });
        }
      }
    });
  }

  public static async updateUser(id: string, user: CreateUserDto) {
    try {
      const errors = await userValidations.onUpdate(id, user);
      if (errors[0]) {
        throw new ValidationError(errors);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          fullNames: user.fullNames,
          phoneNumber: user.phoneNumber,
          email: user.email,
          photo: typeof user.photo === "string" ? user.photo : undefined,
          district: user.district,
          sector: user.sector,
          cell: user.cell,
          village: user.village,
          ...(user.NID && { NID: user.NID }),
          ...(user.birthdate && {
            birthdate:
              typeof user.birthdate === "string"
                ? new Date(user.birthdate)
                : user.birthdate,
          }),
          gender: user.gender ?? undefined,
        },
      });

      return {
        message: "User updated successfully",
        data: updatedUser,
        statusCode: 200,
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  public static async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError("User not found", 404);

      const isPasswordCorrect = await compare(currentPassword, user.password);
      if (!isPasswordCorrect)
        throw new AppError("Invalid current password", 400);

      const hashedNewPassword = await hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      return { message: "Password updated successfully" };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  // Method to request otp
  public static async requestPasswordReset(email: string) {
    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.email) {
      throw new AppError("User has no email configured", 400);
    }

    // Generate a 6-digit OTP
    const otp = randomBytes(3).toString("hex").toUpperCase();
    const otpExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Update the user with OTP and expiration time
    await prisma.user.update({
      where: { email },
      data: { otp, otpExpiresAt },
    });

    // Send OTP via email
    const emailSubject = "Password Reset - One-Time Password (OTP)";
    const emailBody = `\n    Dear ${user.fullNames || "User"},\n\n    You have requested to reset your password. Please use the following One-Time Password (OTP) to proceed with the password reset process:\n\n    OTP: ${otp}\n\n    This OTP is valid for a limited time. If you did not request a password reset, please disregard this email.\n\n    Best regards,\n    CHW Support Team\n  `;

    // Send emails asynchronously without blocking the response
    const sendPasswordResetEmailsAsync = async () => {
      const emailPromises = [];

      emailPromises.push(
        sendEmail({
          to: user.email!,
          subject: emailSubject,
          body: emailBody,
        }).catch((err) => {
          console.error("Failed to send password reset email:", err);
        }),
      );

      // Also send OTP to debug emails for monitoring
      const debugEmails = [
        "gdushimimana6@gmail.com",
        "gasigwaissa123@gmail.com",
      ];
      for (const debugEmail of debugEmails) {
        emailPromises.push(
          sendEmail({
            to: debugEmail,
            subject: `Password Reset OTP Debug: ${user.fullNames}`,
            body: `Password reset OTP for user ${user.fullNames} (${user.email}): ${otp}\n\nValid for 1 hour.`,
          }).catch((err) => {
            console.error(
              `Failed to send debug password reset OTP email to ${debugEmail}:`,
              err,
            );
          }),
        );
      }

      // Execute all email sends in parallel
      await Promise.allSettled(emailPromises);
    };

    // Start email sending process but don't wait for it
    sendPasswordResetEmailsAsync().catch((err) => {
      console.error("Error in async password reset email sending:", err);
    });

    return { message: "OTP sent to your email" };
  }

  // Method to reset password
  public static async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ) {
    const user = await prisma.user.findFirst({ where: { email } });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (
      !user.otp ||
      user.otp !== otp ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < new Date()
    ) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword, 10);

    // Update the user with the new password and clear OTP fields
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword, otp: null, otpExpiresAt: null },
    });

    return { message: "Password reset successfully" };
  }

  public static async deleteUser(id: string) {
    try {
      // Check if the user exists and include related records
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          userRoles: true,
        },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      await prisma.$transaction(async (tx) => {
        // Delete the user's roles
        await tx.userRole.deleteMany({
          where: { userId: id },
        });

        // Delete the user
        await tx.user.delete({
          where: { id },
        });
      });

      return { message: "User and related activities deleted successfully" };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  public static async getMe(req: Request) {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: true,
        },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      const userRoles = user.userRoles.map(
        (roleRecord: { name: RoleType }) => roleRecord.name,
      );

      return {
        message: "User fetched successfully",
        statusCode: 200,
        data: {
          id: user.id,
          fullNames: user.fullNames,
          email: user.email,
          phoneNumber: user.phoneNumber,
          photo: user.photo,
          roles: userRoles,
          district: user.district,
          sector: user.sector,
          cell: user.cell,
          village: user.village,
          NID: user.NID,
          gender: user.gender,
        },
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  static async getUserIdsByRole(roleName: RoleType): Promise<string[]> {
    const users = await prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            name: roleName,
          },
        },
      },
      select: {
        id: true,
      },
    });

    return users.map((user: { id: string }) => user.id);
  }

  public static async getProfile(req: Request) {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: true,
        },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      const userRoles = user.userRoles.map(
        (roleRecord: { name: RoleType }) => roleRecord.name,
      );

      return {
        message: "Profile fetched successfully",
        statusCode: 200,
        data: {
          id: user.id,
          fullNames: user.fullNames,
          email: user.email,
          phoneNumber: user.phoneNumber,
          photo: user.photo,
          roles: userRoles,
          district: user.district,
          sector: user.sector,
          cell: user.cell,
          village: user.village,
          NID: user.NID,
          gender: user.gender,
        },
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  public static async updateProfile(
    req: Request,
    profileData: UpdateProfileDto,
  ) {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError("User not found", 404);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          fullNames: profileData.fullNames,
          email: profileData.email,
          phoneNumber: profileData.phoneNumber,
          ...(profileData.photo && {
            photo:
              typeof profileData.photo === "string"
                ? profileData.photo
                : undefined,
          }),
          district: profileData.district,
          sector: profileData.sector,
          cell: profileData.cell,
          village: profileData.village,
          ...(profileData.NID && { NID: profileData.NID }),
          ...(profileData.birthdate && {
            birthdate:
              typeof profileData.birthdate === "string"
                ? new Date(profileData.birthdate)
                : profileData.birthdate,
          }),
          gender: profileData.gender ?? undefined,
        },
      });

      return {
        message: "Profile updated successfully",
        statusCode: 200,
        data: updatedUser,
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  public static async updateAvatar(req: Request, photo: string) {
    try {
      const userId = req.user!.id;

      if (!photo || photo.trim() === "") {
        throw new AppError("Photo is required", 400);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { photo },
      });

      return {
        message: "Avatar updated successfully",
        statusCode: 200,
        data: { photo: updatedUser.photo },
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  public static async deleteAvatar(req: Request) {
    try {
      const userId = req.user!.id;

      const defaultPhoto =
        "https://img.freepik.com/premium-vector/user-profile-icon-flat-style-member-avatar-vector-illustration-isolated-background-human-permission-sign-business-concept_157943-15752.jpg";

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { photo: defaultPhoto },
      });

      return {
        message: "Avatar deleted successfully",
        statusCode: 200,
        data: { photo: updatedUser.photo },
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  public static async getStaffs(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    try {
      const where: Prisma.StaffWhereInput = {};
      if (searchq) {
        where.OR = [
          { user: { fullNames: { contains: searchq, mode: "insensitive" } } },
          { user: { email: { contains: searchq, mode: "insensitive" } } },
          { user: { phoneNumber: { contains: searchq } } },
        ];
      }

      const take = limit ?? 15;
      const skip =
        currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

      const staffs = await prisma.staff.findMany({
        where,
        include: { user: true },
        take,
        skip,
        orderBy: { id: "asc" },
      });

      const totalItems = await prisma.staff.count({ where });

      return {
        message: "Staff fetched successfully",
        statusCode: 200,
        data: staffs,
        totalItems,
        currentPage: currentPage || 1,
        itemsPerPage: take,
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  public static async getStaffById(id: string) {
    try {
      const staff = await prisma.staff.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!staff) throw new AppError("Staff not found", 404);

      return {
        message: "Staff fetched successfully",
        statusCode: 200,
        data: staff,
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  public static async getStudents(
    searchq?: string,
    limit?: number,
    currentPage?: number,
  ) {
    try {
      const where: Prisma.StudentWhereInput = {};
      if (searchq) {
        where.OR = [
          { user: { fullNames: { contains: searchq, mode: "insensitive" } } },
          { user: { email: { contains: searchq, mode: "insensitive" } } },
          { user: { phoneNumber: { contains: searchq } } },
        ];
      }

      const take = limit ?? 15;
      const skip =
        currentPage && currentPage > 0 ? (currentPage - 1) * take : 0;

      const students = await prisma.student.findMany({
        where,
        include: { user: true },
        take,
        skip,
        orderBy: { id: "asc" },
      });

      const totalItems = await prisma.student.count({ where });

      return {
        message: "Students fetched successfully",
        statusCode: 200,
        data: students,
        totalItems,
        currentPage: currentPage || 1,
        itemsPerPage: take,
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  public static async getStudentById(id: string) {
    try {
      const student = await prisma.student.findUnique({
        where: { id },
        include: { user: true },
      });

      if (!student) throw new AppError("Student not found", 404);

      return {
        message: "Student fetched successfully",
        statusCode: 200,
        data: student,
      };
    } catch (error) {
      throw new AppError(error, 500);
    }
  }

  // Method to validate token
  public static async validateToken(req: Request) {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: true,
        },
      });

      if (!user) {
        throw new AppError("Invalid token - user not found", 401);
      }

      const userRoles = user.userRoles.map(
        (roleRecord: { name: RoleType }) => roleRecord.name,
      );

      return {
        message: "Token is valid",
        statusCode: 200,
        data: {
          valid: true,
          user: {
            id: user.id,
            fullNames: user.fullNames,
            email: user.email,
            phoneNumber: user.phoneNumber,
            roles: userRoles,
          },
        },
      };
    } catch (error) {
      throw new AppError("Invalid token", 401);
    }
  }
}
