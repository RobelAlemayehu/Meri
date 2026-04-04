import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Save,
  AlertCircle,
  Plus,
  Trash2,
  Building2,
  Layers,
  MapPin,
} from "lucide-react";

const LOCATION_TYPES = [
  { value: "facility", label: "Facility" },
  { value: "office", label: "Office" },
  { value: "room", label: "Room" },
  { value: "service", label: "Service" },
];

function emptyLocation() {
  return {
    name: "",
    type: "facility",
    description: "",
    directions: "",
    keywordsStr: "",
  };
}

function emptyFloor() {
  return {
    floorNumber: "",
    floorMapUrl: "",
    locations: [emptyLocation()],
  };
}

function emptyBuilding() {
  return {
    name: "",
    latitude: "",
    longitude: "",
    floors: [emptyFloor()],
  };
}

/** Load API shape into form-friendly state */
function fromApiBuildings(buildings) {
  if (!buildings?.length) return [];
  return buildings.map((b) => ({
    name: b.name || "",
    latitude: b.latitude ?? "",
    longitude: b.longitude ?? "",
    floors: (b.floors || []).length
      ? b.floors.map((f) => ({
          floorNumber: f.floorNumber ?? "",
          floorMapUrl: f.floorMapUrl || "",
          locations: (f.locations || []).length
            ? f.locations.map((l) => ({
                name: l.name || "",
                type: LOCATION_TYPES.some((t) => t.value === l.type)
                  ? l.type
                  : "facility",
                description: l.description || "",
                directions: l.directions || "",
                keywordsStr: Array.isArray(l.keywords)
                  ? l.keywords.join(", ")
                  : "",
              }))
            : [emptyLocation()],
        }))
      : [emptyFloor()],
  }));
}

/** Form state → API payload */
function toApiBuildings(ui) {
  return ui.map((b) => ({
    name: b.name.trim(),
    latitude: Number(b.latitude),
    longitude: Number(b.longitude),
    floors: b.floors.map((f) => ({
      floorNumber: Number(f.floorNumber),
      ...(f.floorMapUrl?.trim() && { floorMapUrl: f.floorMapUrl.trim() }),
      locations: f.locations.map((l) => ({
        name: l.name.trim(),
        type: l.type,
        ...(l.description?.trim() && { description: l.description.trim() }),
        directions: l.directions.trim(),
        keywords: l.keywordsStr
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean),
      })),
    })),
  }));
}

function validateBuildings(ui) {
  for (let bi = 0; bi < ui.length; bi++) {
    const b = ui[bi];
    if (!b.name.trim()) return `Building ${bi + 1}: name is required.`;
    if (!Number.isFinite(Number(b.latitude)) || !Number.isFinite(Number(b.longitude))) {
      return `Building "${b.name || bi + 1}": enter valid latitude and longitude (numbers).`;
    }
    for (let fi = 0; fi < b.floors.length; fi++) {
      const f = b.floors[fi];
      if (!Number.isFinite(Number(f.floorNumber))) {
        return `Building "${b.name}": floor ${fi + 1} needs a valid floor number.`;
      }
      for (let li = 0; li < f.locations.length; li++) {
        const l = f.locations[li];
        if (!l.name.trim()) {
          return `Building "${b.name}", floor ${f.floorNumber}: location ${li + 1} needs a name.`;
        }
        if (!l.directions.trim()) {
          return `Location "${l.name || li + 1}" needs indoor directions.`;
        }
      }
    }
  }
  return null;
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-blue-500 focus:ring-2";
const labelCls = "mb-1 block text-xs font-medium text-slate-600";

export default function AdminDashboard() {
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [buildings, setBuildings] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function refreshList() {
    setLoading(true);
    try {
      const { data } = await api.myCompounds();
      const compounds = data.compounds || [];
      setList(compounds);
      if (!selectedId && compounds.length) {
        setSelectedId(compounds[0]._id);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Could not load compounds");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshList();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setError("");
    api
      .compound(selectedId)
      .then(({ data }) => {
        setName(data.name || "");
        setDescription(data.description || "");
        const loaded = fromApiBuildings(data.buildings);
        setBuildings(loaded.length ? loaded : []);
      })
      .catch((e) =>
        setError(e.response?.data?.message || "Failed to load compound")
      );
  }, [selectedId]);

  async function handleSave(e) {
    e.preventDefault();
    setStatus("");
    setError("");
    const msg = validateBuildings(buildings);
    if (msg) {
      setError(msg);
      return;
    }
    setSaving(true);
    try {
      await api.updateCompound(selectedId, {
        name: name.trim(),
        description: description.trim(),
        buildings: toApiBuildings(buildings),
      });
      setStatus("Saved successfully.");
      refreshList();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="text-center text-slate-600">Loading your compound…</p>
    );
  }

  if (!list.length) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-600" />
        <h2 className="font-semibold text-slate-900">No compound assigned</h2>
        <p className="mt-2 text-sm text-slate-600">
          A superadmin must create a branch and assign your admin account to it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Branch admin
        </h1>
        <p className="mt-1 text-slate-600">
          Fill in buildings, GPS coordinates, floors, and places using the
          fields below — no JSON required.
        </p>
      </div>

      {list.length > 1 && (
        <div>
          <label className={labelCls}>Compound</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={`${inputCls} max-w-md`}
          >
            {list.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        {status && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {status}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Compound name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Compound description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputCls}
              placeholder="Short summary for guests"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-medium text-slate-900">
            <Building2 className="h-5 w-5 text-blue-600" />
            Buildings
          </h2>
          <button
            type="button"
            onClick={() => setBuildings((prev) => [...prev, emptyBuilding()])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Add building
          </button>
        </div>

        {buildings.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-sm text-slate-600">
            No buildings yet. Click &quot;Add building&quot; to add one with map
            coordinates and floors.
          </p>
        )}

        {buildings.map((building, bi) => (
          <div
            key={bi}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="text-sm font-medium text-blue-700">
                Building {bi + 1}
              </span>
              <button
                type="button"
                onClick={() =>
                  setBuildings((prev) => prev.filter((_, i) => i !== bi))
                }
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove building
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <label className={labelCls}>Building name</label>
                <input
                  value={building.name}
                  onChange={(e) =>
                    setBuildings((prev) =>
                      prev.map((b, i) =>
                        i === bi ? { ...b, name: e.target.value } : b
                      )
                    )
                  }
                  className={inputCls}
                  placeholder="e.g. Science Building"
                  required
                />
              </div>
              <div>
                <label className={labelCls}>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Latitude
                  </span>
                </label>
                <input
                  value={building.latitude}
                  onChange={(e) =>
                    setBuildings((prev) =>
                      prev.map((b, i) =>
                        i === bi ? { ...b, latitude: e.target.value } : b
                      )
                    )
                  }
                  className={inputCls}
                  placeholder="9.0360"
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className={labelCls}>Longitude</label>
                <input
                  value={building.longitude}
                  onChange={(e) =>
                    setBuildings((prev) =>
                      prev.map((b, i) =>
                        i === bi ? { ...b, longitude: e.target.value } : b
                      )
                    )
                  }
                  className={inputCls}
                  placeholder="38.7630"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <Layers className="h-4 w-4 text-slate-500" />
                  Floors
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setBuildings((prev) =>
                      prev.map((b, i) =>
                        i === bi
                          ? { ...b, floors: [...b.floors, emptyFloor()] }
                          : b
                      )
                    )
                  }
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  + Add floor
                </button>
              </div>

              {building.floors.map((floor, fi) => (
                <div
                  key={fi}
                  className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 last:mb-0"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">
                      Floor block {fi + 1}
                    </span>
                    {building.floors.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setBuildings((prev) =>
                            prev.map((b, i) =>
                              i === bi
                                ? {
                                    ...b,
                                    floors: b.floors.filter(
                                      (_, j) => j !== fi
                                    ),
                                  }
                                : b
                            )
                          )
                        }
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove floor
                      </button>
                    )}
                  </div>
                  <div className="mb-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Floor number</label>
                      <input
                        value={floor.floorNumber}
                        onChange={(e) =>
                          setBuildings((prev) =>
                            prev.map((b, i) =>
                              i === bi
                                ? {
                                    ...b,
                                    floors: b.floors.map((f, j) =>
                                      j === fi
                                        ? {
                                            ...f,
                                            floorNumber: e.target.value,
                                          }
                                        : f
                                    ),
                                  }
                                : b
                            )
                          )
                        }
                        className={inputCls}
                        placeholder="1"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        Floor plan image URL (optional)
                      </label>
                      <input
                        value={floor.floorMapUrl}
                        onChange={(e) =>
                          setBuildings((prev) =>
                            prev.map((b, i) =>
                              i === bi
                                ? {
                                    ...b,
                                    floors: b.floors.map((f, j) =>
                                      j === fi
                                        ? {
                                            ...f,
                                            floorMapUrl: e.target.value,
                                          }
                                        : f
                                    ),
                                  }
                                : b
                            )
                          )
                        }
                        className={inputCls}
                        placeholder="https://…"
                      />
                    </div>
                  </div>

                  <p className="mb-2 text-xs text-slate-500">Locations on this floor</p>
                  {floor.locations.map((loc, li) => (
                    <div
                      key={li}
                      className="mb-3 rounded-lg border border-slate-200 bg-white p-3 last:mb-0"
                    >
                      <div className="mb-2 flex justify-end">
                        {floor.locations.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setBuildings((prev) =>
                                prev.map((b, i) =>
                                  i === bi
                                    ? {
                                        ...b,
                                        floors: b.floors.map((f, j) =>
                                          j === fi
                                            ? {
                                                ...f,
                                                locations: f.locations.filter(
                                                  (_, k) => k !== li
                                                ),
                                              }
                                            : f
                                        ),
                                      }
                                    : b
                                )
                              )
                            }
                            className="text-xs text-red-600"
                          >
                            Remove place
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Place name</label>
                          <input
                            value={loc.name}
                            onChange={(e) =>
                              setBuildings((prev) =>
                                prev.map((b, i) =>
                                  i === bi
                                    ? {
                                        ...b,
                                        floors: b.floors.map((f, j) =>
                                          j === fi
                                            ? {
                                                ...f,
                                                locations: f.locations.map(
                                                  (l, k) =>
                                                    k === li
                                                      ? {
                                                          ...l,
                                                          name: e.target.value,
                                                        }
                                                      : l
                                                ),
                                              }
                                            : f
                                        ),
                                      }
                                    : b
                                )
                              )
                            }
                            className={inputCls}
                            placeholder="e.g. Physics Lab"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Type</label>
                          <select
                            value={loc.type}
                            onChange={(e) =>
                              setBuildings((prev) =>
                                prev.map((b, i) =>
                                  i === bi
                                    ? {
                                        ...b,
                                        floors: b.floors.map((f, j) =>
                                          j === fi
                                            ? {
                                                ...f,
                                                locations: f.locations.map(
                                                  (l, k) =>
                                                    k === li
                                                      ? {
                                                          ...l,
                                                          type: e.target.value,
                                                        }
                                                      : l
                                                ),
                                              }
                                            : f
                                        ),
                                      }
                                    : b
                                )
                              )
                            }
                            className={inputCls}
                          >
                            {LOCATION_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>
                            Keywords (comma-separated, optional)
                          </label>
                          <input
                            value={loc.keywordsStr}
                            onChange={(e) =>
                              setBuildings((prev) =>
                                prev.map((b, i) =>
                                  i === bi
                                    ? {
                                        ...b,
                                        floors: b.floors.map((f, j) =>
                                          j === fi
                                            ? {
                                                ...f,
                                                locations: f.locations.map(
                                                  (l, k) =>
                                                    k === li
                                                      ? {
                                                          ...l,
                                                          keywordsStr:
                                                            e.target.value,
                                                        }
                                                      : l
                                                ),
                                              }
                                            : f
                                        ),
                                      }
                                    : b
                                )
                              )
                            }
                            className={inputCls}
                            placeholder="lab, physics, science"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls}>
                            Short description (optional)
                          </label>
                          <input
                            value={loc.description}
                            onChange={(e) =>
                              setBuildings((prev) =>
                                prev.map((b, i) =>
                                  i === bi
                                    ? {
                                        ...b,
                                        floors: b.floors.map((f, j) =>
                                          j === fi
                                            ? {
                                                ...f,
                                                locations: f.locations.map(
                                                  (l, k) =>
                                                    k === li
                                                      ? {
                                                          ...l,
                                                          description:
                                                            e.target.value,
                                                        }
                                                      : l
                                                ),
                                              }
                                            : f
                                        ),
                                      }
                                    : b
                                )
                              )
                            }
                            className={inputCls}
                            placeholder="Intro lab, open hours…"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls}>
                            Indoor directions (required)
                          </label>
                          <textarea
                            value={loc.directions}
                            onChange={(e) =>
                              setBuildings((prev) =>
                                prev.map((b, i) =>
                                  i === bi
                                    ? {
                                        ...b,
                                        floors: b.floors.map((f, j) =>
                                          j === fi
                                            ? {
                                                ...f,
                                                locations: f.locations.map(
                                                  (l, k) =>
                                                    k === li
                                                      ? {
                                                          ...l,
                                                          directions:
                                                            e.target.value,
                                                        }
                                                      : l
                                                ),
                                              }
                                            : f
                                        ),
                                      }
                                    : b
                                )
                              )
                            }
                            className={`${inputCls} min-h-[80px] resize-y`}
                            placeholder="From the main entrance, elevator to floor 1, turn left…"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setBuildings((prev) =>
                        prev.map((b, i) =>
                          i === bi
                            ? {
                                ...b,
                                floors: b.floors.map((f, j) =>
                                  j === fi
                                    ? {
                                        ...f,
                                        locations: [
                                          ...f.locations,
                                          emptyLocation(),
                                        ],
                                      }
                                    : f
                                ),
                              }
                            : b
                        )
                      )
                    }
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                  >
                    + Add another place on this floor
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={saving || !selectedId}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save compound"}
        </button>
      </form>
    </div>
  );
}
