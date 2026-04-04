import Compound from "../models/Compound.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { parseDestinationKey } from "../services/destinationService.js";
import { computeOutdoorProgress } from "../services/outdoorNavigationService.js";
import { fetchFootRoute } from "../services/osrmRouteService.js";

/**
 * Poll from the client with GPS (watchPosition or periodic getCurrentPosition).
 * Returns distance, ETA (straight-line walking estimate), bearing, and phase handoff to indoor chat.
 */
export const postOutdoorProgress = asyncHandler(async (req, res) => {
  const { compoundId, destinationKey, latitude, longitude } = req.body;

  if (!compoundId || !String(compoundId).trim()) {
    throw new AppError("compoundId is required", 400);
  }

  if (!destinationKey || !parseDestinationKey(destinationKey)) {
    throw new AppError(
      "destinationKey is required (format b0-f0-l0 from GET .../destinations)",
      400
    );
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new AppError("latitude and longitude must be valid numbers", 400);
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new AppError("latitude or longitude out of range", 400);
  }

  const compound = await Compound.findById(compoundId).lean();

  if (!compound) {
    throw new AppError("Compound not found", 404);
  }

  const result = computeOutdoorProgress(compound, destinationKey, lat, lng);

  if (result.error === "invalid_destination") {
    throw new AppError("Unknown destinationKey for this compound", 400);
  }

  if (result.error === "building_missing_coordinates") {
    throw new AppError(
      "Destination building has no GPS coordinates; admin must set latitude/longitude",
      422
    );
  }

  if (result.error === "invalid_user_position") {
    throw new AppError("Invalid user position", 400);
  }

  res.json(result);
});

/**
 * Walking route along paths (OSRM foot profile). Used for map polyline + route-based ETA.
 */
export const postOutdoorRoute = asyncHandler(async (req, res) => {
  const {
    latitude,
    longitude,
    destinationLatitude,
    destinationLongitude,
  } = req.body;

  const lat = Number(latitude);
  const lng = Number(longitude);
  const dLat = Number(destinationLatitude);
  const dLng = Number(destinationLongitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    !Number.isFinite(dLat) ||
    !Number.isFinite(dLng)
  ) {
    throw new AppError(
      "latitude, longitude, destinationLatitude, destinationLongitude must be valid numbers",
      400
    );
  }

  if (lat < -90 || lat > 90 || dLat < -90 || dLat > 90) {
    throw new AppError("latitude out of range", 400);
  }
  if (lng < -180 || lng > 180 || dLng < -180 || dLng > 180) {
    throw new AppError("longitude out of range", 400);
  }

  try {
    const route = await fetchFootRoute(lat, lng, dLat, dLng);
    res.json({
      source: "osrm",
      ...route,
    });
  } catch (err) {
    console.warn("OSRM route failed:", err.message || err);
    throw new AppError(
      "Could not compute a walking route (try again or use straight-line guidance).",
      502
    );
  }
});
