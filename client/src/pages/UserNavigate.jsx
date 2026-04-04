import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../services/api";
import FloatingNavigationChat from "../components/FloatingNavigationChat";
import {
  ChevronRight,
  Map as MapIcon,
  Navigation,
  Footprints,
  Clock,
  Compass,
  Search,
  ChevronDown,
} from "lucide-react";
import { BRAND_NAME } from "../constants/brand";

function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

function parseDestKey(key) {
  const m = /^b(\d+)-f(\d+)-l(\d+)$/.exec(key || "");
  if (!m) return null;
  return {
    bi: Number(m[1]),
    fi: Number(m[2]),
    li: Number(m[3]),
  };
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function formatWalkDuration(totalSeconds) {
  const s = Math.round(totalSeconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

function bearingToCompass(deg) {
  if (deg == null || Number.isNaN(deg)) return null;
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = ((Math.round(deg / 45) % 8) + 8) % 8;
  return labels[i];
}

/** GeolocationPositionError codes: 1 denied, 2 unavailable, 3 timeout */
function formatGeolocationError(err) {
  if (!err || typeof err !== "object") {
    return String(err?.message || "Could not read your location.");
  }
  const code = err.code;
  const raw = (err.message || "").toLowerCase();
  if (code === 1) {
    return "Location access was denied. Allow location for this site in your browser settings, then tap Try again.";
  }
  if (code === 2) {
    return "Your position couldn’t be determined (weak GPS or no signal). Move outdoors or near a window, then tap Try again.";
  }
  if (code === 3 || raw.includes("timeout")) {
    return "GPS timed out before getting a fix (common indoors). Move near a window or outside, turn on Wi‑Fi to help approximate location, or tap Try again.";
  }
  return err.message || "Could not read your location.";
}

export default function UserNavigate() {
  const [compounds, setCompounds] = useState([]);
  const [compoundId, setCompoundId] = useState("");
  const [compoundSearch, setCompoundSearch] = useState("");
  const [compoundMenuOpen, setCompoundMenuOpen] = useState(false);
  const compoundPickerRef = useRef(null);
  const [destinations, setDestinations] = useState([]);
  const [destinationKey, setDestinationKey] = useState("");
  const [phase, setPhase] = useState("select");
  const [mapPkg, setMapPkg] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [geoError, setGeoError] = useState("");
  /** Bumped to restart geolocation watch after timeout / errors */
  const [geoRetryKey, setGeoRetryKey] = useState(0);
  const [progress, setProgress] = useState(null);
  /** OSRM walking path [[lat,lng], ...] for map; null = use straight line fallback */
  const [routePolyline, setRoutePolyline] = useState(null);
  /** { distanceMeters, durationSeconds } from OSRM when available */
  const [routeMeta, setRouteMeta] = useState(null);
  const [floorMapUrl, setFloorMapUrl] = useState(null);
  /** Bump when starting a new outdoor trip or “Start over” — resets floating chat without remounting. */
  const [navSession, setNavSession] = useState(0);
  const [guideBootstrap, setGuideBootstrap] = useState({ key: 0, text: null });
  const lastRouteSampleRef = useRef({ t: 0, lat: 0, lng: 0 });

  const destLat = progress?.destination?.targetLatitude;
  const destLng = progress?.destination?.targetLongitude;

  useEffect(() => {
    api
      .compounds()
      .then((r) => setCompounds(r.data.compounds || []))
      .catch(() => setCompounds([]));
  }, []);

  useEffect(() => {
    setGuideBootstrap({ key: 0, text: null });
  }, [compoundId]);

  const filteredCompounds = useMemo(() => {
    const q = compoundSearch.trim().toLowerCase();
    const list = !q
      ? compounds
      : compounds.filter((c) => c.name.toLowerCase().includes(q));
    return list.slice(0, 5);
  }, [compounds, compoundSearch]);

  useEffect(() => {
    if (!compoundId) return;
    const c = compounds.find((x) => x._id === compoundId);
    if (c) setCompoundSearch(c.name);
  }, [compoundId, compounds]);

  useEffect(() => {
    function handleDocClick(e) {
      if (!compoundPickerRef.current?.contains(e.target)) {
        setCompoundMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, []);

  function onCompoundSearchChange(e) {
    const v = e.target.value;
    setCompoundSearch(v);
    setCompoundMenuOpen(true);
    const selected = compounds.find((x) => x._id === compoundId);
    if (selected && v.trim() !== selected.name.trim()) {
      setCompoundId("");
    }
  }

  useEffect(() => {
    if (!compoundId) {
      setDestinations([]);
      setDestinationKey("");
      return;
    }
    api
      .destinations(compoundId)
      .then((r) => setDestinations(r.data.destinations || []))
      .catch(() => setDestinations([]));
  }, [compoundId]);

  const startWatch = useCallback(() => {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError("");
        setUserPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setGeoError(formatGeolocationError(err));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15_000,
        timeout: 45_000,
      }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [geoRetryKey]);

  useEffect(() => {
    if (phase !== "outdoor") return undefined;
    return startWatch();
  }, [phase, startWatch]);

  useEffect(() => {
    if (phase !== "outdoor" || !compoundId || !destinationKey || !userPos) {
      return undefined;
    }

    let cancelled = false;

    async function tick() {
      try {
        const { data } = await api.outdoorProgress({
          compoundId,
          destinationKey,
          latitude: userPos.lat,
          longitude: userPos.lng,
        });
        if (cancelled) return;
        setProgress(data);
        if (data.arrived) {
          setPhase("indoor");
          setGuideBootstrap({
            key: Date.now(),
            text:
              data.guidanceMessage ||
              data.message ||
              "You've arrived. Tap the chat button if it's closed — ask me for indoor directions.",
          });
        }
      } catch {
        /* ignore transient */
      }
    }

    tick();
    const t = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [phase, compoundId, destinationKey, userPos]);

  useEffect(() => {
    lastRouteSampleRef.current = { t: 0, lat: 0, lng: 0 };
  }, [destinationKey, navSession]);

  useEffect(() => {
    if (
      phase !== "outdoor" ||
      !userPos ||
      destLat == null ||
      destLng == null
    ) {
      return undefined;
    }

    let cancelled = false;

    async function tryFetch() {
      const now = Date.now();
      const prev = lastRouteSampleRef.current;
      const moved =
        prev.t === 0
          ? 9999
          : haversineMeters(userPos, { lat: prev.lat, lng: prev.lng });
      const tooSoon =
        prev.t > 0 && now - prev.t < 12_000 && moved < 40;
      if (tooSoon) return;

      lastRouteSampleRef.current = {
        t: now,
        lat: userPos.lat,
        lng: userPos.lng,
      };

      try {
        const { data } = await api.outdoorRoute({
          latitude: userPos.lat,
          longitude: userPos.lng,
          destinationLatitude: destLat,
          destinationLongitude: destLng,
        });
        if (cancelled) return;
        setRoutePolyline(data.coordinates?.length ? data.coordinates : null);
        setRouteMeta({
          distanceMeters: data.distanceMeters,
          durationSeconds: data.durationSeconds,
        });
      } catch {
        if (!cancelled) {
          setRoutePolyline(null);
          setRouteMeta(null);
        }
      }
    }

    const t0 = setTimeout(tryFetch, 500);
    const interval = setInterval(tryFetch, 14_000);
    return () => {
      cancelled = true;
      clearTimeout(t0);
      clearInterval(interval);
    };
  }, [phase, destLat, destLng, userPos?.lat, userPos?.lng]);

  useEffect(() => {
    if (phase !== "indoor" || !compoundId || !destinationKey) {
      setFloorMapUrl(null);
      return;
    }
    const idx = parseDestKey(destinationKey);
    if (!idx) return;
    api
      .compound(compoundId)
      .then(({ data }) => {
        const floor =
          data.buildings?.[idx.bi]?.floors?.[idx.fi];
        setFloorMapUrl(floor?.floorMapUrl || null);
      })
      .catch(() => setFloorMapUrl(null));
  }, [phase, compoundId, destinationKey]);

  const mapCenter = useMemo(() => {
    if (
      userPos &&
      destLat != null &&
      destLng != null &&
      Number.isFinite(destLat) &&
      Number.isFinite(destLng)
    ) {
      return [
        (userPos.lat + destLat) / 2,
        (userPos.lng + destLng) / 2,
      ];
    }
    if (mapPkg?.leaflet?.center) return mapPkg.leaflet.center;
    return [9.03, 38.75];
  }, [userPos, destLat, destLng, mapPkg]);

  const mapZoom = useMemo(() => {
    const d = progress?.distanceMeters;
    if (typeof d === "number" && d > 0) {
      if (d < 120) return 17;
      if (d < 350) return 16;
      if (d < 1200) return 15;
      return 14;
    }
    return mapPkg?.leaflet?.defaultZoom ?? 16;
  }, [progress?.distanceMeters, mapPkg]);

  async function handleStartOutdoor() {
    if (!compoundId || !destinationKey) return;
    const { data } = await api.mapPayload(compoundId);
    setMapPkg(data);
    setProgress(null);
    setRoutePolyline(null);
    setRouteMeta(null);
    setGuideBootstrap({ key: 0, text: null });
    setNavSession((s) => s + 1);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoError("");
          setUserPos({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          setGeoError(formatGeolocationError(err));
        },
        { enableHighAccuracy: true, maximumAge: 20_000, timeout: 35_000 }
      );
    }
    setPhase("outdoor");
  }

  const linePositions =
    userPos &&
    destLat != null &&
    destLng != null &&
    Number.isFinite(destLat) &&
    Number.isFinite(destLng)
      ? [
          [userPos.lat, userPos.lng],
          [destLat, destLng],
        ]
      : null;

  const polylinePositions =
    routePolyline && routePolyline.length > 1
      ? routePolyline
      : linePositions;

  const compoundLabel = compounds.find((c) => c._id === compoundId)?.name;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {BRAND_NAME} · Find your way
        </h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          Search and pick a compound (up to five matches), choose a destination,
          then use live map guidance. On large screens the assistant stays on the
          right; on phones use the{" "}
          <span className="font-medium text-[#0c1524]">blue chat button</span>.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:min-h-[calc(100vh-9rem)] lg:flex-row lg:items-stretch lg:gap-6">
        <div
          className={`min-w-0 flex-1 ${
            phase === "outdoor"
              ? "flex min-h-0 flex-col gap-3 lg:min-h-0"
              : "space-y-8"
          }`}
        >
      {phase === "select" && (
        <div className="grid gap-6 lg:max-w-2xl">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-medium text-slate-900">
              <Navigation className="h-5 w-5 text-blue-600" />
              1. Compound & destination
            </h2>
            <div className="relative" ref={compoundPickerRef}>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Compound
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    autoComplete="off"
                    value={compoundSearch}
                    onChange={onCompoundSearchChange}
                    onFocus={() => setCompoundMenuOpen(true)}
                    placeholder="Search compounds…"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none ring-[#0c1524] focus:ring-2"
                  />
                </div>
                <button
                  type="button"
                  aria-expanded={compoundMenuOpen}
                  aria-label="Toggle compound list"
                  onClick={() => setCompoundMenuOpen((o) => !o)}
                  className="flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${compoundMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
              {compoundMenuOpen && (
                <ul
                  className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                  role="listbox"
                >
                  {filteredCompounds.length === 0 ? (
                    <li className="px-3 py-2.5 text-sm text-slate-500">
                      No compounds match — try another search.
                    </li>
                  ) : (
                    filteredCompounds.map((c) => (
                      <li key={c._id} role="option">
                        <button
                          type="button"
                          onClick={() => {
                            setCompoundId(c._id);
                            setCompoundSearch(c.name);
                            setCompoundMenuOpen(false);
                          }}
                          className={`w-full px-3 py-2.5 text-left text-sm hover:bg-slate-50 ${
                            compoundId === c._id
                              ? "bg-amber-50 font-medium text-amber-950"
                              : "text-slate-800"
                          }`}
                        >
                          {c.name}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Up to five sites listed — search to narrow down.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Destination
              </label>
              <select
                value={destinationKey}
                onChange={(e) => setDestinationKey(e.target.value)}
                disabled={!compoundId}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none ring-blue-500 focus:ring-2 disabled:opacity-50"
              >
                <option value="">Select location…</option>
                {destinations.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label} — {d.subtitle}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!compoundId || !destinationKey}
              onClick={handleStartOutdoor}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0c1524] py-3 font-medium text-white shadow-sm hover:bg-[#152a45] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue to outdoor map
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("navai-open-chat"))
              }
              className="mt-3 w-full rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-sm font-medium text-blue-800 hover:bg-blue-100 lg:hidden"
            >
              Open AI guide (chat)
            </button>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600 lg:max-w-2xl">
            <MapIcon className="mx-auto mb-3 h-12 w-12 text-slate-400" />
            <p className="text-sm">
              After you continue, allow location access so we can show distance,
              ETA, and a line toward your building.
            </p>
          </div>
        </div>
      )}

      {phase === "outdoor" && mapPkg && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setPhase("select");
                setMapPkg(null);
                setProgress(null);
                setRoutePolyline(null);
                setRouteMeta(null);
              }}
              className="text-sm font-medium text-[#0c1524] underline hover:text-slate-900"
            >
              Change destination
            </button>
            {!userPos && !geoError && (
              <span className="text-xs text-slate-500">Waiting for GPS…</span>
            )}
          </div>
          {geoError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="leading-relaxed">{geoError}</p>
              <button
                type="button"
                onClick={() => {
                  setGeoRetryKey((k) => k + 1);
                }}
                className="mt-2 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-200"
              >
                Try again
              </button>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:min-h-0">
            <div className="rounded-xl border-2 border-amber-400/80 bg-gradient-to-br from-amber-50 via-white to-slate-50 px-4 py-4 shadow-md ring-1 ring-amber-200/60">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/90 pb-2">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-950">
                  Live guidance
                </p>
                {progress?.destination?.buildingName && (
                  <p className="max-w-[70%] text-right text-xs font-medium text-slate-600">
                    Toward {progress.destination.buildingName}
                    {progress.destination.label
                      ? ` · ${progress.destination.label}`
                      : ""}
                  </p>
                )}
              </div>
              <div className="mt-3 space-y-2">
                {userPos && (routeMeta || progress) ? (
                  <>
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-slate-900">
                      {routeMeta ? (
                        <>
                          <span className="text-2xl font-bold tabular-nums text-[#0c1524]">
                            {Math.round(routeMeta.distanceMeters)} m
                          </span>
                          <span className="text-lg font-semibold text-amber-900">
                            ~{formatWalkDuration(routeMeta.durationSeconds)}{" "}
                            walk
                          </span>
                          <span className="text-xs text-slate-500">
                            along paths (from map routing)
                          </span>
                        </>
                      ) : progress ? (
                        <>
                          <span className="text-2xl font-bold tabular-nums text-[#0c1524]">
                            {Math.round(progress.distanceMeters)} m
                          </span>
                          <span className="text-lg font-semibold text-amber-900">
                            {progress.etaFormatted}
                          </span>
                          <span className="text-xs text-slate-500">
                            straight-line to building pin
                          </span>
                        </>
                      ) : null}
                    </div>
                    {progress &&
                      typeof progress.bearingDeg === "number" &&
                      !Number.isNaN(progress.bearingDeg) && (
                        <p className="flex items-center gap-2 text-sm text-slate-800">
                          <Compass className="h-4 w-4 shrink-0 text-amber-800" />
                          Head about{" "}
                          <strong>
                            {bearingToCompass(progress.bearingDeg)} (
                            {Math.round(progress.bearingDeg)}°)
                          </strong>{" "}
                          toward the destination pin
                        </p>
                      )}
                    {progress?.guidanceMessage && (
                      <p className="text-sm leading-relaxed text-slate-700">
                        {progress.guidanceMessage}
                      </p>
                    )}
                    {progress && routeMeta && (
                      <p className="text-xs text-slate-500">
                        Arrival uses direct distance to pin:{" "}
                        {Math.round(progress.distanceMeters)} m (updates every few
                        seconds with your GPS).
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-600">
                    {geoError
                      ? "Allow location to compute live distance and walking time from your position."
                      : "Getting your position… Distance and ETA are calculated from your GPS and the route on the map."}
                  </p>
                )}
              </div>
            </div>

            <div className="relative min-h-[340px] flex-1 lg:min-h-[min(520px,calc(100vh-20rem))]">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              className="z-0 h-full min-h-[340px] overflow-hidden rounded-xl border border-slate-200 shadow-md sm:min-h-[420px] lg:min-h-full"
              scrollWheelZoom
            >
              <MapRecenter center={mapCenter} zoom={mapZoom} />
              <TileLayer
                attribution={mapPkg.leaflet.tileLayer.attribution}
                url={mapPkg.leaflet.tileLayer.url}
                maxZoom={mapPkg.leaflet.tileLayer.maxZoom}
              />
              {mapPkg.geojson?.features?.length > 0 && (
                <GeoJSON
                  data={mapPkg.geojson}
                  style={() => ({
                    color: "#3b82f6",
                    weight: 2,
                    fillOpacity: 0.12,
                  })}
                  onEachFeature={(feature, layer) => {
                    layer.bindPopup(feature.properties?.name || "Building");
                  }}
                />
              )}
              {polylinePositions && (
                <Polyline
                  positions={polylinePositions}
                  color="#22d3ee"
                  weight={routePolyline?.length > 1 ? 5 : 4}
                  opacity={0.92}
                />
              )}
              {userPos && (
                <CircleMarker
                  center={[userPos.lat, userPos.lng]}
                  radius={9}
                  pathOptions={{
                    color: "#fff",
                    fillColor: "#3b82f6",
                    fillOpacity: 1,
                    weight: 3,
                  }}
                >
                  <Popup>You</Popup>
                </CircleMarker>
              )}
              {progress?.destination?.targetLatitude != null && (
                <CircleMarker
                  center={[
                    progress.destination.targetLatitude,
                    progress.destination.targetLongitude,
                  ]}
                  radius={10}
                  pathOptions={{
                    color: "#fff",
                    fillColor: "#a855f7",
                    fillOpacity: 1,
                    weight: 3,
                  }}
                >
                  <Popup>{progress.destination.buildingName}</Popup>
                </CircleMarker>
              )}
            </MapContainer>
            {userPos && (progress || routeMeta) && (
              <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[500] flex justify-center sm:left-auto sm:right-4 sm:justify-end lg:hidden">
                <div className="pointer-events-auto flex max-w-md flex-wrap items-center justify-center gap-3 rounded-2xl border border-cyan-200 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-lg backdrop-blur-sm sm:justify-end">
                  {routeMeta ? (
                    <>
                      <span className="font-semibold">
                        {Math.round(routeMeta.distanceMeters)} m
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-cyan-700">
                        ~{formatWalkDuration(routeMeta.durationSeconds)}
                      </span>
                    </>
                  ) : progress ? (
                    <>
                      <span className="font-semibold">
                        {Math.round(progress.distanceMeters)} m
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-cyan-700">
                        {progress.etaFormatted}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            )}
            </div>
          </div>
        </>
      )}

      {phase === "indoor" && (
        <div className="space-y-6 lg:max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">You’ve arrived</h2>
            <p className="mt-2 text-sm text-slate-600">
              Use the{" "}
              <span className="font-medium text-blue-600">assistant on the right</span>{" "}
              (or the blue chat button on your phone) to talk to the AI guide.
            </p>
          </div>

          <div className="space-y-4">
            {floorMapUrl ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <p className="border-b border-slate-200 px-4 py-2 text-sm text-slate-600">
                  Floor plan (optional)
                </p>
                <img
                  src={floorMapUrl}
                  alt="Floor plan"
                  className="max-h-[480px] w-full object-contain bg-slate-50"
                />
              </div>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                No floor plan image for this floor yet. The guide still works
                from text directions.
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPhase("select");
                setMapPkg(null);
                setProgress(null);
                setRoutePolyline(null);
                setRouteMeta(null);
                setGuideBootstrap({ key: 0, text: null });
                setNavSession((s) => s + 1);
              }}
              className="text-sm text-slate-600 underline hover:text-slate-900"
            >
              Start over
            </button>
          </div>
        </div>
      )}
        </div>

        <FloatingNavigationChat
          compoundId={compoundId}
          destinationKey={destinationKey}
          phase={phase}
          compoundName={compoundLabel}
          guideBootstrap={guideBootstrap}
          navSession={navSession}
        />
      </div>
    </div>
  );
}
