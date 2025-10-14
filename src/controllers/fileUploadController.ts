/* eslint-disable @typescript-eslint/no-explicit-any */
import { Middlewares, Post, Request, Route, Tags, Security } from "tsoa";
import { Request as ExpressRequest } from "express";
import { checkRole } from "../middlewares";
import { roles } from "../utils/roles";
import upload from "../utils/cloudinary";

interface FileUploadResponse {
  statusCode: number;
  message: string;
  data: {
    url: string;
    publicId: string;
    originalName: string;
    size: number;
    format: string;
  } | null;
}

interface MultipleFileUploadResponse {
  statusCode: number;
  message: string;
  data: Array<{
    url: string;
    publicId: string;
    originalName: string;
    size: number;
    format: string;
    fieldName: string;
  }>;
}

@Route("/api/upload")
@Tags("File Upload")
export class FileUploadController {
  /**
   * Upload a single file to Cloudinary
   * @summary Upload single file
   */
  @Post("/single")
  @Security("jwt")
  @Middlewares(
    upload.single("file"),
    checkRole(
      roles.STAFF,
      roles.SUPERVISOR,
      roles.TRAINER,
      roles.ADMIN,
      roles.TRAINEE,
    ),
  )
  public async uploadSingleFile(
    @Request() req: ExpressRequest,
  ): Promise<FileUploadResponse> {
    try {
      if (!req.file) {
        return {
          statusCode: 400,
          message: "No file provided",
          data: null as any,
        };
      }

      const file = req.file;
      return {
        statusCode: 200,
        message: "File uploaded successfully",
        data: {
          url: file.path,
          publicId: file.filename,
          originalName: file.originalname,
          size: file.size,
          format: file.mimetype,
        },
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: "File upload failed",
        data: null as any,
      };
    }
  }

  /**
   * Upload multiple files to Cloudinary
   * @summary Upload multiple files
   */
  @Post("/multiple")
  @Security("jwt")
  @Middlewares(
    upload.array("files", 10), // Max 10 files
    checkRole(
      roles.STAFF,
      roles.SUPERVISOR,
      roles.TRAINER,
      roles.ADMIN,
      roles.TRAINEE,
    ),
  )
  public async uploadMultipleFiles(
    @Request() req: ExpressRequest,
  ): Promise<MultipleFileUploadResponse> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return {
          statusCode: 400,
          message: "No files provided",
          data: [],
        };
      }

      const files = req.files as Express.Multer.File[];
      const uploadResults = files.map((file) => ({
        url: file.path,
        publicId: file.filename,
        originalName: file.originalname,
        size: file.size,
        format: file.mimetype,
        fieldName: file.fieldname,
      }));

      return {
        statusCode: 200,
        message: `${files.length} files uploaded successfully`,
        data: uploadResults,
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: "File upload failed",
        data: [],
      };
    }
  }

  /**
   * Upload any files with dynamic field names (for complex forms)
   * @summary Upload files with any field names
   */
  @Post("/any")
  @Security("jwt")
  @Middlewares(
    upload.any(),
    checkRole(
      roles.STAFF,
      roles.SUPERVISOR,
      roles.TRAINER,
      roles.ADMIN,
      roles.TRAINEE,
    ),
  )
  public async uploadAnyFiles(
    @Request() req: ExpressRequest,
  ): Promise<MultipleFileUploadResponse> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return {
          statusCode: 400,
          message: "No files provided",
          data: [],
        };
      }

      const files = req.files as Express.Multer.File[];
      const uploadResults = files.map((file) => ({
        url: file.path,
        publicId: file.filename,
        originalName: file.originalname,
        size: file.size,
        format: file.mimetype,
        fieldName: file.fieldname,
      }));

      return {
        statusCode: 200,
        message: `${files.length} files uploaded successfully`,
        data: uploadResults,
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: "File upload failed",
        data: [],
      };
    }
  }

  /**
   * Upload image file specifically (with image validation)
   * @summary Upload image file
   */
  @Post("/image")
  @Security("jwt")
  @Middlewares(
    upload.single("image"),
    checkRole(
      roles.STAFF,
      roles.SUPERVISOR,
      roles.TRAINER,
      roles.ADMIN,
      roles.TRAINEE,
    ),
  )
  public async uploadImage(
    @Request() req: ExpressRequest,
  ): Promise<FileUploadResponse> {
    try {
      if (!req.file) {
        return {
          statusCode: 400,
          message: "No image file provided",
          data: null as any,
        };
      }

      const file = req.file;

      // Check if it's an image
      if (!file.mimetype.startsWith("image/")) {
        return {
          statusCode: 400,
          message: "File must be an image",
          data: null as any,
        };
      }

      return {
        statusCode: 200,
        message: "Image uploaded successfully",
        data: {
          url: file.path,
          publicId: file.filename,
          originalName: file.originalname,
          size: file.size,
          format: file.mimetype,
        },
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: "Image upload failed",
        data: null as any,
      };
    }
  }

  /**
   * Upload document file specifically (PDF, DOC, etc.)
   * @summary Upload document file
   */
  @Post("/document")
  @Security("jwt")
  @Middlewares(
    upload.single("document"),
    checkRole(
      roles.STAFF,
      roles.SUPERVISOR,
      roles.TRAINER,
      roles.ADMIN,
      roles.TRAINEE,
    ),
  )
  public async uploadDocument(
    @Request() req: ExpressRequest,
  ): Promise<FileUploadResponse> {
    try {
      if (!req.file) {
        return {
          statusCode: 400,
          message: "No document file provided",
          data: null as any,
        };
      }

      const file = req.file;

      // Check if it's a document
      const allowedDocTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
      ];

      if (!allowedDocTypes.includes(file.mimetype)) {
        return {
          statusCode: 400,
          message: "File must be a document (PDF, DOC, PPT, TXT)",
          data: null as any,
        };
      }

      return {
        statusCode: 200,
        message: "Document uploaded successfully",
        data: {
          url: file.path,
          publicId: file.filename,
          originalName: file.originalname,
          size: file.size,
          format: file.mimetype,
        },
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: "Document upload failed",
        data: null as any,
      };
    }
  }
}
