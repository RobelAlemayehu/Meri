import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "./asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  }

  if (!token) {
    throw new AppError("Not authorized, no token", 401);
  }

  if (!process.env.JWT_SECRET) {
    throw new AppError("Server misconfiguration: JWT_SECRET missing", 500);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) {
      throw new AppError("Not authorized", 401);
    }
    if (!admin.role) admin.role = "admin";
    req.admin = admin;
    next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Not authorized, invalid token", 401);
  }
});
