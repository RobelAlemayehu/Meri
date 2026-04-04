import {
  haversineDistanceMeters,
  bearingDegrees,
  formatEtaSeconds,
  estimateWalkEtaSeconds,
} from "../utils/geo.js";
import { resolveDestinationByKey } from "./destinationService.js";

export function getNavConfig() {
  return {
    walkingSpeedMps: Number(process.env.NAV_WALKING_SPEED_MPS) || 1.4,
    /** SRS: ~10–20 m; default 20 m */
    arrivalRadiusM: Number(process.env.NAV_ARRIVAL_RADIUS_M) || 20,
  };
}


export function computeOutdoorProgress(compound, destinationKey, userLat, userLng) {
  const resolved = resolveDestinationByKey(compound, destinationKey);
  if (!resolved) {
    return { error: "invalid_destination" };
  }

  const { building, floor, location } = resolved;
  const destLat = building.latitude;
  const destLng = building.longitude;

  if (typeof destLat !== "number" || typeof destLng !== "number") {
    return { error: "building_missing_coordinates" };
  }

  if (typeof userLat !== "number" || typeof userLng !== "number") {
    return { error: "invalid_user_position" };
  }

  const { walkingSpeedMps, arrivalRadiusM } = getNavConfig();

  const distanceMeters = haversineDistanceMeters(
    userLat,
    userLng,
    destLat,
    destLng
  );

  const bearingDeg = bearingDegrees(userLat, userLng, destLat, destLng);
  const etaSeconds = estimateWalkEtaSeconds(distanceMeters, walkingSpeedMps);
  const arrived = distanceMeters <= arrivalRadiusM;

  const base = {
    distanceMeters: Math.round(distanceMeters * 10) / 10,
    bearingDeg: Math.round(bearingDeg * 10) / 10,
    etaSeconds,
    etaFormatted: arrived ? "Arrived" : formatEtaSeconds(etaSeconds),
    walkingSpeedMps,
    arrivalRadiusM,
    destination: {
      key: destinationKey,
      label: location.name,
      buildingName: building.name,
      floorNumber: floor.floorNumber,
      targetLatitude: destLat,
      targetLongitude: destLng,
    },
  };

  const buildingName = building.name;
  const guideOutdoor = `I've mapped the route to ${buildingName}. It's about ${formatEtaSeconds(etaSeconds)} on foot (${Math.round(distanceMeters)} m). Follow the line on the map.`;

  if (!arrived) {
    return {
      ...base,
      arrived: false,
      phase: "outdoor",
      mapActive: true,
      guidanceMessage: guideOutdoor,
      message: "Keep following the map toward the building.",
    };
  }

  const guideArrival = `You've reached ${buildingName}! When you're inside, use the guide below for step-by-step directions. ${location.name} is on floor ${floor.floorNumber}.`;

  return {
    ...base,
    arrived: true,
    phase: "indoor",
    mapActive: false,
    etaSeconds: 0,
    guidanceMessage: guideArrival,
    message:
      "You've reached the building. You can close the map and use the indoor guide.",
    chat: {
      compoundId: String(compound._id),
      destinationKey,
      indoorMode: true,
      suggestedFirstMessage: `I'm inside ${building.name}. How do I get to ${location.name}?`,
    },
  };
}
