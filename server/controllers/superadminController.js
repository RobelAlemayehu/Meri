import Admin from "../models/Admin.js";
import Compound from "../models/Compound.js";
import { generateToken } from "../utils/generateToken.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendAdminCredentialsEmail } from "../services/emailService.js";

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
  const { name, email, password, compoundId } = req.body;

  if (!name?.trim() || !email?.trim() || !password) {
    throw new AppError("Name, email, and password are required", 400);
  }
  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const emailNorm = email.trim().toLowerCase();
  const existing = await Admin.findOne({ email: emailNorm });
  if (existing) throw new AppError("An admin with this email already exists", 400);

  const admin = await Admin.create({
    name: name.trim(),
    email: emailNorm,
    password,
    role: "admin",
    status: "active",
  });

  // Assign compound if provided
  let compoundName = "your assigned branch";
  if (compoundId) {
    const compound = await Compound.findById(compoundId);
    if (compound) {
      compound.assignedAdmin = admin._id;
      await compound.save();
      compoundName = compound.name;
    }
  }

  const loginUrl = `${(process.env.CLIENT_URL || "https://meri-ten.vercel.app").replace(/\/$/, "")}/staff/login`;

  const emailResult = await sendAdminCredentialsEmail({
    to: emailNorm,
    adminName: name.trim(),
    compoundName,
    invitedBy: req.admin.name,
    password,
    loginUrl,
  }).catch((err) => ({ sent: false, error: err.message }));

  if (!emailResult.sent) {
    console.error("[email] Failed to send admin credentials:", emailResult.error || "SMTP not configured");
  }

  res.status(201).json({
    message: emailResult.sent
      ? `Admin created and credentials sent to ${emailNorm}.`
      : `Admin created. Email failed — share credentials manually. Password: ${password}`,
    admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    emailSent: emailResult.sent,
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
