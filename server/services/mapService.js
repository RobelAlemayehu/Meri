/**
 * Map data for the frontend (Leaflet runs in the browser only).
 * This module builds GeoJSON and default view options for L.map / L.tileLayer / L.geoJSON.
 */

const OSM_TILE_URL =
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * @param {object} compound 
 * @returns {object}
 */
export function compoundToLeafletPayload(compound) {
  const features = [];

  (compound.buildings || []).forEach((b, buildingIndex) => {
    const lat = b.latitude;
    const lng = b.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") return;

    const locationNames = [];
    for (const floor of b.floors || []) {
      for (const loc of floor.locations || []) {
        if (loc?.name) locationNames.push(loc.name);
      }
    }

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat],
      },
      properties: {
        buildingIndex,
        name: b.name,
        locationNames,
        locationCount: locationNames.length,
      },
    });
  });

  const geojson = {
    type: "FeatureCollection",
    features,
  };

  const leaflet = buildLeafletViewOptions(features);

  return {
    compoundId: String(compound._id),
    compoundName: compound.name,
    geojson,
    leaflet,
  };
}

function buildLeafletViewOptions(features) {
  const base = {
    tileLayer: {
      url: OSM_TILE_URL,
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    },
    center: [9.032, 38.7489],
    defaultZoom: 16,
  };

  if (features.length === 0) return base;

  if (features.length === 1) {
    const [lng, lat] = features[0].geometry.coordinates;
    return {
      ...base,
      center: [lat, lng],
      defaultZoom: 17,
    };
  }

  const lats = features.map((f) => f.geometry.coordinates[1]);
  const lngs = features.map((f) => f.geometry.coordinates[0]);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs);
  const lngMax = Math.max(...lngs);

  return {
    ...base,
    center: [(latMin + latMax) / 2, (lngMin + lngMax) / 2],
    defaultZoom: 15,
    bounds: [
      [latMin, lngMin],
      [latMax, lngMax],
    ],
  };
}
