import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import SuperadminApplication from "../models/SuperadminApplication.js";
import Admin from "../models/Admin.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { generateToken } from "../utils/generateToken.js";
import { sendSuperadminInviteEmail, sendSuperadminRejectionEmail } from "../services/emailService.js";

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

  // Clean up any expired approved records for this email so they don't block resubmission
  await SuperadminApplication.deleteMany({
    email: emailNorm,
    status: "approved",
    inviteExpiresAt: { $lte: new Date() },
  });

  const pending = await SuperadminApplication.findOne({
    email: emailNorm,
    status: "pending",
  });
  if (pending) {
    throw new AppError("You already have a pending application with this email", 400);
  }

  // If a previous submission already generated a token, resend it instead of blocking
  const openInvite = await SuperadminApplication.findOne({
    email: emailNorm,
    status: "approved",
    inviteExpiresAt: { $gt: new Date() },
  });
  if (openInvite) {
    const clientUrl = (process.env.CLIENT_URL || "https://meri-ten.vercel.app").replace(/\/$/, "");
    const registrationLink = `${clientUrl}/superadmin/register-invite?token=${openInvite.inviteToken}`;
    const emailResult = await sendSuperadminInviteEmail({
      to: emailNorm,
      fullName: openInvite.fullName,
      organizationName: openInvite.organizationName,
      registrationLink,
      inviteToken: openInvite.inviteToken,
    }).catch((err) => ({ sent: false, error: err.message }));
    return res.status(200).json({
      message: emailResult.sent
        ? "A registration link has already been issued and was resent to your email."
        : `A registration link was already issued. Check your spam folder or use this token to register: ${openInvite.inviteToken}`,
      id: openInvite._id,
    });
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

  // Auto-approve: generate invite token immediately and email the applicant
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const days = Number(process.env.SUPERADMIN_INVITE_EXPIRY_DAYS) || 14;
  appDoc.status = "approved";
  appDoc.inviteToken = inviteToken;
  appDoc.inviteExpiresAt = new Date(Date.now() + days * 864e5);
  appDoc.reviewedAt = new Date();

  await appDoc.save();

  const clientUrl = (process.env.CLIENT_URL || "https://meri-ten.vercel.app").replace(/\/$/, "");
  const registrationLink = `${clientUrl}/superadmin/register-invite?token=${inviteToken}`;

  const emailResult = await sendSuperadminInviteEmail({
    to: emailNorm,
    fullName: fullName.trim(),
    organizationName: organizationName.trim(),
    registrationLink,
    inviteToken,
  }).catch((err) => ({ sent: false, error: err.message }));

  if (!emailResult.sent) {
    console.error("[email] Failed to send invite:", emailResult.error || "SMTP not configured");
  }

  res.status(201).json({
    message: emailResult.sent
      ? "Application received! A registration link has been sent to your email."
      : "Application received! Email delivery is not configured — use the registration link below.",
    id: appDoc._id,
    token: inviteToken,
    registrationLink,
    emailSent: emailResult.sent,
  });
});

export const inviteInfo = asyncHandler(async (req, res) => {
  const token = req.query.token?.trim().replace(/\s+/g, "");
  if (!token) {
    throw new AppError("Token is required", 400);
  }

  // First try: exact match with status approved and not expired
  let appDoc = await SuperadminApplication.findOne({
    inviteToken: token,
    status: "approved",
    inviteExpiresAt: { $gt: new Date() },
  }).select("fullName email organizationName inviteExpiresAt");

  // Second try: token matches but maybe status is still pending (race condition)
  if (!appDoc) {
    appDoc = await SuperadminApplication.findOne({
      inviteToken: token,
      inviteExpiresAt: { $gt: new Date() },
    }).select("fullName email organizationName inviteExpiresAt status");

    if (appDoc && appDoc.status !== "approved") {
      throw new AppError(`Invitation status is "${appDoc.status}" — cannot register.`, 400);
    }
  }

  if (!appDoc) {
    // Help debug: check if token exists at all (expired or wrong status)
    const anyMatch = await SuperadminApplication.findOne({ inviteToken: token }).select("status inviteExpiresAt").lean();
    if (anyMatch) {
      const expired = anyMatch.inviteExpiresAt && anyMatch.inviteExpiresAt < new Date();
      throw new AppError(
        expired ? "This invitation link has expired. Please submit a new application." : `Invitation status is "${anyMatch.status}" — already registered or rejected.`,
        400
      );
    }
    throw new AppError("Invalid invitation token. Make sure you copied the full link from the email.", 400);
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
  const cleanToken = token?.trim().replace(/\s+/g, "");

  if (!cleanToken || !password) {
    throw new AppError("Token and password are required", 400);
  }
  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const appDoc = await SuperadminApplication.findOne({
    inviteToken: cleanToken,
    status: "approved",
    inviteExpiresAt: { $gt: new Date() },
  });

  if (!appDoc) {
    const anyMatch = await SuperadminApplication.findOne({ inviteToken: cleanToken }).select("status inviteExpiresAt").lean();
    if (anyMatch) {
      const expired = anyMatch.inviteExpiresAt && anyMatch.inviteExpiresAt < new Date();
      throw new AppError(
        expired ? "This invitation has expired. Please submit a new application." : `Cannot register — invitation status is "${anyMatch.status}".`,
        400
      );
    }
    throw new AppError("Invalid invitation token. Make sure you copied the full token from the email.", 400);
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

  const clientUrl = (process.env.CLIENT_URL || "https://meri-ten.vercel.app").replace(/\/$/, "");
  const registrationLink = `${clientUrl}/superadmin/register-invite?token=${inviteToken}`;

  await sendSuperadminInviteEmail({
    to: appDoc.email,
    fullName: appDoc.fullName,
    organizationName: appDoc.organizationName,
    registrationLink,
    inviteToken,
  });

  res.json({
    message: "Approved. A registration link has been sent to the applicant's email.",
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

  await sendSuperadminRejectionEmail({
    to: appDoc.email,
    fullName: appDoc.fullName,
    organizationName: appDoc.organizationName,
    reason: reason?.trim() || "",
  });

  res.json({ message: "Application rejected and email sent to applicant." });
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
