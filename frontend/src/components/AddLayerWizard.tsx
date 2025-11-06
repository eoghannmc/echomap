"use client";

import { useState, useRef } from "react";

type WizardStep = 1 | 2 | 3 | 4 | 5;

type SourceMode = "upload" | "url" | "library";
type GeometryType = "Points" | "Lines" | "Polygons" | "Mixed";
type AreaMode = "all" | "region" | "buffer" | "viewport" | "custom";
type StyleMode = "single" | "categorical" | "graduated" | "heatmap";

interface WizardState {
  step: WizardStep;
  source: {
    mode: SourceMode;
    file?: File;
    url?: string;
    libraryId?: string;
  };
  inspect: {
    geometry: GeometryType;
    crs: string;
    idColumn: string;
    geometryFilter?: string;
  };
  area: {
    mode: AreaMode;
    region?: string;
    bufferAddress?: string;
    bufferMeters?: number;
    predicate: "intersects" | "within";
  };
  style: {
    mode: StyleMode;
    column?: string;
    palette?: string;
    opacity: number;
    outline: boolean;
    outlineWidth: number;
    labelField?: string;
    labelMinZoom?: number;
    singleColor?: string;
    gradientStart?: string;
    gradientEnd?: string;
    heatmapCold?: string;
    heatmapHot?: string;
  };
  advanced: {
    show: boolean;
    pmtiles: {
      minZoom: number;
      maxZoom: number;
      attributes: string[];
    };
    analysis: {
      enabled: boolean;
      h3Res: number;
      format: "parquet" | "fgb";
      dedupKey: string;
    };
  };
  save: {
    scope: "my" | "team" | "global";
    folder: string;
    name: string;
    visibility: "private" | "org" | "public";
    tags: string[];
    keepSource: boolean;
  };
  rightsConfirmed: boolean;
}

const INITIAL_STATE: WizardState = {
  step: 1,
  source: { mode: "upload" },
  inspect: { geometry: "Polygons", crs: "EPSG:4326", idColumn: "feature_id" },
  area: { mode: "all", predicate: "intersects", bufferMeters: 500 },
  style: {
    mode: "single",
    opacity: 0.6,
    outline: true,
    outlineWidth: 1,
    singleColor: "#3b82f6",
    gradientStart: "#3b82f6",
    gradientEnd: "#ef4444",
    heatmapCold: "#3b82f6",
    heatmapHot: "#ef4444",
  },
  advanced: {
    show: false,
    pmtiles: { minZoom: 6, maxZoom: 14, attributes: [] },
    analysis: { enabled: false, h3Res: 7, format: "parquet", dedupKey: "feature_id" },
  },
  save: {
    scope: "my",
    folder: "",
    name: "",
    visibility: "private",
    tags: [],
    keepSource: false,
  },
  rightsConfirmed: false,
};

export default function AddLayerWizard({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canGoNext = (): boolean => {
    switch (state.step) {
      case 1:
        return (
          (state.source.mode === "upload" && !!state.source.file) ||
          (state.source.mode === "url" && !!state.source.url) ||
          (state.source.mode === "library" && !!state.source.libraryId)
        );
      case 2:
        return !!state.inspect.idColumn;
      case 3:
        return true; // Area & Style have defaults
      case 4:
        return state.save.name.trim() !== "";
      case 5:
        return state.rightsConfirmed;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (state.step < 5 && canGoNext()) {
      setState((s) => ({ ...s, step: (s.step + 1) as WizardStep }));
    }
  };

  const handleBack = () => {
    if (state.step > 1) {
      setState((s) => ({ ...s, step: (s.step - 1) as WizardStep }));
    }
  };

  const handleCreate = () => {
    console.log("[AddLayerWizard] Final payload:", state);
    alert("Layer creation started (UI only demo)");
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setState((s) => ({ ...s, source: { ...s.source, file } }));
    }
  };

  const stepTitles: Record<WizardStep, string> = {
    1: "Choose source",
    2: "Inspect & confirm",
    3: "Area & style",
    4: "Save & permissions",
    5: "Review & create",
  };

  const stepSubtitles: Record<WizardStep, string> = {
    1: "Upload a file, paste a URL, or pick from your library.",
    2: "We detected geometry, CRS, and fields. Adjust if needed.",
    3: "Choose the map area and how this layer should look.",
    4: "Choose where this layer lives and who can see it.",
    5: "Confirm details, then create the layer.",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1200px, 94vw)",
          maxHeight: "90vh",
          background: "#fff",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
              Add Layer
            </div>
            <div style={{ fontSize: 14, color: "#6b7280" }}>
              Step {state.step} of 5 — {stepTitles[state.step]}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #d1d5db",
              background: "#fff",
              width: 32,
              height: 32,
              borderRadius: 6,
              fontSize: 18,
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ padding: "0 24px", paddingTop: 12 }}>
          <div
            style={{
              display: "flex",
              gap: 4,
              height: 4,
              background: "#e5e7eb",
              overflow: "hidden",
            }}
          >
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  background: s <= state.step ? "#1a7f37" : "#e5e7eb",
                  transition: "background 200ms",
                }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            padding: 24,
            overflowY: "auto",
            display: "flex",
            gap: 32,
          }}
        >
          {/* Left column (form) */}
          <div style={{ width: 420, flexShrink: 0 }}>
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              {stepSubtitles[state.step]}
            </div>

            {/* Step 1 — Source */}
            {state.step === 1 && (
              <div>
                {/* Source mode tabs */}
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    marginBottom: 16,
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    padding: 4,
                    background: "#f9fafb",
                  }}
                >
                  {(["upload", "url", "library"] as SourceMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          source: { ...s.source, mode: m },
                        }))
                      }
                      style={{
                        flex: 1,
                        padding: "6px 12px",
                        border: "none",
                        background:
                          state.source.mode === m ? "#fff" : "transparent",
                        borderRadius: 4,
                        fontWeight: state.source.mode === m ? 600 : 400,
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {state.source.mode === "upload" && (
                  <div>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: "2px dashed #d1d5db",
                        borderRadius: 8,
                        padding: 48,
                        textAlign: "center",
                        cursor: "pointer",
                        background: "#f9fafb",
                      }}
                    >
                      <div style={{ fontSize: 14, color: "#6b7280" }}>
                        {state.source.file
                          ? `Selected: ${state.source.file.name}`
                          : "Click to upload or drag & drop"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#9ca3af",
                          marginTop: 8,
                        }}
                      >
                        .geojson, .json, .zip, .shp, .gpkg, .fgb, .parquet, .csv,
                        .kml, .gpx
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".geojson,.json,.zip,.shp,.gpkg,.fgb,.parquet,.csv,.kml,.gpx"
                      style={{ display: "none" }}
                      onChange={handleFileSelect}
                    />
                  </div>
                )}

                {state.source.mode === "url" && (
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500 }}>
                      URL
                    </label>
                    <input
                      type="url"
                      value={state.source.url || ""}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          source: { ...s.source, url: e.target.value },
                        }))
                      }
                      placeholder="https://example.com/data.geojson"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        marginTop: 4,
                      }}
                    />
                    <button
                      style={{
                        marginTop: 8,
                        padding: "6px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: 6,
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      Validate
                    </button>
                  </div>
                )}

                {state.source.mode === "library" && (
                  <div
                    style={{
                      border: "1px solid #d1d5db",
                      borderRadius: 8,
                      padding: 16,
                      background: "#f9fafb",
                    }}
                  >
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      Library items will appear here (empty for demo).
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2 — Inspect */}
            {state.step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500 }}>
                    Geometry detected
                  </label>
                  <div
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      marginTop: 4,
                      background: "#f9fafb",
                    }}
                  >
                    {state.inspect.geometry}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500 }}>CRS</label>
                  <div
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      marginTop: 4,
                      background: "#f9fafb",
                    }}
                  >
                    {state.inspect.crs}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500 }}>
                    ID column
                  </label>
                  <select
                    value={state.inspect.idColumn}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        inspect: { ...s.inspect, idColumn: e.target.value },
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 6,
                      marginTop: 4,
                    }}
                  >
                    <option value="feature_id">feature_id</option>
                    <option value="id">id</option>
                    <option value="uuid">Generate UUID</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 3 — Area & Style */}
            {state.step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Area */}
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 12,
                    }}
                  >
                    Area (subset)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <input
                        type="radio"
                        checked={state.area.mode === "all"}
                        onChange={() =>
                          setState((s) => ({
                            ...s,
                            area: { ...s.area, mode: "all" },
                          }))
                        }
                      />
                      <span style={{ fontSize: 13 }}>All features</span>
                    </label>

                    <div>
                      <label
                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                      >
                        <input
                          type="radio"
                          checked={state.area.mode === "region"}
                          onChange={() =>
                            setState((s) => ({
                              ...s,
                              area: { ...s.area, mode: "region" },
                            }))
                          }
                        />
                        <span style={{ fontSize: 13 }}>Clip to region</span>
                      </label>
                      {state.area.mode === "region" && (
                        <select
                          value={state.area.region || ""}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              area: { ...s.area, region: e.target.value },
                            }))
                          }
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #d1d5db",
                            marginTop: 8,
                            marginLeft: 24,
                          }}
                        >
                          <option value="">Select region...</option>
                          <option value="vic">Victoria</option>
                          <option value="melbourne">Greater Melbourne</option>
                          <option value="geelong">Greater Geelong</option>
                          <option value="ballarat">Ballarat</option>
                          <option value="bendigo">Greater Bendigo</option>
                        </select>
                      )}
                    </div>

                    <div>
                      <label
                        style={{ display: "flex", alignItems: "center", gap: 8 }}
                      >
                        <input
                          type="radio"
                          checked={state.area.mode === "buffer"}
                          onChange={() =>
                            setState((s) => ({
                              ...s,
                              area: { ...s.area, mode: "buffer" },
                            }))
                          }
                        />
                        <span style={{ fontSize: 13 }}>Buffer around a point</span>
                      </label>
                      {state.area.mode === "buffer" && (
                        <div
                          style={{
                            marginLeft: 24,
                            marginTop: 8,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                        >
                          <input
                            type="text"
                            value={state.area.bufferAddress || ""}
                            onChange={(e) =>
                              setState((s) => ({
                                ...s,
                                area: { ...s.area, bufferAddress: e.target.value },
                              }))
                            }
                            placeholder="Search address..."
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #d1d5db",
                            }}
                          />
                          <div>
                            <label style={{ fontSize: 13, fontWeight: 500 }}>
                              Buffer radius (meters)
                            </label>
                            <input
                              type="range"
                              min="100"
                              max="5000"
                              step="100"
                              value={state.area.bufferMeters || 500}
                              onChange={(e) =>
                                setState((s) => ({
                                  ...s,
                                  area: {
                                    ...s.area,
                                    bufferMeters: parseInt(e.target.value),
                                  },
                                }))
                              }
                              style={{ width: "100%", marginTop: 4 }}
                            />
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              {state.area.bufferMeters || 500}m
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Style */}
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 12,
                    }}
                  >
                    Style
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500 }}>
                        Style mode
                      </label>
                      <select
                        value={state.style.mode}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            style: {
                              ...s.style,
                              mode: e.target.value as StyleMode,
                            },
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          marginTop: 4,
                        }}
                      >
                        <option value="single">Single</option>
                        <option value="categorical">Categorical</option>
                        <option value="graduated">Graduated</option>
                        <option value="heatmap">Heatmap</option>
                      </select>
                    </div>

                    {/* Single color picker */}
                    {state.style.mode === "single" && (
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 500 }}>
                          Color
                        </label>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 4,
                          }}
                        >
                          <input
                            type="color"
                            value={state.style.singleColor || "#3b82f6"}
                            onChange={(e) =>
                              setState((s) => ({
                                ...s,
                                style: { ...s.style, singleColor: e.target.value },
                              }))
                            }
                            style={{
                              width: 40,
                              height: 40,
                              border: "1px solid #d1d5db",
                              cursor: "pointer",
                            }}
                          />
                          <input
                            type="text"
                            value={state.style.singleColor || "#3b82f6"}
                            onChange={(e) =>
                              setState((s) => ({
                                ...s,
                                style: { ...s.style, singleColor: e.target.value },
                              }))
                            }
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              border: "1px solid #d1d5db",
                              fontFamily: "monospace",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Categorical palette */}
                    {state.style.mode === "categorical" && (
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 500 }}>
                          Color palette
                        </label>
                        <select
                          value={state.style.palette || ""}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              style: { ...s.style, palette: e.target.value },
                            }))
                          }
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid #d1d5db",
                            marginTop: 4,
                          }}
                        >
                          <option value="">Select palette...</option>
                          <option value="set3">Set3 (Pastel)</option>
                          <option value="paired">Paired</option>
                          <option value="category10">Category10</option>
                          <option value="tableau10">Tableau10</option>
                        </select>
                      </div>
                    )}

                    {/* Graduated gradient */}
                    {state.style.mode === "graduated" && (
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 500 }}>
                          Gradient colors
                        </label>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 4,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                              Start
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <input
                                type="color"
                                value={state.style.gradientStart || "#3b82f6"}
                                onChange={(e) =>
                                  setState((s) => ({
                                    ...s,
                                    style: { ...s.style, gradientStart: e.target.value },
                                  }))
                                }
                                style={{
                                  width: 32,
                                  height: 32,
                                  border: "1px solid #d1d5db",
                                  cursor: "pointer",
                                }}
                              />
                              <input
                                type="text"
                                value={state.style.gradientStart || "#3b82f6"}
                                onChange={(e) =>
                                  setState((s) => ({
                                    ...s,
                                    style: { ...s.style, gradientStart: e.target.value },
                                  }))
                                }
                                style={{
                                  flex: 1,
                                  padding: "6px 8px",
                                  border: "1px solid #d1d5db",
                                  fontSize: 12,
                                  fontFamily: "monospace",
                                }}
                              />
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                              End
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <input
                                type="color"
                                value={state.style.gradientEnd || "#ef4444"}
                                onChange={(e) =>
                                  setState((s) => ({
                                    ...s,
                                    style: { ...s.style, gradientEnd: e.target.value },
                                  }))
                                }
                                style={{
                                  width: 32,
                                  height: 32,
                                  border: "1px solid #d1d5db",
                                  cursor: "pointer",
                                }}
                              />
                              <input
                                type="text"
                                value={state.style.gradientEnd || "#ef4444"}
                                onChange={(e) =>
                                  setState((s) => ({
                                    ...s,
                                    style: { ...s.style, gradientEnd: e.target.value },
                                  }))
                                }
                                style={{
                                  flex: 1,
                                  padding: "6px 8px",
                                  border: "1px solid #d1d5db",
                                  fontSize: 12,
                                  fontFamily: "monospace",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Heatmap colors */}
                    {state.style.mode === "heatmap" && (
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 500 }}>
                          Heatmap colors
                        </label>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 4,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                              Cold
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <input
                                type="color"
                                value={state.style.heatmapCold || "#3b82f6"}
                                onChange={(e) =>
                                  setState((s) => ({
                                    ...s,
                                    style: { ...s.style, heatmapCold: e.target.value },
                                  }))
                                }
                                style={{
                                  width: 32,
                                  height: 32,
                                  border: "1px solid #d1d5db",
                                  cursor: "pointer",
                                }}
                              />
                              <input
                                type="text"
                                value={state.style.heatmapCold || "#3b82f6"}
                                onChange={(e) =>
                                  setState((s) => ({
                                    ...s,
                                    style: { ...s.style, heatmapCold: e.target.value },
                                  }))
                                }
                                style={{
                                  flex: 1,
                                  padding: "6px 8px",
                                  border: "1px solid #d1d5db",
                                  fontSize: 12,
                                  fontFamily: "monospace",
                                }}
                              />
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                              Hot
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <input
                                type="color"
                                value={state.style.heatmapHot || "#ef4444"}
                                onChange={(e) =>
                                  setState((s) => ({
                                    ...s,
                                    style: { ...s.style, heatmapHot: e.target.value },
                                  }))
                                }
                                style={{
                                  width: 32,
                                  height: 32,
                                  border: "1px solid #d1d5db",
                                  cursor: "pointer",
                                }}
                              />
                              <input
                                type="text"
                                value={state.style.heatmapHot || "#ef4444"}
                                onChange={(e) =>
                                  setState((s) => ({
                                    ...s,
                                    style: { ...s.style, heatmapHot: e.target.value },
                                  }))
                                }
                                style={{
                                  flex: 1,
                                  padding: "6px 8px",
                                  border: "1px solid #d1d5db",
                                  fontSize: 12,
                                  fontFamily: "monospace",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: 13, fontWeight: 500 }}>
                        Opacity
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={state.style.opacity}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            style: {
                              ...s.style,
                              opacity: parseFloat(e.target.value),
                            },
                          }))
                        }
                        style={{ width: "100%", marginTop: 4 }}
                      />
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {state.style.opacity.toFixed(1)}
                      </div>
                    </div>

                    <label
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <input
                        type="checkbox"
                        checked={state.style.outline}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            style: { ...s.style, outline: e.target.checked },
                          }))
                        }
                      />
                      <span style={{ fontSize: 13 }}>Outline</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 — Save To */}
            {state.step === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500 }}>Access</label>
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    {(["my", "team", "global"] as const).map((sc) => (
                      <label
                        key={sc}
                        style={{ display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <input
                          type="radio"
                          checked={state.save.scope === sc}
                          onChange={() =>
                            setState((s) => ({
                              ...s,
                              save: { ...s.save, scope: sc },
                            }))
                          }
                        />
                        <span style={{ textTransform: "capitalize", fontSize: 13 }}>
                          {sc === "my" ? "My workspace" : sc}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 500 }}>Name</label>
                  <input
                    type="text"
                    value={state.save.name}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        save: { ...s.save, name: e.target.value },
                      }))
                    }
                    placeholder="e.g. Planning Zones"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      marginTop: 4,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Step 5 — Review */}
            {state.step === 5 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div
                  style={{
                    padding: 12,
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    background: "#f9fafb",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Summary
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                    <div>
                      <strong>Source:</strong> {state.source.mode} (
                      {state.source.file?.name || state.source.url || "library"})
                    </div>
                    <div>
                      <strong>Geometry:</strong> {state.inspect.geometry}
                    </div>
                    <div>
                      <strong>Area:</strong> {state.area.mode}
                    </div>
                    <div>
                      <strong>Style:</strong> {state.style.mode} (opacity{" "}
                      {state.style.opacity})
                    </div>
                    <div>
                      <strong>Save to:</strong> {state.save.scope} /{" "}
                      {state.save.name}
                    </div>
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "start",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={state.rightsConfirmed}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        rightsConfirmed: e.target.checked,
                      }))
                    }
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    I have rights to upload and share this data.
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Right column (preview/help) */}
          <div
            style={{
              flex: 1,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 16,
              background: "#f9fafb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 300,
            }}
          >
            {state.step === 1 && (
              <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                File checks / URL checks will appear here
              </div>
            )}
            {state.step === 2 && (
              <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                Schema table (first 8–10 rows) will appear here
              </div>
            )}
            {state.step === 3 && (
              <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                MapLibre canvas (~360–400px) with draw tools & live style preview
              </div>
            )}
            {state.step === 4 && (
              <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                Path preview: /datasets/{state.save.scope}/{state.save.name || "..."}
                <div style={{ marginTop: 8 }}>
                  PMTiles will be rendered with the chosen style.
                </div>
              </div>
            )}
            {state.step === 5 && (
              <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                <div>We'll generate a styled PMTiles for fast display.</div>
                {state.advanced.analysis.enabled && (
                  <div style={{ marginTop: 8 }}>
                    We'll also prepare analysis data (H3 shards).
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {state.step === 1 && "Select a source to continue"}
            {state.step === 2 && "Review detected fields"}
            {state.step === 3 && "Configure area & style"}
            {state.step === 4 && "Set save location & permissions"}
            {state.step === 5 && "Confirm and create"}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {state.step > 1 && (
              <button
                onClick={handleBack}
                style={{
                  padding: "8px 16px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Back
              </button>
            )}
            {state.step < 5 && (
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 6,
                  background: canGoNext() ? "#3b82f6" : "#d1d5db",
                  color: "#fff",
                  cursor: canGoNext() ? "pointer" : "not-allowed",
                }}
              >
                Next
              </button>
            )}
            {state.step === 5 && (
              <button
                onClick={handleCreate}
                disabled={!canGoNext()}
                style={{
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: 6,
                  background: canGoNext() ? "#10b981" : "#d1d5db",
                  color: "#fff",
                  cursor: canGoNext() ? "pointer" : "not-allowed",
                }}
              >
                Create Layer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
