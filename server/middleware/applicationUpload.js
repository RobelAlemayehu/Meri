import multer from "multer";
import { AppError } from "../utils/AppError.js";

const storage = multer.memoryStorage();

const allowedMime =
  /^application\/pdf$|^image\/(jpeg|png|gif|webp|heic|heif)$/i;

export const applicationUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (allowedMime.test(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(
      new AppError(
        "Only PDF and image files are allowed (max 5 files, 10 MB each)",
        400
      )
    );
  },
});
