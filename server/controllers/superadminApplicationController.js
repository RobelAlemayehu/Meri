import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import SuperadminApplication from "../models/SuperadminApplication.js";
import Admin from "../models/Admin.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { generateToken } from "../utils/generateToken.js";
import { sendSuperadminInviteEmail } from "../services/emailService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.join(__dirname, "..", "uploads", "applications");

function sanitizeFileName(name) {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.slice(0, 180) || "document";
}

export const submitApplication = asyncHandler(async (req, res) => {
  const { fullName, email, organizationName } = req.body;
  if (!fullName?.trim() || !email?.trim() || !organizationName?.trim()) {
    throw new AppError("Name, email, and organization name are required", 400);
  }

  const files = req.files || [];
  if (files.length === 0) {
    throw new AppError(
      "Please attach at least one legal document (PDF or image)",
      400
    );
  }

  const emailNorm = email.trim().toLowerCase();
  const existingAdmin = await Admin.findOne({ email: emailNorm });
  if (existingAdmin) {
    throw new AppError("An account already exists with this email", 400);
  }

  const pending = await SuperadminApplication.findOne({
    email: emailNorm,
    status: "pending",
  });
  if (pending) {
    throw new AppError("You already have a pending application with this email", 400);
  }

  const openInvite = await SuperadminApplication.findOne({
    email: emailNorm,
    status: "approved",
    inviteExpiresAt: { $gt: new Date() },
  });
  if (openInvite) {
    throw new AppError(
      "This email already has an approved invite. Check your email or complete registration.",
      400
    );
  }

  const appDoc = await SuperadminApplication.create({
    fullName: fullName.trim(),
    email: emailNorm,
    organizationName: organizationName.trim(),
    legalDocuments: [],
  });

  const dir = path.join(UPLOAD_ROOT, appDoc._id.toString());
  await fs.mkdir(dir, { recursive: true });

  const legalDocuments = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const storedName = `${Date.now()}_${i}_${sanitizeFileName(f.originalname)}`;
    await fs.writeFile(path.join(dir, storedName), f.buffer);
    legalDocuments.push({
      originalName: f.originalname,
      storedName,
      mimeType: f.mimetype,
      size: f.size,
    });
  }

  appDoc.legalDocuments = legalDocuments;
  await appDoc.save();

  res.status(201).json({
    message:
      "Application received. A superadmin will review it. If approved, you will get an email with a link and token to finish registration.",
    id: appDoc._id,
  });
});

export const inviteInfo = asyncHandler(async (req, res) => {
  const token = req.query.token?.trim();
  if (!token) {
    throw new AppError("Token is required", 400);
  }

  const appDoc = await SuperadminApplication.findOne({
    inviteToken: token,
    status: "approved",
    inviteExpiresAt: { $gt: new Date() },
  }).select("fullName email organizationName inviteExpiresAt");

  if (!appDoc) {
    throw new AppError("Invalid or expired invitation", 400);
  }

  res.json({
    fullName: appDoc.fullName,
    email: appDoc.email,
    organizationName: appDoc.organizationName,
    expiresAt: appDoc.inviteExpiresAt,
  });
});

export const completeInviteRegistration = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token?.trim() || !password) {
    throw new AppError("Token and password are required", 400);
  }
  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const appDoc = await SuperadminApplication.findOne({
    inviteToken: token.trim(),
    status: "approved",
    inviteExpiresAt: { $gt: new Date() },
  });

  if (!appDoc) {
    throw new AppError("Invalid or expired invitation", 400);
  }

  const existing = await Admin.findOne({ email: appDoc.email });
  if (existing) {
    throw new AppError("An account already exists with this email", 400);
  }

  const admin = await Admin.create({
    name: appDoc.fullName,
    email: appDoc.email,
    password,
    role: "superadmin",
  });

  appDoc.status = "registered";
  appDoc.inviteToken = null;
  appDoc.inviteExpiresAt = null;
  await appDoc.save();

  const authToken = generateToken(admin._id);
  res.status(201).json({
    token: authToken,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
});

export const listApplications = asyncHandler(async (req, res) => {
  const applications = await SuperadminApplication.find()
    .sort({ createdAt: -1 })
    .select("-inviteToken")
    .lean();

  res.json({ applications });
});

export const approveApplication = asyncHandler(async (req, res) => {
  const appDoc = await SuperadminApplication.findById(req.params.id);
  if (!appDoc || appDoc.status !== "pending") {
    throw new AppError("Application not found or already processed", 400);
  }

  const existing = await Admin.findOne({ email: appDoc.email });
  if (existing) {
    throw new AppError("An admin with this email already exists", 400);
  }

  const inviteToken = crypto.randomBytes(32).toString("hex");
  const days = Number(process.env.SUPERADMIN_INVITE_EXPIRY_DAYS) || 14;
  appDoc.status = "approved";
  appDoc.inviteToken = inviteToken;
  appDoc.inviteExpiresAt = new Date(Date.now() + days * 864e5);
  appDoc.reviewedAt = new Date();
  appDoc.reviewedBy = req.admin._id;
  appDoc.rejectionReason = "";
  await appDoc.save();

  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(
    /\/$/,
    ""
  );
  const registrationLink = `${clientUrl}/superadmin/register-invite?token=${inviteToken}`;

  await sendSuperadminInviteEmail({
    to: appDoc.email,
    fullName: appDoc.fullName,
    organizationName: appDoc.organizationName,
    registrationLink,
    inviteToken,
  });

  res.json({
    message:
      "Approved. A registration link and token were sent to the applicant by email (check server logs if SMTP is not configured).",
  });
});

export const rejectApplication = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const appDoc = await SuperadminApplication.findById(req.params.id);
  if (!appDoc || appDoc.status !== "pending") {
    throw new AppError("Application not found or already processed", 400);
  }

  appDoc.status = "rejected";
  appDoc.reviewedAt = new Date();
  appDoc.reviewedBy = req.admin._id;
  appDoc.rejectionReason = reason?.trim() || "";
  await appDoc.save();

  res.json({ message: "Application rejected." });
});

export const downloadApplicationFile = asyncHandler(async (req, res) => {
  const appDoc = await SuperadminApplication.findById(req.params.id);
  if (!appDoc) {
    throw new AppError("Application not found", 404);
  }

  const { storedName } = req.params;
  const doc = appDoc.legalDocuments.find((d) => d.storedName === storedName);
  if (!doc) {
    throw new AppError("File not found", 404);
  }

  const filePath = path.join(UPLOAD_ROOT, appDoc._id.toString(), storedName);
  const abs = path.resolve(filePath);

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(doc.originalName)}"`
  );
  res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
  res.sendFile(abs);
});
