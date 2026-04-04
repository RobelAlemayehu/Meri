/**
 * Stable keys for dropdown + navigation: b{buildingIndex}-f{floorIndex}-l{locationIndex}
 * (floorIndex = index in building.floors[], not necessarily floorNumber).
 */

export function encodeDestinationKey(buildingIndex, floorIndex, locationIndex) {
  return `b${buildingIndex}-f${floorIndex}-l${locationIndex}`;
}

export function parseDestinationKey(key) {
  if (!key || typeof key !== "string") return null;
  const m = /^b(\d+)-f(\d+)-l(\d+)$/.exec(key.trim());
  if (!m) return null;
  return {
    buildingIndex: Number(m[1]),
    floorIndex: Number(m[2]),
    locationIndex: Number(m[3]),
  };
}

export function listDestinationsForCompound(compound) {
  const destinations = [];

  (compound.buildings || []).forEach((building, buildingIndex) => {
    const lat = building.latitude;
    const lng = building.longitude;

    (building.floors || []).forEach((floor, floorIndex) => {
      (floor.locations || []).forEach((location, locationIndex) => {
        if (!location?.name) return;

        const key = encodeDestinationKey(
          buildingIndex,
          floorIndex,
          locationIndex
        );

        destinations.push({
          key,
          label: location.name,
          subtitle: `${building.name} · Floor ${floor.floorNumber}`,
          buildingName: building.name,
          floorNumber: floor.floorNumber,
          locationType: location.type,
          latitude: typeof lat === "number" ? lat : null,
          longitude: typeof lng === "number" ? lng : null,
          buildingIndex,
          floorIndex,
          locationIndex,
        });
      });
    });
  });

  return destinations;
}

export function resolveDestinationByKey(compound, key) {
  const idx = parseDestinationKey(key);
  if (!idx) return null;

  const building = compound.buildings?.[idx.buildingIndex];
  if (!building) return null;

  const floor = building.floors?.[idx.floorIndex];
  if (!floor) return null;

  const location = floor.locations?.[idx.locationIndex];
  if (!location) return null;

  return {
    buildingIndex: idx.buildingIndex,
    floorIndex: idx.floorIndex,
    locationIndex: idx.locationIndex,
    building,
    floor,
    location,
  };
}
