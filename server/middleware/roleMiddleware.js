import { AppError } from "../utils/AppError.js";

export function requireSuperadmin(req, res, next) {
  const role = req.admin?.role || "admin";
  if (role !== "superadmin") {
    return next(new AppError("Superadmin access required", 403));
  }
  next();
}

/** Branch admin or superadmin */
export function requireStaff(req, res, next) {
  const role = req.admin?.role || "admin";
  if (role !== "superadmin" && role !== "admin") {
    return next(new AppError("Not allowed", 403));
  }
  next();
}
