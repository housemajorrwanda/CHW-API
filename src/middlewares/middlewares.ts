import type { NextFunction } from "express";
import type { Request, Response } from "express";

export const appendPhotoAttachments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.files) {
      const files = req.files as Express.Multer.File[];

      // Handle thumbnail
      if (files.some((file) => file.fieldname === "thumbnail")) {
        req.body.thumbnail = files.find(
          (file) => file.fieldname === "thumbnail",
        )?.path;
      }

      // Handle galleryImages
      req.body.galleryImages = files
        .filter((file) => file.fieldname.startsWith("galleryImages"))
        .map((file) => file.path);

      // Ensure galleryImages is an array even if no files are uploaded
      if (!req.body.galleryImages) {
        req.body.galleryImages = [];
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const appendPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      // Ensure the photo field is correctly extracted
      const photoFile = files.find((file) => file.fieldname === "photo");
      if (photoFile) {
        req.body.photo = photoFile.path;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const appendSinglePhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.file) {
      req.body.photo = req.file.path;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const appendCoverIconPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.file) {
      req.body.coverIcon = req.file.path;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const appendFile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.file) {
      req.body.file = req.file.path;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const appendNIDAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      // Ensure the photo field is correctly extracted
      const idFile = files.find((file) => file.fieldname === "idAttachment");
      if (idFile) {
        req.body.idAttachment = idFile.path;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const appendImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.file) {
      req.body.image = req.file.path;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const appendQuestionImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.file) {
      req.body.questionImage = req.file.path;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const appendDocumentAttachments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      req.body.documents = files.map((file) => file.path);
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const appendShortListingAttachments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      req.body.studentCard = files.find(
        (file) => file.fieldname == "studentCard",
      )?.path;
      req.body.recommendationLetter = files.find(
        (file) => file.fieldname == "recommendationLetter",
      )?.path;
      req.body.insurance = files.find(
        (file) => file.fieldname == "insurance",
      )?.path;
      req.body.transcript = files.find(
        (file) => file.fieldname == "transcript",
      )?.path;
      req.body.nameTag = files.find(
        (file) => file.fieldname == "nameTag",
      )?.path;
      req.body.passportPhoto = files.find(
        (file) => file.fieldname == "passportPhoto",
      )?.path;
      req.body.birthCertificate = files.find(
        (file) => file.fieldname == "birthCertificate",
      )?.path;
      req.body.medicalReport = files.find(
        (file) => file.fieldname == "medicalReport",
      )?.path;
      req.body.academicCertificate = files.find(
        (file) => file.fieldname == "academicCertificate",
      )?.path;
      req.body.applicationForm = files.find(
        (file) => file.fieldname == "applicationForm",
      )?.path;
      req.body.idCard = files.find((file) => file.fieldname == "idCard")?.path;
      req.body.consentLetter = files.find(
        (file) => file.fieldname == "consentLetter",
      )?.path;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const appendGallery = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.file) {
      req.body.document = req.file.path;
    }
    next();
  } catch (error) {
    next(error);
  }
};
