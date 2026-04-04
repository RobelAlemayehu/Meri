import mongoose from "mongoose";
import multer from "multer";
import { AppError } from "../utils/AppError.js";

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err instanceof multer.MulterError) {
    const statusCode = 400;
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Each file must be 10 MB or smaller"
        : err.code === "LIMIT_FILE_COUNT"
          ? "Too many files (max 5)"
          : err.message || "Upload error";
    return res.status(statusCode).json({ message });
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || "Server Error";

  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = "Invalid ID format";
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    message = `${field} already exists`;
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    const first = Object.values(err.errors || {})[0];
    message = first?.message || message;
  }

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV !== "production" &&
      statusCode === 500 && { detail: err.message }),
  });
}
