/**
 * Walking routes via OSRM public demo (foot profile).
 * Set OSRM_BASE_URL to your own OSRM instance in production.
 * @see https://project-osrm.org/
 */

const DEFAULT_OSRM = "https://router.project-osrm.org";

export async function fetchFootRoute(lat1, lng1, lat2, lng2) {
  if (
    ![lat1, lng1, lat2, lng2].every(
      (n) => typeof n === "number" && Number.isFinite(n)
    )
  ) {
    throw new Error("invalid_coordinates");
  }

  const base = (process.env.OSRM_BASE_URL || DEFAULT_OSRM).replace(/\/$/, "");
  const path = `/route/v1/foot/${lng1},${lat1};${lng2},${lat2}`;
  const query = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
  });
  const url = `${base}${path}?${query}`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12_000);

  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(t);
  }

  if (!res.ok) {
    throw new Error(`osrm_http_${res.status}`);
  }

  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.[0]?.geometry) {
    throw new Error(data.message || "osrm_no_route");
  }

  const route = data.routes[0];
  const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

  return {
    coordinates: coords,
    distanceMeters: Math.round(route.distance * 10) / 10,
    durationSeconds: Math.round(route.duration),
  };
}
