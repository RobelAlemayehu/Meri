import Admin from "../models/Admin.js";
import Compound from "../models/Compound.js";
import { generateToken } from "../utils/generateToken.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

/**
 * One-time (or keyed) bootstrap: create first superadmin when SUPERADMIN_SETUP_KEY matches.
 */
export const registerSuperadmin = asyncHandler(async (req, res) => {
  const key = req.headers["x-setup-key"];
  const expected = process.env.SUPERADMIN_SETUP_KEY;

  if (!expected) {
    throw new AppError(
      "SUPERADMIN_SETUP_KEY is not set on the server. Add it to .env to enable setup.",
      503
    );
  }

  if (!key || key !== expected) {
    throw new AppError("Invalid or missing X-Setup-Key header", 403);
  }

  const { name, email, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password) {
    throw new AppError("Please provide name, email, and password", 400);
  }

  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const admin = await Admin.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    role: "superadmin",
  });

  const token = generateToken(admin._id);

  res.status(201).json({
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
});

export const listSuperadminCompounds = asyncHandler(async (req, res) => {
  const compounds = await Compound.find()
    .populate("createdBy", "name email role")
    .populate("assignedAdmin", "name email role")
    .sort({ updatedAt: -1 })
    .lean();

  res.json({ compounds });
});

export const listBranchAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.find({ role: "admin" })
    .select("name email createdAt")
    .sort({ name: 1 })
    .lean();

  res.json({ admins });
});

export const createBranchAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password) {
    throw new AppError("Please provide name, email, and password", 400);
  }

  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const admin = await Admin.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    role: "admin",
  });

  res.status(201).json({
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
});

export const assignCompoundAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.body;

  if (!adminId) {
    throw new AppError("adminId is required", 400);
  }

  const branchAdmin = await Admin.findById(adminId);
  if (!branchAdmin || branchAdmin.role !== "admin") {
    throw new AppError("Invalid branch admin", 400);
  }

  const compound = await Compound.findById(req.params.id);
  if (!compound) {
    throw new AppError("Compound not found", 404);
  }

  compound.assignedAdmin = branchAdmin._id;
  await compound.save();

  const populated = await Compound.findById(compound._id)
    .populate("assignedAdmin", "name email")
    .populate("createdBy", "name email")
    .lean();

  res.json(populated);
});
