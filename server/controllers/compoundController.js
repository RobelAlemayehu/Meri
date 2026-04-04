import Compound from "../models/Compound.js";
import { listDestinationsForCompound } from "../services/destinationService.js";
import { compoundToLeafletPayload } from "../services/mapService.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

function canManageCompound(admin, compound) {
  const role = admin.role || "admin";
  if (role === "superadmin") return true;
  if (
    compound.assignedAdmin &&
    compound.assignedAdmin.toString() === admin._id.toString()
  ) {
    return true;
  }
  if (
    !compound.assignedAdmin &&
    compound.createdBy.toString() === admin._id.toString()
  ) {
    return true;
  }
  return false;
}

export const getCompounds = asyncHandler(async (req, res) => {
  const compounds = await Compound.find()
    .select("name description buildings updatedAt")
    .sort({ name: 1 })
    .lean();

  res.json({ compounds });
});

/** Flat list of selectable destinations for dropdowns (user picks then starts outdoor nav). */
export const getCompoundDestinations = asyncHandler(async (req, res) => {
  const compound = await Compound.findById(req.params.id).lean();

  if (!compound) {
    throw new AppError("Compound not found", 404);
  }

  const destinations = listDestinationsForCompound(compound);

  res.json({
    compoundId: compound._id,
    compoundName: compound.name,
    destinations,
  });
});

/** GeoJSON + tile/center hints for Leaflet on the client */
export const getCompoundMapForLeaflet = asyncHandler(async (req, res) => {
  const compound = await Compound.findById(req.params.id).lean();

  if (!compound) {
    throw new AppError("Compound not found", 404);
  }

  res.json(compoundToLeafletPayload(compound));
});

export const getCompoundById = asyncHandler(async (req, res) => {
  const compound = await Compound.findById(req.params.id)
    .populate("createdBy", "name email role")
    .populate("assignedAdmin", "name email role")
    .lean();

  if (!compound) {
    throw new AppError("Compound not found", 404);
  }

  res.json(compound);
});

export const createCompound = asyncHandler(async (req, res) => {
  const { name, description, buildings, assignedAdminId } = req.body;

  if (!name?.trim()) {
    throw new AppError("Compound name is required", 400);
  }

  const compound = await Compound.create({
    name: name.trim(),
    description: description?.trim() || "",
    buildings: Array.isArray(buildings) ? buildings : [],
    createdBy: req.admin._id,
    assignedAdmin: assignedAdminId || null,
  });

  const populated = await Compound.findById(compound._id)
    .populate("createdBy", "name email role")
    .populate("assignedAdmin", "name email role")
    .lean();

  res.status(201).json(populated);
});

export const updateCompound = asyncHandler(async (req, res) => {
  const compound = await Compound.findById(req.params.id);

  if (!compound) {
    throw new AppError("Compound not found", 404);
  }

  if (!canManageCompound(req.admin, compound)) {
    throw new AppError("Not authorized to update this compound", 403);
  }

  const { name, description, buildings } = req.body;

  if (name !== undefined) {
    if (!String(name).trim()) {
      throw new AppError("Compound name cannot be empty", 400);
    }
    compound.name = String(name).trim();
  }
  if (description !== undefined) {
    compound.description = String(description).trim();
  }
  if (buildings !== undefined) {
    if (!Array.isArray(buildings)) {
      throw new AppError("buildings must be an array", 400);
    }
    compound.buildings = buildings;
  }

  await compound.save();

  const populated = await Compound.findById(compound._id)
    .populate("createdBy", "name email role")
    .populate("assignedAdmin", "name email role")
    .lean();

  res.json(populated);
});

export const deleteCompound = asyncHandler(async (req, res) => {
  const compound = await Compound.findById(req.params.id);

  if (!compound) {
    throw new AppError("Compound not found", 404);
  }

  if (!canManageCompound(req.admin, compound)) {
    throw new AppError("Not authorized to delete this compound", 403);
  }

  await compound.deleteOne();
  res.json({ message: "Compound removed" });
});

/** Branch admin: assigned (or legacy created) compound. Superadmin: all compounds. */
export const getMyCompounds = asyncHandler(async (req, res) => {
  const role = req.admin.role || "admin";

  if (role === "superadmin") {
    const compounds = await Compound.find()
      .populate("assignedAdmin", "name email")
      .sort({ updatedAt: -1 })
      .lean();
    return res.json({ compounds });
  }

  const compounds = await Compound.find({
    $or: [
      { assignedAdmin: req.admin._id },
      {
        createdBy: req.admin._id,
        $or: [{ assignedAdmin: null }, { assignedAdmin: { $exists: false } }],
      },
    ],
  })
    .sort({ updatedAt: -1 })
    .lean();

  res.json({ compounds });
});
