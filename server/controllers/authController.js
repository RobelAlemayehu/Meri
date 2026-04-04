import Admin from "../models/Admin.js";
import Compound from "../models/Compound.js";
import { generateToken } from "../utils/generateToken.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

function adminJson(admin) {
  const role = admin.role || "admin";
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role,
  };
}

async function managedCompoundSummary(adminId) {
  const compound = await Compound.findOne({
    $or: [
      { assignedAdmin: adminId },
      {
        createdBy: adminId,
        $or: [{ assignedAdmin: null }, { assignedAdmin: { $exists: false } }],
      },
    ],
  })
    .select("name")
    .lean();

  if (!compound) return null;
  return { id: compound._id, name: compound.name };
}

export const registerAdmin = asyncHandler(async (req, res) => {
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
  });

  const token = generateToken(admin._id);

  res.status(201).json({
    token,
    admin: adminJson(admin),
  });
});

export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    throw new AppError("Please provide email and password", 400);
  }

  const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
  if (!admin) throw new AppError("Invalid email or password", 401);

  const ok = await admin.comparePassword(password);
  if (!ok) throw new AppError("Invalid email or password", 401);

  const token = generateToken(admin._id);

  res.json({
    token,
    admin: adminJson(admin),
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const role = req.admin.role || "admin";
  let managedCompound = null;
  if (role === "admin") {
    managedCompound = await managedCompoundSummary(req.admin._id);
  }

  res.json({
    admin: {
      ...adminJson(req.admin),
      managedCompound,
    },
  });
});
