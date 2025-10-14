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
  params: () => ({
    public_id: v4(),
    folder: "chw",
  }),
});

const upload = multer({ storage: storage });
export default upload;
