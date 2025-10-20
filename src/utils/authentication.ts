/* eslint-disable no-async-promise-executor */
import type * as express from "express";
import { prisma } from "./client";
import AppError from "./error";
import type { TUser } from "./interfaces/common";
import { verifyToken } from "./jwt";

export const expressAuthentication = (
  request: express.Request,
  securityName: string,
) => {
  if (securityName === "jwt") {
    const token = request.headers["authorization"] as string;

    return new Promise(async (resolve, reject) => {
      try {
        if (!token) {
          reject(new AppError("No token provided", 401));
          return;
        }

        const decoded = (await verifyToken(token)) as
          | string
          | { email?: string; id?: string; userRoles?: string[] };

        if (typeof decoded === "string") {
          // Old format - token is just the email string
          const email = decoded;
          const user = await prisma.user.findFirst({
            where: { email },
            include: {
              userRoles: true,
              staff: true,
              student: true,
            },
          });

          if (!user) {
            reject(new AppError("User not found", 404));
            return;
          }

          request.user = user as unknown as TUser;
          resolve(user);
        } else {
          // New format - token is an object
          if (decoded.id) {
            // New format - token contains user ID - prioritize ID lookup
            const user = await prisma.user.findUnique({
              where: { id: decoded.id },
              include: {
                userRoles: true,
                staff: true,
                student: true,
              },
            });

            if (!user) {
              reject(new AppError("User not found", 404));
              return;
            }

            request.user = user as unknown as TUser;
            resolve(user);
          } else if (decoded.email) {
            // Fallback to email lookup if no ID is present
            const user = await prisma.user.findFirst({
              where: { email: decoded.email },
              include: {
                userRoles: true,
                staff: true,
                student: true,
              },
            });

            if (!user) {
              reject(new AppError("User not found", 404));
              return;
            }

            request.user = user as unknown as TUser;
            resolve(user);
          } else {
            reject(new AppError("Invalid token format", 401));
            return;
          }
        }
      } catch (error) {
        reject(new AppError("Not Authorized", 403));
      }
    });
  }
};
