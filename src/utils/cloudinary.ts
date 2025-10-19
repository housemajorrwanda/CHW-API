import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import { v4 } from "uuid";
import { appEnv } from "../config/env";

cloudinary.config({
  api_key: appEnv.cloudinaryApiKey,
  api_secret: appEnv.cloudinaryApiSecret,
  cloud_name: appEnv.cloudName,
});
const storage = new CloudinaryStorage({
  // multer-storage-cloudinary expects older cloudinary types; cast to any to avoid TS type mismatch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cloudinary: cloudinary as any,
  params: (req, file) => {
    // Determine resource type based on file mimetype
    let resourceType = "auto"; // let Cloudinary auto-detect for better compatibility
    let publicId = v4();

    if (file.mimetype.startsWith("video/")) {
      resourceType = "video";
    } else if (file.mimetype === "application/pdf") {
      // Keep PDFs as auto-detect but preserve extension for proper URLs
      resourceType = "auto";
      // Use UUID with .pdf extension (don't use original filename to avoid double extensions)
      publicId = `${v4()}.pdf`;
    } else if (
      file.mimetype.startsWith(
        "application/vnd.openxmlformats-officedocument.wordprocessingml",
      ) ||
      file.mimetype.startsWith(
        "application/vnd.openxmlformats-officedocument.presentationml",
      )
    ) {
      // Handle DOCX and PPTX files
      resourceType = "auto";
      const extension = file.originalname.split(".").pop() || "docx";
      publicId = `${v4()}.${extension}`;
    }

    return {
      public_id: publicId,
      folder: "chw",
      resource_type: resourceType,
    };
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});
export default upload;
