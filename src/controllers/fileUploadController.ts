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
    let fileInfo: { mimetype: string; originalname: string } | null = null;

    try {
      if (!req.file) {
        return {
          statusCode: 400,
          message: "No file provided",
          data: null as any,
        };
      }

      const file = req.file;
      fileInfo = { mimetype: file.mimetype, originalname: file.originalname };

      // Log file size for debugging
      console.log(`File upload attempt:`, {
        originalName: file.originalname,
        size: file.size,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + "MB",
        mimetype: file.mimetype,
        fileType: file.mimetype.startsWith("video/")
          ? "Video"
          : file.mimetype.startsWith("image/")
            ? "Image"
            : file.mimetype.startsWith("application/")
              ? "Document"
              : "Other",
        cloudinaryLimit: "10MB (free plan)",
        multerLimit: "50MB (configured)",
      });

      // Check for supported video formats
      if (file.mimetype.startsWith("video/")) {
        const supportedVideoTypes = [
          "video/mp4",
          "video/avi",
          "video/mov",
          "video/wmv",
          "video/flv",
          "video/webm",
          "video/mkv",
        ];

        if (!supportedVideoTypes.includes(file.mimetype)) {
          console.log(`Unsupported video format: ${file.mimetype}`);
        }
      }

      return {
        statusCode: 200,
        message: `${file.mimetype.startsWith("video/") ? "Video" : "File"} uploaded successfully`,
        data: {
          url: file.path,
          publicId: file.filename,
          originalName: file.originalname,
          size: file.size,
          format: file.mimetype,
        },
      };
    } catch (error: any) {
      console.error("File upload error:", error);

      // Check if it's a Cloudinary file size error
      if (error.message && error.message.includes("File size too large")) {
        const sizeMatch = error.message.match(/Got (\d+)/);
        const maxMatch = error.message.match(/Maximum is (\d+)/);
        const actualSize = sizeMatch ? parseInt(sizeMatch[1]) : 0;
        const maxSize = maxMatch ? parseInt(maxMatch[1]) : 0;

        // Special message for videos
        if (fileInfo?.mimetype.startsWith("video/")) {
          return {
            statusCode: 400,
            message: `Video file too large: ${(actualSize / (1024 * 1024)).toFixed(2)}MB. Cloudinary free plan limit is ${(maxSize / (1024 * 1024)).toFixed(2)}MB for videos. Consider compressing the video or upgrading your Cloudinary plan.`,
            data: null as any,
          };
        }

        return {
          statusCode: 400,
          message: `File too large: ${(actualSize / (1024 * 1024)).toFixed(2)}MB. Cloudinary free plan limit is ${(maxSize / (1024 * 1024)).toFixed(2)}MB. Please use a smaller file or upgrade your Cloudinary plan.`,
          data: null as any,
        };
      }

      // Handle unsupported file type errors
      if (error.message && error.message.includes("Unsupported")) {
        return {
          statusCode: 400,
          message: `Unsupported file type: ${fileInfo?.originalname || "unknown"}. ${error.message}`,
          data: null as any,
        };
      }

      return {
        statusCode: 500,
        message: error?.message || "File upload failed",
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

      // Log file sizes for debugging
      console.log(`Multiple files upload attempt:`, {
        fileCount: files.length,
        files: files.map((file) => ({
          originalName: file.originalname,
          size: file.size,
          sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + "MB",
          mimetype: file.mimetype,
        })),
        totalSize:
          (
            files.reduce((sum, file) => sum + file.size, 0) /
            (1024 * 1024)
          ).toFixed(2) + "MB",
      });

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
    } catch (error: any) {
      console.error("Multiple files upload error:", error);

      // Check if it's a Cloudinary file size error
      if (error.message && error.message.includes("File size too large")) {
        const sizeMatch = error.message.match(/Got (\d+)/);
        const maxMatch = error.message.match(/Maximum is (\d+)/);
        const actualSize = sizeMatch ? parseInt(sizeMatch[1]) : 0;
        const maxSize = maxMatch ? parseInt(maxMatch[1]) : 0;

        return {
          statusCode: 400,
          message: `File too large: ${(actualSize / (1024 * 1024)).toFixed(2)}MB. Cloudinary free plan limit is ${(maxSize / (1024 * 1024)).toFixed(2)}MB. Please use smaller files or upgrade your Cloudinary plan.`,
          data: [],
        };
      }

      return {
        statusCode: 500,
        message: error?.message || "File upload failed",
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
    } catch (error: any) {
      console.error("Any files upload error:", error);
      return {
        statusCode: 500,
        message: error?.message || "File upload failed",
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
    } catch (error: any) {
      console.error("Image upload error:", error);
      return {
        statusCode: 500,
        message: error?.message || "Image upload failed",
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
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv",
      ];

      if (!allowedDocTypes.includes(file.mimetype)) {
        return {
          statusCode: 400,
          message: `File type not supported. Allowed types: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, CSV. Received: ${file.mimetype}`,
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
    } catch (error: any) {
      console.error("Document upload error:", error);
      return {
        statusCode: 500,
        message: error?.message || "Document upload failed",
        data: null as any,
      };
    }
  }
}
