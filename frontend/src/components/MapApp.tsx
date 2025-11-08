"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { FormEvent } from "react";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import * as turf from "@turf/turf";

import { listTables, createTable, addRow, updateRow, deleteRow, getTable } from "@/lib/geoTables";

import SearchBar from "./SearchBar";
import type { SuggestItem } from "../lib/suggest";

import AddLocationModal from "./AddLocationModal";
import MyLocationsModal from "./MyLocationsModal";
import ExportModal from "./ExportModal";
import AddLayerWizard from "./AddLayerWizard";

// MapboxDraw ships with dash arrays that maplibre-gl@5 rejects unless wrapped in `literal`.
// Patch the default theme once so any draw instance uses a compatible expression.
const patchDrawTheme = () => {
  const lib = (MapboxDraw as any)?.lib;
  if (!lib || !Array.isArray(lib.theme)) return;
  
  // Mutate the theme array in place (theme property has only a getter, no setter)
  const themeArray = lib.theme;
  for (let i = 0; i < themeArray.length; i++) {
    const style = themeArray[i];
    if (
      style?.id === "gl-draw-lines" &&
      Array.isArray(style.paint?.["line-dasharray"]) &&
      style.paint["line-dasharray"].length >= 4
    ) {
      // Replace the dash array with a MapLibre v5 compatible expression
      style.paint["line-dasharray"] = [
        "case",
        ["==", ["get", "active"], "true"],
        ["literal", [0.2, 2]],
        ["literal", [2, 0]],
      ];
    }
  }
};

patchDrawTheme();

/* ================= UX constants ================= */
const UX = { addressFlyToZoom: 16 };
const DEFAULT_RADIUS = 3;
const MIN_RADIUS = 1;
const MAX_RADIUS = 8;

const PLANNING_ZONE_COLORS: Record<string, string> = {
  GRZ: "#66bb66",
  GRZ1: "#66bb66",
  GRZ2: "#66bb66",
  GRZ3: "#66bb66",
  GRZ4: "#66bb66",
  GRZ5: "#66bb66",
  GRZ6: "#66bb66",
  GRZ7: "#66bb66",
  GRZ8: "#66bb66",
  GRZ9: "#66bb66",
  GRZ10: "#66bb66",
  GRZ11: "#66bb66",
  GRZ12: "#66bb66",
  GRZ13: "#66bb66",
  GRZ14: "#66bb66",
  GRZ15: "#66bb66",
  GRZ16: "#66bb66",
  GRZ17: "#66bb66",
  GRZ18: "#66bb66",
  NRZ1: "#99cc99",
  NRZ2: "#99cc99",
  NRZ3: "#99cc99",
  NRZ4: "#99cc99",
  NRZ5: "#99cc99",
  NRZ6: "#99cc99",
  NRZ7: "#99cc99",
  NRZ8: "#99cc99",
  NRZ9: "#99cc99",
  NRZ10: "#99cc99",
  NRZ11: "#99cc99",
  NRZ12: "#99cc99",
  NRZ14: "#99cc99",
  RGZ: "#339966",
  RGZ1: "#339966",
  RGZ2: "#339966",
  RGZ3: "#339966",
  RGZ4: "#339966",
  RGZ5: "#339966",
  RGZ6: "#339966",
  RGZ7: "#339966",
  RGZ8: "#339966",
  RGZ9: "#339966",
  LDRZ: "#cce5cc",
  LDRZ1: "#cce5cc",
  LDRZ2: "#cce5cc",
  LDRZ3: "#cce5cc",
  LDRZ4: "#cce5cc",
  LDRZ5: "#cce5cc",
  IN1Z: "#999966",
  IN2Z: "#999966",
  IN3Z: "#999966",
  B1Z: "#996633",
  B2Z: "#996633",
  B3Z: "#996633",
  B4Z: "#996633",
  B5Z: "#996633",
  C1Z: "#996633",
  C2Z: "#996633",
  CDZ1: "#4da6ff",
  CDZ2: "#4da6ff",
  CDZ3: "#4da6ff",
  CDZ4: "#4da6ff",
  CDZ5: "#4da6ff",
  CDZ6: "#4da6ff",
  PDZ: "#4da6ff",
  PDZ1: "#4da6ff",
  PDZ2: "#4da6ff",
  UGZ: "#64b5f6",
  UGZ1: "#64b5f6",
  UGZ2: "#64b5f6",
  UGZ3: "#64b5f6",
  UGZ4: "#64b5f6",
  UGZ5: "#64b5f6",
  UGZ6: "#64b5f6",
  UGZ7: "#64b5f6",
  UGZ8: "#64b5f6",
  UGZ9: "#64b5f6",
  UGZ10: "#64b5f6",
  UGZ11: "#64b5f6",
  UGZ12: "#64b5f6",
  UGZ13: "#64b5f6",
  UGZ14: "#64b5f6",
  UGZ15: "#64b5f6",
  UGZ16: "#64b5f6",
  TRZ1: "#b3b3b3",
  TRZ2: "#b3b3b3",
  TRZ3: "#b3b3b3",
  TRZ4: "#b3b3b3",
  FZ: "#d4e157",
  FZ1: "#d4e157",
  FZ2: "#d4e157",
  FZ3: "#d4e157",
  FZ4: "#d4e157",
  RLZ: "#a1887f",
  RLZ1: "#a1887f",
  RLZ2: "#a1887f",
  RLZ3: "#a1887f",
  RLZ4: "#a1887f",
  RLZ5: "#a1887f",
  RAZ: "#bcaaa4",
  RAZ1: "#bcaaa4",
  RAZ2: "#bcaaa4",
  RAZ3: "#bcaaa4",
  RCZ: "#8d6e63",
  RCZ1: "#8d6e63",
  RCZ2: "#8d6e63",
  RCZ3: "#8d6e63",
  RCZ4: "#8d6e63",
  RCZ5: "#8d6e63",
  RCZ6: "#8d6e63",
  RCZ7: "#8d6e63",
  RCZ8: "#8d6e63",
  RCZ9: "#8d6e63",
  RCZ10: "#8d6e63",
  RCZ11: "#8d6e63",
  RCZ12: "#8d6e63",
  RCZ13: "#8d6e63",
  RCZ14: "#8d6e63",
  RCZ15: "#8d6e63",
  TZ: "#aed581",
  TZ1: "#aed581",
  TZ2: "#aed581",
  GWZ: "#a5d6a7",
  GWZ1: "#a5d6a7",
  GWZ2: "#a5d6a7",
  GWZ3: "#a5d6a7",
  GWZ4: "#a5d6a7",
  GWZ5: "#a5d6a7",
  GWZ6: "#a5d6a7",
  GWAZ: "#a5d6a7",
  GWAZ1: "#a5d6a7",
  GWAZ2: "#a5d6a7",
  GWAZ4: "#a5d6a7",
  GWAZ5: "#a5d6a7",
  GWAZ6: "#a5d6a7",
  PPRZ: "#81c784",
  PCRZ: "#81c784",
  PUZ1: "#81c784",
  PUZ2: "#81c784",
  PUZ3: "#81c784",
  PUZ5: "#81c784",
  PUZ6: "#81c784",
  PUZ7: "#81c784",
  SUZ1: "#ffcc80",
  SUZ2: "#ffcc80",
  SUZ3: "#ffcc80",
  SUZ4: "#ffcc80",
  SUZ5: "#ffcc80",
  SUZ6: "#ffcc80",
  SUZ7: "#ffcc80",
  SUZ8: "#ffcc80",
  SUZ9: "#ffcc80",
  SUZ10: "#ffcc80",
  SUZ11: "#ffcc80",
  SUZ12: "#ffcc80",
  SUZ13: "#ffcc80",
  SUZ14: "#ffcc80",
  SUZ15: "#ffcc80",
  SUZ16: "#ffcc80",
  SUZ17: "#ffcc80",
  CCZ1: "#2e5984",
  CCZ2: "#2e5984",
  CCZ3: "#2e5984",
  CCZ4: "#2e5984",
  CCZ5: "#2e5984",
  CCZ6: "#2e5984",
  CCZ7: "#2e5984",
  DZ1: "#2e5984",
  DZ2: "#2e5984",
  DZ3: "#2e5984",
  DZ4: "#2e5984",
  DZ5: "#2e5984",
  DZ6: "#2e5984",
  DZ7: "#2e5984",
  ACZ1: "#6c91bf",
  ACZ2: "#6c91bf",
  ACZ3: "#6c91bf",
  MUZ: "#6c91bf",
  MUZ1: "#6c91bf",
  MUZ2: "#6c91bf",
  MUZ3: "#6c91bf",
  MUZ4: "#6c91bf",
  UFZ: "#4fc3f7",
  CA: "#b0bec5",
  PZ: "#8eacbb",
};

const PLANNING_FILL_COLOR_EXPRESSION: any = [
  "match",
  ["get", "ZONE_CODE"],
  ...Object.entries(PLANNING_ZONE_COLORS).flatMap(([code, color]) => [
    code,
    color,
  ]),
  "#cccccc",
];

/* ================= Types ================= */
type SectionStatus = "input" | "searching" | "verified";
type DatasetKey = "planning_zones" | "pois" | "sa2" | "dwell_struct";

type DatasetSection = {
  id: string;
  status: SectionStatus;
  dataset?: DatasetKey;
  options?: Record<string, any>;
};

type LocationState =
  | { mode: "idle"; status: SectionStatus }
  | {
      mode: "address";
      label?: string;
      lon?: number;
      lat?: number;
      status: SectionStatus;
    }
  | { mode: "area"; label?: string; status: SectionStatus }
  | {
      mode: "manual";
      label?: string;
      lon: number;
      lat: number;
      status: SectionStatus;
    };

type AddModalPrefill = {
  lon: number;
  lat: number;
  name?: string;
  h3?: string;
};

type HexInfo = {
  hex_id?: string;
  sa2_name?: string;
  lga_name?: string;
  shard_id?: string;
  note?: string;
};

type FocusPoint = {
  lng: number;
  lat: number;
  label: string;
  detail: HexInfo | null;
};

type FocusPopupElements = {
  container: HTMLDivElement;
  statusEl: HTMLDivElement;
};

type MeasureState = {
  active: boolean;
  mode: "line" | "polygon";
};

/* ================= Layer Configuration ================= */
type LayerConfig = {
  key: string;
  label: string;
  mapLayerIds: string[];
  defaultEnabled: boolean;
};

// Centralized layer configuration - ADD NEW LAYERS HERE!
const LAYER_CONFIGS: LayerConfig[] = [
  {
    key: "planning",
    label: "Planning Zones",
    mapLayerIds: ["planning-fill", "planning-outline"],
    defaultEnabled: false,
  },
  {
    key: "parcels",
    label: "Property Parcels",
    mapLayerIds: ["parcels-outline"],
    defaultEnabled: false,
  },
  {
    key: "meshBlocks",
    label: "Mesh Blocks",
    mapLayerIds: ["mesh-fill", "mesh-outline"],
    defaultEnabled: false,
  },
  {
    key: "sa2",
    label: "SA2 Boundaries",
    mapLayerIds: ["sa2-fill", "sa2-outline", "sa2-labels"],
    defaultEnabled: false,
  },
  {
    key: "places",
    label: "Places",
    mapLayerIds: ["places-circles"],
    defaultEnabled: false,
  },
  {
    key: "density",
    label: "Density",
    mapLayerIds: ["density-fill"],
    defaultEnabled: false,
  },
  {
    key: "rail",
    label: "Rail",
    mapLayerIds: ["rail-lines"],
    defaultEnabled: false,
  },
  {
    key: "flora",
    label: "Flora & Fauna",
    mapLayerIds: ["flora-fill", "flora-outline"],
    defaultEnabled: false,
  },
  {
    key: "roads",
    label: "Roads",
    mapLayerIds: ["roads-lines"],
    defaultEnabled: false,
  },
  {
    key: "contours",
    label: "Contours",
    mapLayerIds: ["contours-lines"],
    defaultEnabled: false,
  },
  {
    key: "powerlines",
    label: "Power Lines",
    mapLayerIds: ["powerlines-lines"],
    defaultEnabled: false,
  },
  {
    key: "rivers",
    label: "Rivers",
    mapLayerIds: ["rivers-lines"],
    defaultEnabled: false,
  },
];

// Helper to create initial state objects from config
const createLayerState = (value: boolean) => 
  Object.fromEntries(LAYER_CONFIGS.map(c => [c.key, value]));

/* (SA2 helpers kept for later use) */
type PatternKey = "diag" | "cross" | "dot" | "diagGap" | "h" | "v";
const PATTERNS: PatternKey[] = ["diag", "cross", "dot", "diagGap", "h", "v"];
const HATCH_FILES = [
  "diag-16-navy",
  "cross-16-navy",
  "dot-16-navy",
  "diagGap-16-navy",
  "h-16-navy",
  "v-16-navy",
];
function hashStringToIdx(s: string, modulo = PATTERNS.length) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % modulo;
}
async function addImageFromURL(map: MLMap, name: string, url: string) {
  const res = await fetch(url, { cache: "force-cache" });
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  if (!map.hasImage(name)) map.addImage(name, bmp);
}
async function preloadNavyHatches(map: MLMap, base = "/patterns") {
  await Promise.all(
    HATCH_FILES.map((n) => addImageFromURL(map, n, `${base}/${n}.png`))
  );
}
async function addSA2Source(map: MLMap, url = "/data_web/geojson/sa2.geojson") {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`sa2.geojson fetch failed: ${resp.status}`);
  const gj = await resp.json();
  for (const f of gj.features) {
    const key = String(f.properties?.SA2_CODE ?? f.properties?.SA2_NAME ?? "");
    const idx = hashStringToIdx(key);
    f.properties = { ...f.properties, patternKey: HATCH_FILES[idx] };
  }
  map.addSource("sa2", { type: "geojson", data: gj } as any);
}
function addSA2WelcomeLayers(map: MLMap) {
  if (!map.getSource("sa2")) return;
  map.addLayer({
    id: "sa2-underlay",
    type: "fill",
    source: "sa2",
    paint: { "fill-color": "#FFFFFF", "fill-opacity": 0.08 },
  });
  map.addLayer({
    id: "sa2-hatch",
    type: "fill",
    source: "sa2",
    paint: {
      "fill-pattern": ["coalesce", ["get", "patternKey"], "diag-16-navy"],
      "fill-opacity": 1,
    },
  });
  map.addLayer({
    id: "sa2-outline",
    type: "line",
    source: "sa2",
    paint: { "line-color": "#0A2540", "line-width": 0.5 },
  });
}

type DrawMode = "draw_polygon" | "draw_line_string";

function formatDistanceKm(lengthKm: number) {
  return lengthKm >= 1 ? `${lengthKm.toFixed(2)} km` : `${(lengthKm * 1000).toFixed(0)} m`;
}

function formatAreaSqM(area: number) {
  if (area >= 1e6) return `${(area / 1e6).toFixed(2)} km²`;
  if (area >= 1e4) return `${(area / 10000).toFixed(2)} ha`;
  return `${area.toFixed(0)} m²`;
}

function measurementLabel(feature: GeoJSON.Feature): string {
  const type = feature.geometry?.type;
  if (type === "LineString") {
    const lengthKm = turf.length(feature as any, { units: "kilometers" });
    return `Length ${formatDistanceKm(lengthKm)}`;
  }
  if (type === "Polygon") {
    const area = turf.area(feature as any);
    return `Area ${formatAreaSqM(area)}`;
  }
  return type || "";
}

function formatCoordinateLabel(lon: number, lat: number) {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

function buildShareText(lat: number, lon: number, hexId: string | null) {
  const lines = [
    "Echo location",
    `https://maps.google.com/?q=${lat},${lon}`,
    `Coords: ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
  ];
  if (hexId) lines.push(`H3 r8 ${hexId}`);
  return lines.join("\n");
}

/* ================= Lightweight modals (Account/About) ================= */
function SimpleModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.25)",
        zIndex: 2000,
        display: "grid",
        placeItems: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 92vw)",
          background: "#fff",
          border: "1px solid var(--color-line)",
          borderRadius: 10,
          boxShadow: "var(--shadow-panel)",
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <strong>{title}</strong>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "1px solid var(--color-line)",
              background: "#fff",
              width: 24,
              height: 24,
              borderRadius: 6,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ fontSize: 14, color: "#333" }}>
          {children || "Coming soon…"}
        </div>
      </div>
    </div>
  );
}

/* ================= Component ================= */
export default function MapApp() {
  // Map refs/state
  const mapRef = useRef<MLMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const addrMarkerRef = useRef<maplibregl.Marker | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const drawModeRef = useRef<DrawMode | null>(null);
  const measureStateRef = useRef<MeasureState>({ active: false, mode: "line" });
  const drawingTableIdRef = useRef<string | null>(null);
  const focusPointRef = useRef<FocusPoint | null>(null);
  const focusMarkerRef = useRef<maplibregl.Marker | null>(null);
  const focusPopupRef = useRef<maplibregl.Popup | null>(null);
  const focusPopupElsRef = useRef<FocusPopupElements | null>(null);
  const geoMarkerRef = useRef<maplibregl.Marker | null>(null);
  const showSearchUIRef = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressHandledRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  type PanelTab = "search" | "layers" | "input" | "export" | null;
  const [overlayTab, setOverlayTab] = useState<PanelTab>(null);

  type PickSummary = { kind: "location" | "data"; label: string };
  const [showSearchUI, setShowSearchUI] = useState(true);
  const [lastPick, setLastPick] = useState<PickSummary | null>(null);
  const [showToast, setShowToast] = useState(false);

  const [location, setLocation] = useState<LocationState>({
    mode: "idle",
    status: "input",
  });
  const [sections, setSections] = useState<DatasetSection[]>([]);

  // Layer state derived from configuration
  const [layersEnabled, setLayersEnabled] = useState(() => createLayerState(false));
  const [layersLoading, setLayersLoading] = useState(() => createLayerState(false));

  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalPrefill, setAddModalPrefill] = useState<AddModalPrefill | null>(null);
  const [showTablesModal, setShowTablesModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showAddLayerWizard, setShowAddLayerWizard] = useState(false);
  const [showMultiSearchModal, setShowMultiSearchModal] = useState(false);

  const [searchLoading, setSearchLoading] = useState(false);

  const [introVisible, setIntroVisible] = useState(true);
  const [introAnimate, setIntroAnimate] = useState(false);
  const [introFading, setIntroFading] = useState(false);

  const [mapReady, setMapReady] = useState(false);
  const [drawReady, setDrawReady] = useState(false);

  const [drawPaletteOpen, setDrawPaletteOpen] = useState(false);
  const [measurePaletteOpen, setMeasurePaletteOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [measureActive, setMeasureActive] = useState(false);
  const [locating, setLocating] = useState(false);

  const [toolMessage, setToolMessage] = useState<string | null>(null);

  const [hexInfo, setHexInfo] = useState<HexInfo | null>(null);

  const [analysisRadius, setAnalysisRadius] = useState(DEFAULT_RADIUS);
  const [pendingRadius, setPendingRadius] = useState(DEFAULT_RADIUS);
  const [radiusDirty, setRadiusDirty] = useState(false);

  const [placesGroups, setPlacesGroups] = useState({
    cultural: true,
    health: true,
    social: true,
    industrial: true,
    commercial: true,
    other: true,
  });

  const [acctName, setAcctName] = useState("");
  const [acctEmail, setAcctEmail] = useState("");
  const [acctComment, setAcctComment] = useState("");
  const [acctSubmitting, setAcctSubmitting] = useState(false);
  const [acctMessage, setAcctMessage] = useState<string | null>(null);

  const BACKEND_URL =
    process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  const radiusInitializedRef = useRef(false);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style:
        "https://api.maptiler.com/maps/backdrop/style.json?key=" +
        (process.env.NEXT_PUBLIC_MAPTILER_KEY || ""),
      center: [144.96675745, -37.74166955],
      zoom: 10,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "bottom-right"
    );

    map.on("load", async () => {
      setMapReady(true);
      try {
        await preloadNavyHatches(map);
        await addSA2Source(map);
        addSA2WelcomeLayers(map);
      } catch (err) {
        console.warn("[map] failed to preload hatch patterns", err);
      }
    });

    map.on("error", (e) =>
      console.error("[map] error", (e as any)?.error || e)
    );
    mapRef.current = map;

    return () => {
      setMapReady(false);
      try {
        map.remove();
      } catch {}
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    showSearchUIRef.current = showSearchUI;
  }, [showSearchUI]);

  useEffect(() => {
    mapRef.current?.resize();
  }, [panelOpen, showSearchUI]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--dynamic-right-offset",
      panelOpen ? "var(--panel-width)" : "var(--panel-grabber)"
    );
    root.style.setProperty(
      "--collapsed-gap-right",
      "calc(var(--panel-grabber) + 10px)"
    );
    if (!getComputedStyle(root).getPropertyValue("--panel-footer-h")) {
      root.style.setProperty("--panel-footer-h", "26px");
    }
  }, [panelOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (overlayTab) setOverlayTab(null);
        else if (panelOpen) setPanelOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayTab, panelOpen]);

  useEffect(() => {
    const t1 = window.setTimeout(() => setIntroAnimate(true), 500);
    const t2 = window.setTimeout(() => setIntroFading(true), 2500);
    const t3 = window.setTimeout(() => setIntroVisible(false), 3000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    if (!toolMessage) return;
    const timer = window.setTimeout(() => setToolMessage(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toolMessage]);

  useEffect(() => {
    setPendingRadius(analysisRadius);
    setRadiusDirty(false);
  }, [analysisRadius]);

  /* ============== Handlers ============== */
  const toggleOverlay = (tab: Exclude<PanelTab, null>) =>
    setOverlayTab((prev) => (prev === tab ? null : tab));
  const togglePanel = () => setPanelOpen((v) => !v);

  const handleSearchClose = useCallback(() => {
    setShowSearchUI(false);
    setPanelOpen(false);
  }, []);

  const ensureDrawingTable = useCallback(async () => {
    if (drawingTableIdRef.current) return drawingTableIdRef.current;
    const tables = await listTables();
    let match = tables.find((t) => t.name === "Drawn Features");
    if (!match) {
      match = await createTable("Drawn Features");
    }
    drawingTableIdRef.current = match.id;
    return match.id;
  }, []);

  const openAddModal = useCallback((prefill?: AddModalPrefill) => {
    setAddModalPrefill(prefill ?? null);
    setShowAddModal(true);
  }, []);

  const stopMeasurement = useCallback(() => {
    setMeasureActive(false);
    setMeasurePaletteOpen(false);
    drawModeRef.current = null;
    drawRef.current?.changeMode("simple_select");
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = "";
    measureStateRef.current.active = false;
  }, []);

  const restyleDrawLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const lineLayers = [
      "gl-draw-lines",
      "gl-draw-lines.cold",
      "gl-draw-lines.hot",
      "gl-draw-line-inactive.cold",
      "gl-draw-line-inactive.hot",
      "gl-draw-line-active.cold",
      "gl-draw-line-active.hot",
      "gl-draw-line-static.cold",
      "gl-draw-line-static.hot",
      "gl-draw-polygon-stroke-inactive",
      "gl-draw-polygon-stroke-active",
      "gl-draw-polygon-stroke-static",
    ];

    lineLayers.forEach((layerId) => {
      if (!map.getLayer(layerId)) return;
      try {
        map.setPaintProperty(layerId, "line-color", "#dc2626");
        map.setPaintProperty(layerId, "line-width", 4);
        map.setPaintProperty(layerId, "line-opacity", 0.95);
        map.setPaintProperty(layerId, "line-dasharray", [
          "case",
          ["==", ["get", "active"], "true"],
          ["literal", [0.2, 2]],
          ["literal", [2, 0]],
        ]);
      } catch (err) {
        console.warn("[draw] failed to style line layer", layerId, err);
      }
      try {
        map.moveLayer(layerId);
      } catch {}
    });

    const circleLayers = [
      "gl-draw-polygon-and-line-vertex-halo-inactive",
      "gl-draw-polygon-and-line-vertex-halo-active",
      "gl-draw-polygon-midpoint-halo",
      "gl-draw-polygon-and-line-vertex-inactive",
      "gl-draw-polygon-and-line-vertex-active",
      "gl-draw-polygon-midpoint",
    ];

    circleLayers.forEach((layerId) => {
      if (!map.getLayer(layerId)) return;
      try {
        map.setPaintProperty(layerId, "circle-radius", 9);
        map.setPaintProperty(layerId, "circle-color", "#dc2626");
        map.setPaintProperty(layerId, "circle-stroke-color", "#ffffff");
        map.setPaintProperty(layerId, "circle-stroke-width", 2);
        map.setPaintProperty(layerId, "circle-opacity", 0.95);
      } catch (err) {
        console.warn("[draw] failed to style vertex layer", layerId, err);
      }
      try {
        map.moveLayer(layerId);
      } catch {}
    });
  }, []);

  const handleLocate = useCallback(() => {
    const map = mapRef.current;
    if (!map || locating) return;
    if (!navigator.geolocation) {
      setToolMessage("Geolocation not supported on this device");
      return;
    }
    setDrawPaletteOpen(false);
    setMeasurePaletteOpen(false);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        if (!geoMarkerRef.current) {
          geoMarkerRef.current = new maplibregl.Marker({ color: "#0f172a" });
        }
        geoMarkerRef.current.setLngLat([lng, lat]).addTo(map);
        map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14), speed: 1.2 });
        setLocating(false);
      },
      (err) => {
        console.error("[geolocate]", err);
        setToolMessage("Unable to read your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [locating]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      defaultMode: "simple_select",
    });
    drawRef.current = draw;
    map.addControl(draw);
    window.setTimeout(restyleDrawLayers, 0);
    map.on("styledata", restyleDrawLayers);
  setDrawReady(true);

    const handleCreate = async (e: any) => {
      const drawInstance = drawRef.current;
      if (!drawInstance) return;
      const features: GeoJSON.Feature[] = e.features || [];
      for (const base of features) {
        const liveFeature = (drawInstance.get(base.id) as GeoJSON.Feature | undefined) ?? base;
        if (!liveFeature?.geometry) continue;

        if (measureStateRef.current.active) {
          const msg = measurementLabel(liveFeature);
          if (msg) setToolMessage(msg);
          const featureId = liveFeature.id;
          window.setTimeout(() => {
            if (featureId != null) {
              try {
                drawRef.current?.delete(String(featureId));
              } catch {}
            }
            if (measureStateRef.current.active) {
              const nextMode: DrawMode =
                measureStateRef.current.mode === "line" ? "draw_line_string" : "draw_polygon";
              drawRef.current?.changeMode(nextMode);
            }
          }, 150);
          continue;
        }

        const tableId = await ensureDrawingTable();
        const defaultName =
          liveFeature.geometry.type === "LineString"
            ? "Line"
            : liveFeature.geometry.type === "Polygon"
            ? "Area"
            : "Drawing";
        const name = (typeof window === "undefined"
          ? defaultName
          : prompt("Name this shape", defaultName)) || defaultName;
        const rowId =
          typeof liveFeature.id === "string"
            ? liveFeature.id
            : liveFeature.id != null
            ? String(liveFeature.id)
            : crypto.randomUUID();
        const measurement = measurementLabel(liveFeature);
        const rowFeature: GeoJSON.Feature = {
          type: "Feature",
          geometry: liveFeature.geometry,
          properties: {
            ID: rowId,
            name,
            geometryType: liveFeature.geometry.type,
            measurement,
          },
        };
        try {
          await addRow(tableId, rowFeature as any);
        } catch (err) {
          await updateRow(tableId, rowId, {
            props: rowFeature.properties as any,
            geometry: rowFeature.geometry,
          });
        }
        if (liveFeature.id != null) {
          const featureKey = String(liveFeature.id);
          drawInstance.setFeatureProperty(featureKey, "rowId", rowId);
          drawInstance.setFeatureProperty(featureKey, "tableId", tableId);
          drawInstance.setFeatureProperty(featureKey, "name", name);
          drawInstance.setFeatureProperty(featureKey, "measurement", measurement);
        }
        const shapeLabel = liveFeature.geometry.type === "LineString" ? "line" : liveFeature.geometry.type === "Polygon" ? "area" : "shape";
        setToolMessage(
          `Saved ${shapeLabel}${measurement ? " – " + measurement : ""}`
        );
        setIsDrawing(false);
        drawModeRef.current = null;
        const canvas = map.getCanvas();
        canvas.style.cursor = "";
        if (liveFeature.id != null) {
          drawInstance.changeMode("simple_select", { featureIds: [liveFeature.id] });
        } else {
          drawInstance.changeMode("simple_select");
        }
      }
    };

    const handleUpdate = async (e: any) => {
      const drawInstance = drawRef.current;
      const tableId = drawingTableIdRef.current;
      if (!drawInstance || !tableId) return;
      const features: GeoJSON.Feature[] = e.features || [];
      for (const base of features) {
        const liveFeature = (drawInstance.get(base.id) as GeoJSON.Feature | undefined) ?? base;
        if (!liveFeature?.geometry) continue;
        const rowId =
          (liveFeature.properties as any)?.rowId ||
          (typeof liveFeature.id === "string"
            ? liveFeature.id
            : liveFeature.id != null
            ? String(liveFeature.id)
            : undefined);
        if (!rowId) continue;
        const measurement = measurementLabel(liveFeature);
        await updateRow(tableId, rowId, {
          props: { measurement },
          geometry: liveFeature.geometry,
        });
        if (liveFeature.id != null) {
          drawInstance.setFeatureProperty(String(liveFeature.id), "measurement", measurement);
        }
        const shapeUpdatedLabel = liveFeature.geometry.type === "LineString" ? "line" : liveFeature.geometry.type === "Polygon" ? "area" : "shape";
        setToolMessage(
          `Updated ${shapeUpdatedLabel}${measurement ? " – " + measurement : ""}`
        );
      }
    };

    const handleDelete = async (e: any) => {
      const tableId = drawingTableIdRef.current;
      if (!tableId) return;
      const features: any[] = e.features || [];
      let removed = false;
      for (const feat of features) {
        if (!(feat.properties && feat.properties.tableId === tableId)) continue;
        const rowId = feat.properties.rowId || (typeof feat.id === "string" ? feat.id : undefined);
        if (!rowId) continue;
        try {
          await deleteRow(tableId, rowId);
          removed = true;
        } catch {}
      }
      if (removed) setToolMessage("Drawing removed");
    };

    map.on("draw.create", handleCreate);
    map.on("draw.update", handleUpdate);
    map.on("draw.delete", handleDelete);

    return () => {
      map.off("draw.create", handleCreate);
      map.off("draw.update", handleUpdate);
      map.off("draw.delete", handleDelete);
      map.off("styledata", restyleDrawLayers);
      try {
        map.removeControl(draw as any);
      } catch {}
      drawRef.current = null;
      drawModeRef.current = null;
      setIsDrawing(false);
      setMeasureActive(false);
      setDrawPaletteOpen(false);
      setMeasurePaletteOpen(false);
      const canvas = map.getCanvas();
      canvas.style.cursor = "";
      setDrawReady(false);
    };
  }, [mapReady, ensureDrawingTable, restyleDrawLayers]);

  useEffect(() => {
    if (!drawReady || !drawRef.current) return;
    (async () => {
      const tables = await listTables();
      const existing = tables.find((t) => t.name === "Drawn Features");
      if (!existing) return;
      drawingTableIdRef.current = existing.id;
      const bundle = await getTable(existing.id);
      if (!bundle.rows.length) return;
      const features = bundle.rows.map((row) => ({
        id: row.properties.ID,
        type: "Feature",
        geometry: row.geometry,
        properties: {
          ...row.properties,
          rowId: row.properties.ID,
          tableId: existing.id,
        },
      }));
      try {
        drawRef.current?.add(features as any);
      } catch (err) {
        console.warn("[draw] failed to rehydrate features", err);
      }
    })();
  }, [drawReady]);

  /* ============== Backend Layer Functions ============== */

  // Get current map center for backend queries
  const getMapCenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return { lat: -37.8136, lon: 144.9631 };
    const center = map.getCenter();
    return { lat: center.lat, lon: center.lng };
  }, []);

  const getAnalysisOrigin = useCallback(() => {
    const focus = focusPointRef.current;
    if (focus) return { lat: focus.lat, lon: focus.lng };
    if (
      location.mode === "manual" &&
      location.lat != null &&
      location.lon != null
    ) {
      return { lat: location.lat, lon: location.lon };
    }
    if (
      location.mode === "address" &&
      location.lat != null &&
      location.lon != null
    ) {
      return { lat: location.lat, lon: location.lon };
    }
    return getMapCenter();
  }, [location, getMapCenter]);

  const fetchHexDetails = useCallback(
    async (lat: number, lon: number): Promise<HexInfo | null> => {
      try {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lon: lon.toString(),
          res: "8",
        });
        const resp = await fetch(
          `${BACKEND_URL}/api/hex-info?${params.toString()}`
        );
        if (!resp.ok) {
          throw new Error(`Hex info error: ${resp.status}`);
        }
        const data = (await resp.json()) as HexInfo;
        return data;
      } catch (error) {
        console.error("[hex] error fetching info", error);
        return null;
      }
    },
    [BACKEND_URL]
  );

  const handleAccountSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setAcctMessage(null);

      const emailRe = /^\S+@\S+\.\S+$/;
      if (!emailRe.test(acctEmail)) {
        setAcctMessage("Please enter a valid email address.");
        return;
      }
      if (!acctName.trim()) {
        setAcctMessage("Please enter your name.");
        return;
      }

      setAcctSubmitting(true);
      try {
        const payload = {
          name: acctName.trim(),
          email: acctEmail.trim(),
          comment: acctComment.trim(),
          map_center: getMapCenter(),
        };
        const resp = await fetch(`/api/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        const json = await resp.json().catch(() => null);

        if (!resp.ok) {
          setAcctMessage(json?.error || `Signup failed (${resp.status})`);
          return;
        }

        if (json?.ok) {
          setAcctMessage(json.message || "Thanks — you've been added to the wait list.");
          setAcctName("");
          setAcctEmail("");
          setAcctComment("");
          setTimeout(() => setShowAccountModal(false), 1200);
        } else if (json?.message) {
          setAcctMessage(json.message);
        } else {
          setAcctMessage("Signup completed (no message)");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `Unknown error: ${String(error)}`;
        setAcctMessage(`Signup failed: ${message}`);
      } finally {
        setAcctSubmitting(false);
      }
    },
    [acctComment, acctEmail, acctName, getMapCenter]
  );

  const loadPlanningLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, planning: true }));
    try {
  const { lat, lon } = getAnalysisOrigin();
  const radius = Math.max(MIN_RADIUS, analysisRadius);
      const response = await fetch(`${BACKEND_URL}/analyze/zones_h3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          center_lat: lat,
          center_lon: lon,
          layer: "planning_zones",
          res: 8,
          k: radius,
          band_index: radius,
          clip_mode: "disk",
        }),
      });

      if (!response.ok) {
        throw new Error(`Planning zones API error: ${response.status}`);
      }
      const data = await response.json();
      const features =
        data?.features ?? { type: "FeatureCollection", features: [] };

      if (!map.getSource("planning-zones")) {
        map.addSource("planning-zones", {
          type: "geojson",
          data: features,
        });
        map.addLayer({
          id: "planning-fill",
          type: "fill",
          source: "planning-zones",
          layout: { visibility: "visible" },
          paint: {
            "fill-color": PLANNING_FILL_COLOR_EXPRESSION,
            "fill-opacity": 0.6,
          },
        });
        map.addLayer({
          id: "planning-outline",
          type: "line",
          source: "planning-zones",
          layout: { visibility: "visible" },
          paint: { "line-color": "#333", "line-width": 1 },
        });
      } else {
        (map.getSource("planning-zones") as maplibregl.GeoJSONSource).setData(
          features
        );
      }

      console.log("[Planning] Loaded:", data.summary);
    } catch (error) {
      console.error("[Planning] Error:", error);
      alert(
        "Failed to load planning zones. Make sure backend is running on port 8000."
      );
    } finally {
      setLayersLoading((prev) => ({ ...prev, planning: false }));
    }
  }, [BACKEND_URL, analysisRadius, getAnalysisOrigin]);

  const loadParcelsLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, parcels: true }));
    try {
      const { lat, lon } = getAnalysisOrigin();
      const radius = Math.max(MIN_RADIUS, analysisRadius);
      console.log(`[Parcels] Loading from Supabase vic_properties: lat=${lat}, lon=${lon}, k=${radius}`);
      const response = await fetch(
        `${BACKEND_URL}/api/properties?lat=${lat}&lon=${lon}&k=${radius}&res=8`
      );

      if (!response.ok) {
        throw new Error(`Properties API error: ${response.status}`);
      }
      const parcelData = await response.json();

      if (!map.getSource("parcels")) {
        map.addSource("parcels", {
          type: "geojson",
          data: parcelData,
        });
        map.addLayer({
          id: "parcels-outline",
          type: "line",
          source: "parcels",
          layout: { visibility: "visible" },
          paint: {
            "line-color": "#FF0000",
            "line-width": 1,
          },
        });
      } else {
        (map.getSource("parcels") as maplibregl.GeoJSONSource).setData(
          parcelData
        );
      }

      console.log("[Parcels] Loaded:", parcelData.features?.length ?? 0, "features");
    } catch (error) {
      console.error("[Parcels] Error:", error);
      alert("Failed to load property parcels. Make sure backend is running.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, parcels: false }));
    }
  }, [BACKEND_URL, analysisRadius, getAnalysisOrigin]);

  const loadDensityLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, density: true }));
    try {
      const { lat, lon } = getAnalysisOrigin();
      const radius = Math.max(MIN_RADIUS, analysisRadius);
      console.log(`[Density] Loading with params: lat=${lat}, lon=${lon}, k=${radius}, r_work=8`);
      const response = await fetch(
        `${BACKEND_URL}/api/meshblocks?lat=${lat}&lon=${lon}&k=${radius}&r_work=8&layer=density`
      );

      if (!response.ok) {
        throw new Error(`Density API error: ${response.status}`);
      }
      const data = await response.json();
      const densityData =
        data?.density ?? { type: "FeatureCollection", features: [] };

      if (!map.getSource("density")) {
        map.addSource("density", {
          type: "geojson",
          data: densityData,
        });
        map.addLayer({
          id: "density-fill",
          type: "fill",
          source: "density",
          layout: { visibility: "visible" },
          paint: {
            "fill-color": [
              "interpolate",
              ["linear"],
              ["get", "Person"],
              0, "#fef0d9",
              100, "#fdcc8a",
              200, "#fc8d59",
              400, "#d7301f"
            ],
            "fill-opacity": 0.6,
            "fill-outline-color": "#ffffff"
          },
        });
      } else {
        (map.getSource("density") as maplibregl.GeoJSONSource).setData(
          densityData
        );
      }

      console.log("[Density] Loaded:", densityData.features?.length ?? 0, "features");
    } catch (error) {
      console.error("[Density] Error:", error);
      alert("Failed to load density layer. Make sure backend is running.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, density: false }));
    }
  }, [BACKEND_URL, analysisRadius, getAnalysisOrigin]);

  const loadRailLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, rail: true }));
    try {
      const { lat, lon } = getAnalysisOrigin();
      const radius = Math.max(MIN_RADIUS, analysisRadius);
      console.log(`[Rail] Loading from Supabase rail_lines: lat=${lat}, lon=${lon}, k=${radius}`);
      const response = await fetch(
        `${BACKEND_URL}/api/rail?lat=${lat}&lon=${lon}&k=${Math.max(radius, 10)}&res=8`
      );

      if (!response.ok) {
        throw new Error(`Rail API error: ${response.status}`);
      }
      const railData = await response.json();

      if (!map.getSource("rail")) {
        map.addSource("rail", {
          type: "geojson",
          data: railData,
        });
        map.addLayer({
          id: "rail-lines",
          type: "line",
          source: "rail",
          layout: { 
            visibility: "visible",
            "line-join": "round",
            "line-cap": "round"
          },
          paint: {
            "line-color": "#000000",
            "line-width": 3,
          },
        });
      } else {
        (map.getSource("rail") as maplibregl.GeoJSONSource).setData(
          railData
        );
      }

      console.log("[Rail] Loaded:", railData.features?.length ?? 0, "features");
    } catch (error) {
      console.error("[Rail] Error:", error);
      alert("Failed to load rail lines. Make sure backend is running.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, rail: false }));
    }
  }, [BACKEND_URL, analysisRadius, getAnalysisOrigin]);

  const loadFloraLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, flora: true }));
    try {
      const { lat, lon } = getAnalysisOrigin();
      const radius = Math.max(MIN_RADIUS, analysisRadius);
      console.log(`[Flora] Loading from sharded parquet: lat=${lat}, lon=${lon}, k=${radius}`);
      const response = await fetch(
        `${BACKEND_URL}/api/flora?lat=${lat}&lon=${lon}&k=${radius}&r_work=8`
      );

      if (!response.ok) {
        throw new Error(`Flora API error: ${response.status}`);
      }
      const floraData = await response.json();

      // Create EVC color expression (categorized by EVC values)
      // Using a color ramp for different vegetation classes
      const evcColorExpression: any = [
        "match",
        ["get", "EVC"],
        // Top EVCs with distinct colors
        "55", "#228B22",    // Forest Green
        "803", "#32CD32",   // Lime Green
        "175", "#90EE90",   // Light Green
        "132", "#006400",   // Dark Green
        "47", "#7CFC00",    // Lawn Green
        "23", "#ADFF2F",    // Green Yellow
        "22", "#9ACD32",    // Yellow Green
        "96", "#00FF00",    // Lime
        "824", "#00FA9A",   // Medium Spring Green
        "68", "#2E8B57",    // Sea Green
        "16", "#3CB371",    // Medium Sea Green
        "29", "#8FBC8F",    // Dark Sea Green
        "826", "#20B2AA",   // Light Sea Green
        "103", "#66CDAA",   // Medium Aquamarine
        "97", "#7FFFD4",    // Aquamarine
        "3", "#40E0D0",     // Turquoise
        "#98D8C8"           // Default: Light turquoise
      ];

      if (!map.getSource("flora")) {
        map.addSource("flora", {
          type: "geojson",
          data: floraData,
        });
        map.addLayer({
          id: "flora-fill",
          type: "fill",
          source: "flora",
          layout: { visibility: "visible" },
          paint: {
            "fill-color": evcColorExpression,
            "fill-opacity": 0.6,
          },
        });
        map.addLayer({
          id: "flora-outline",
          type: "line",
          source: "flora",
          layout: { visibility: "visible" },
          paint: {
            "line-color": "#2F4F2F",  // Dark Slate Gray
            "line-width": 0.5,
          },
        });
      } else {
        (map.getSource("flora") as maplibregl.GeoJSONSource).setData(
          floraData
        );
      }

      console.log("[Flora] Loaded:", floraData.features?.length ?? 0, "features");
    } catch (error) {
      console.error("[Flora] Error:", error);
      alert("Failed to load flora & fauna layer. Make sure backend is running.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, flora: false }));
    }
  }, [BACKEND_URL, analysisRadius, getAnalysisOrigin]);

  const loadRoadsLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, roads: true }));
    try {
      const { lat, lon } = getAnalysisOrigin();
      const radius = Math.max(MIN_RADIUS, analysisRadius);
      console.log(`[Roads] Loading from sharded parquet: lat=${lat}, lon=${lon}, k=${radius}`);
      const response = await fetch(
        `${BACKEND_URL}/api/roads?lat=${lat}&lon=${lon}&k=${radius}&r_work=8`
      );

      if (!response.ok) {
        throw new Error(`Roads API error: ${response.status}`);
      }
      const roadsData = await response.json();

      if (!map.getSource("roads")) {
        map.addSource("roads", {
          type: "geojson",
          data: roadsData,
        });
        map.addLayer({
          id: "roads-lines",
          type: "line",
          source: "roads",
          layout: { 
            visibility: "visible",
            "line-join": "round",
            "line-cap": "round"
          },
          paint: {
            "line-color": "#888888",
            "line-width": 1.5,
            "line-opacity": 0.8,
          },
        });
      } else {
        (map.getSource("roads") as maplibregl.GeoJSONSource).setData(
          roadsData
        );
      }

      console.log("[Roads] Loaded:", roadsData.features?.length ?? 0, "features");
    } catch (error) {
      console.error("[Roads] Error:", error);
      alert("Failed to load roads layer. Make sure backend is running.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, roads: false }));
    }
  }, [BACKEND_URL, analysisRadius, getAnalysisOrigin]);

  const loadContoursLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, contours: true }));
    try {
      const { lat, lon } = getAnalysisOrigin();
      const radius = Math.max(MIN_RADIUS, analysisRadius);
      console.log(`[Contours] Loading from sharded parquet: lat=${lat}, lon=${lon}, k=${radius}`);
      const response = await fetch(
        `${BACKEND_URL}/api/contours?lat=${lat}&lon=${lon}&k=${radius}&r_work=8`
      );

      if (!response.ok) {
        throw new Error(`Contours API error: ${response.status}`);
      }
      const contoursData = await response.json();

      if (!map.getSource("contours")) {
        map.addSource("contours", {
          type: "geojson",
          data: contoursData,
        });
        map.addLayer({
          id: "contours-lines",
          type: "line",
          source: "contours",
          layout: { 
            visibility: "visible",
            "line-join": "round",
            "line-cap": "round"
          },
          paint: {
            "line-color": "#8B4513",  // Saddle brown for elevation
            "line-width": 0.8,
            "line-opacity": 0.6,
          },
        });
      } else {
        (map.getSource("contours") as maplibregl.GeoJSONSource).setData(
          contoursData
        );
      }

      console.log("[Contours] Loaded:", contoursData.features?.length ?? 0, "features");
    } catch (error) {
      console.error("[Contours] Error:", error);
      alert("Failed to load contours layer. Make sure backend is running.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, contours: false }));
    }
  }, [BACKEND_URL, analysisRadius, getAnalysisOrigin]);

  const loadPowerlinesLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, powerlines: true }));
    try {
      const { lat, lon } = getAnalysisOrigin();
      const radius = Math.max(MIN_RADIUS, analysisRadius);
      console.log(`[Powerlines] Loading from sharded parquet: lat=${lat}, lon=${lon}, k=${radius}`);
      const response = await fetch(
        `${BACKEND_URL}/api/powerlines?lat=${lat}&lon=${lon}&k=${radius}&r_work=8`
      );

      if (!response.ok) {
        throw new Error(`Powerlines API error: ${response.status}`);
      }
      const powerlinesData = await response.json();

      if (!map.getSource("powerlines")) {
        map.addSource("powerlines", {
          type: "geojson",
          data: powerlinesData,
        });
        map.addLayer({
          id: "powerlines-lines",
          type: "line",
          source: "powerlines",
          layout: { 
            visibility: "visible",
            "line-join": "round",
            "line-cap": "round"
          },
          paint: {
            "line-color": "#FFD700",  // Gold for power lines
            "line-width": 2,
            "line-opacity": 0.9,
          },
        });
      } else {
        (map.getSource("powerlines") as maplibregl.GeoJSONSource).setData(
          powerlinesData
        );
      }

      console.log("[Powerlines] Loaded:", powerlinesData.features?.length ?? 0, "features");
    } catch (error) {
      console.error("[Powerlines] Error:", error);
      alert("Failed to load power lines layer. Make sure backend is running.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, powerlines: false }));
    }
  }, [BACKEND_URL, analysisRadius, getAnalysisOrigin]);

  const loadRiversLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, rivers: true }));
    try {
      const { lat, lon } = getAnalysisOrigin();
      const radius = Math.max(MIN_RADIUS, analysisRadius);
      console.log(`[Rivers] Loading from sharded parquet: lat=${lat}, lon=${lon}, k=${radius}`);
      const response = await fetch(
        `${BACKEND_URL}/api/rivers?lat=${lat}&lon=${lon}&k=${radius}&r_work=8`
      );

      if (!response.ok) {
        throw new Error(`Rivers API error: ${response.status}`);
      }
      const riversData = await response.json();

      if (!map.getSource("rivers")) {
        map.addSource("rivers", {
          type: "geojson",
          data: riversData,
        });
        map.addLayer({
          id: "rivers-lines",
          type: "line",
          source: "rivers",
          layout: { 
            visibility: "visible",
            "line-join": "round",
            "line-cap": "round"
          },
          paint: {
            "line-color": [
              "match",
              ["get", "river_type"],
              "priority", "#1E90FF",  // Dodger blue for priority rivers
              "modified", "#4682B4",  // Steel blue for modified rivers
              "#1E90FF"  // Default to dodger blue
            ],
            "line-width": [
              "match",
              ["get", "river_type"],
              "priority", 2.5,  // Wider for priority rivers
              "modified", 1.5,  // Narrower for modified rivers
              2
            ],
            "line-opacity": 0.8,
          },
        });
      } else {
        (map.getSource("rivers") as maplibregl.GeoJSONSource).setData(
          riversData
        );
      }

      console.log("[Rivers] Loaded:", riversData.features?.length ?? 0, "features");
    } catch (error) {
      console.error("[Rivers] Error:", error);
      alert("Failed to load rivers layer. Make sure backend is running.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, rivers: false }));
    }
  }, [BACKEND_URL, analysisRadius, getAnalysisOrigin]);

  const loadMeshBlocksLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, meshBlocks: true }));
    try {
      const { lat, lon } = getAnalysisOrigin();
      const radius = Math.max(MIN_RADIUS, analysisRadius);
      console.log(`[Mesh Blocks] Loading with params: lat=${lat}, lon=${lon}, k=${radius}, r_work=8`);
      const response = await fetch(
        `${BACKEND_URL}/api/meshblocks?lat=${lat}&lon=${lon}&k=${radius}&r_work=8&layer=mesh`
      );

      if (!response.ok) {
        throw new Error(`Mesh blocks API error: ${response.status}`);
      }
      const data = await response.json();
      const meshData =
        data?.mesh_blocks ?? { type: "FeatureCollection", features: [] };

      if (!map.getSource("mesh-blocks")) {
        map.addSource("mesh-blocks", {
          type: "geojson",
          data: meshData,
        });
        map.addLayer({
          id: "mesh-fill",
          type: "fill",
          source: "mesh-blocks",
          layout: { visibility: "visible" },
          paint: {
            "fill-color": "#000000",
            "fill-opacity": 0,
          },
        });
        map.addLayer({
          id: "mesh-outline",
          type: "line",
          source: "mesh-blocks",
          layout: { visibility: "visible" },
          paint: {
            "line-color": "#FFA500",
            "line-width": 1,
          },
        });
      } else {
        (map.getSource("mesh-blocks") as maplibregl.GeoJSONSource).setData(
          meshData
        );
      }

      console.log("[Mesh Blocks] Loaded:", meshData.features?.length ?? 0, "features");
    } catch (error) {
      console.error("[Mesh Blocks] Error:", error);
      alert("Failed to load mesh blocks. Make sure backend is running.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, meshBlocks: false }));
    }
  }, [BACKEND_URL, analysisRadius, getAnalysisOrigin]);

  const loadSA2Layer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, sa2: true }));
    try {
      const { lat, lon } = getAnalysisOrigin();
      const radius = Math.max(MIN_RADIUS, analysisRadius);
      
      // Use PostGIS endpoint for SA2 boundaries
      const response = await fetch(`${BACKEND_URL}/analyze/zones_h3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          center_lat: lat,
          center_lon: lon,
          layer: "sa2",
          res: 8,
          k: radius,
          band_index: radius,
          clip_mode: "disk",
        }),
      });

      if (!response.ok) {
        throw new Error(`SA2 API error: ${response.status}`);
      }
      const data = await response.json();
      const features = data?.features ?? { type: "FeatureCollection", features: [] };
      
      const greenPatterns = [
        "cross-24-green",
        "diag-24-green",
        "dot-24-green",
        "diagGap-24-green",
        "h-24-green",
      ];

      for (const patternName of greenPatterns) {
        if (!map.hasImage(patternName)) {
          const patternUrl = `/patterns/${patternName}.png`;
          const res = await fetch(patternUrl, { cache: "force-cache" });
          const blob = await res.blob();
          const bmp = await createImageBitmap(blob);
          map.addImage(patternName, bmp);
        }
      }

      if (features.features) {
        features.features.forEach((feature: any) => {
          const randomIndex = Math.floor(Math.random() * greenPatterns.length);
          feature.properties = {
            ...feature.properties,
            patternKey: greenPatterns[randomIndex],
          };
        });
      }

      if (!map.getSource("sa2")) {
        map.addSource("sa2", {
          type: "geojson",
          data: features,
        });
        map.addLayer({
          id: "sa2-fill",
          type: "fill",
          source: "sa2",
          layout: { visibility: "visible" },
          paint: {
            "fill-pattern": ["get", "patternKey"],
            "fill-opacity": 1,
          },
        });
        map.addLayer({
          id: "sa2-outline",
          type: "line",
          source: "sa2",
          layout: { visibility: "visible" },
          paint: { "line-color": "#333", "line-width": 1 },
        });
        // Add persistent labels for SA2 names
        map.addLayer({
          id: "sa2-labels",
          type: "symbol",
          source: "sa2",
          layout: {
            visibility: "visible",
            "text-field": ["get", "SA2_NAME21"],
            "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
            "text-size": 12,
            "text-anchor": "center",
            "text-allow-overlap": false,
            "text-ignore-placement": false,
          },
          paint: {
            "text-color": "#1f2937",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2,
            "text-opacity": 0.9,
          },
        });
      } else {
        (map.getSource("sa2") as maplibregl.GeoJSONSource).setData(features);
      }

      console.log("[SA2] Loaded:", features.features?.length ?? 0, "features");
    } catch (error) {
      console.error("[SA2] Error:", error);
      alert("Failed to load SA2 boundaries.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, sa2: false }));
    }
  }, [BACKEND_URL, analysisRadius, getAnalysisOrigin]);

  const updatePlacesFilter = useCallback(
    (map?: maplibregl.Map) => {
      const target = map ?? mapRef.current;
      if (!target || !target.getLayer("places-circles")) return;

      const enabledGroups = Object.keys(placesGroups).filter(
        (key) => placesGroups[key as keyof typeof placesGroups]
      );

      if (enabledGroups.length === 0) {
        target.setFilter("places-circles", ["==", "group", "NONE"]);
      } else {
        target.setFilter("places-circles", [
          "in",
          ["get", "group"],
          ["literal", enabledGroups],
        ]);
      }
    },
    [placesGroups]
  );

  const loadPlacesLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, places: true }));
    try {
  const { lat, lon } = getAnalysisOrigin();
  const radius = Math.max(MIN_RADIUS, analysisRadius);
      const response = await fetch(
        `${BACKEND_URL}/api/places?lat=${lat}&lon=${lon}&k=${radius}&r_work=8&r_shard=7`
      );

      if (!response.ok) {
        throw new Error(`Places API error: ${response.status}`);
      }
      const data = await response.json();

      if (!map.getSource("places")) {
        map.addSource("places", {
          type: "geojson",
          data,
        });
        map.addLayer({
          id: "places-circles",
          type: "circle",
          source: "places",
          layout: { visibility: "visible" },
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              8,
              3,
              14,
              7,
            ],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1,
          },
        });
      } else {
        (map.getSource("places") as maplibregl.GeoJSONSource).setData(data);
        // Move places layer to top
        if (map.getLayer("places-circles")) {
          map.moveLayer("places-circles");
        }
      }

      updatePlacesFilter(map);

      console.log("[Places] Loaded:", data.summary);
    } catch (error) {
      console.error("[Places] Error:", error);
      alert("Failed to load places. Make sure backend is running.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, places: false }));
    }
  }, [BACKEND_URL, analysisRadius, getAnalysisOrigin, updatePlacesFilter]);

  const reloadActiveLayers = useCallback((currentLayersEnabled: typeof layersEnabled) => {
    // Loader function mapping
    const loaders: Record<string, () => void> = {
      planning: loadPlanningLayer,
      parcels: loadParcelsLayer,
      meshBlocks: loadMeshBlocksLayer,
      sa2: loadSA2Layer,
      places: loadPlacesLayer,
      density: loadDensityLayer,
      rail: loadRailLayer,
      flora: loadFloraLayer,
      roads: loadRoadsLayer,
      contours: loadContoursLayer,
      powerlines: loadPowerlinesLayer,
      rivers: loadRiversLayer,
    };

    // Reload all enabled layers
    LAYER_CONFIGS.forEach(config => {
      if (currentLayersEnabled[config.key]) {
        loaders[config.key]?.();
      }
    });
  }, [
    loadPlanningLayer,
    loadParcelsLayer,
    loadMeshBlocksLayer,
    loadSA2Layer,
    loadPlacesLayer,
    loadDensityLayer,
    loadRailLayer,
    loadFloraLayer,
    loadRoadsLayer,
    loadContoursLayer,
    loadPowerlinesLayer,
    loadRiversLayer,
  ]);

  const handleRadiusApply = useCallback(() => {
    if (pendingRadius === analysisRadius) return;
    setAnalysisRadius(pendingRadius);
    setToolMessage("Radius updated");
  }, [analysisRadius, pendingRadius]);

  useEffect(() => {
    if (!mapReady) return;
    reloadActiveLayers(layersEnabled);
  }, [analysisRadius, mapReady, reloadActiveLayers]);

  const focusMapOnPoint = useCallback(
    async (lon: number, lat: number) => {
      const map = mapRef.current;
      if (!map) return;

      const label = formatCoordinateLabel(lon, lat);
      setLocation({ mode: "manual", label, lon, lat, status: "input" });
      setLastPick({ kind: "location", label });
      setShowToast(true);
      setPanelOpen(false);

      if (addrMarkerRef.current) addrMarkerRef.current.remove();
      addrMarkerRef.current = new maplibregl.Marker({ color: "#e86017" })
        .setLngLat([lon, lat])
        .addTo(map);

      map.flyTo({
        center: [lon, lat],
        zoom: Math.max(map.getZoom(), UX.addressFlyToZoom),
        speed: 1.2,
      });

      const current = focusPointRef.current;
      const samePoint =
        current && Math.abs(current.lng - lon) < 1e-9 && Math.abs(current.lat - lat) < 1e-9;
      let detail: HexInfo | null = samePoint ? current?.detail ?? null : null;
      if (!detail) {
        detail = await fetchHexDetails(lat, lon);
      }
      if (current && samePoint) {
        current.detail = detail;
      }
      if (detail) {
        setHexInfo(detail);
      } else {
        setHexInfo(null);
      }

      map.once("moveend", () => reloadActiveLayers(layersEnabled));
    },
    [
      fetchHexDetails,
      reloadActiveLayers,
    ]
  );

  const closeFocusPopup = useCallback(() => {
    focusPopupRef.current?.remove();
    focusPopupRef.current = null;
    focusPopupElsRef.current = null;
    focusMarkerRef.current?.remove();
    focusMarkerRef.current = null;
    focusPointRef.current = null;
  }, []);

  const openFocusPopup = useCallback(
    (lon: number, lat: number) => {
      const map = mapRef.current;
      if (!map) return;

      const label = formatCoordinateLabel(lon, lat);
      focusPointRef.current = { lng: lon, lat, label, detail: null };

      if (!focusMarkerRef.current) {
        const markerEl = document.createElement("div");
        markerEl.className = "map-focus-marker";
        focusMarkerRef.current = new maplibregl.Marker({
          element: markerEl,
          anchor: "bottom",
        });
      }
      focusMarkerRef.current.setLngLat([lon, lat]).addTo(map);

      const container = document.createElement("div");
      container.className = "map-focus-popup";

      const header = document.createElement("div");
      header.className = "map-focus-popup__header";

      const statusEl = document.createElement("div");
      statusEl.className = "map-focus-popup__status";
      statusEl.textContent = label;

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "map-focus-popup__close";
      closeBtn.textContent = "×";
      closeBtn.addEventListener("click", () => closeFocusPopup());

      header.appendChild(statusEl);
      header.appendChild(closeBtn);
      container.appendChild(header);

      const actions = document.createElement("div");
      actions.className = "map-focus-popup__actions";

      const focusBtn = document.createElement("button");
      focusBtn.type = "button";
      focusBtn.className = "map-focus-popup__btn";
      focusBtn.textContent = "Focus here";
      focusBtn.addEventListener("click", () => {
        closeFocusPopup();
        focusMapOnPoint(lon, lat);
      });

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "map-focus-popup__btn";
      addBtn.textContent = "Add to table";
      addBtn.addEventListener("click", async () => {
        const current = focusPointRef.current;
        if (!current) return;
        let detail = current.detail ?? null;
        if (!detail) {
          detail = await fetchHexDetails(lat, lon);
          if (focusPointRef.current === current) {
            focusPointRef.current.detail = detail;
          }
        }
        openAddModal({
          lon,
          lat,
          name: detail?.sa2_name || current.label,
          h3: detail?.hex_id ?? undefined,
        });
        closeFocusPopup();
      });

      const shareBtn = document.createElement("button");
      shareBtn.type = "button";
      shareBtn.className = "map-focus-popup__btn";
      shareBtn.textContent = "Share location";
      shareBtn.addEventListener("click", async () => {
        const current = focusPointRef.current;
        let detail = current?.detail ?? null;
        if (!detail) {
          detail = await fetchHexDetails(lat, lon);
          if (current && focusPointRef.current === current) {
            focusPointRef.current.detail = detail;
          }
        }
        const text = buildShareText(lat, lon, detail?.hex_id ?? null);
        let handled = false;
        if (navigator.share && typeof navigator.share === "function") {
          try {
            await navigator.share({ title: "Echo location", text });
            handled = true;
          } catch {}
        }
        if (!handled) {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(text);
            } else {
              const textarea = document.createElement("textarea");
              textarea.value = text;
              textarea.style.position = "fixed";
              textarea.style.opacity = "0";
              document.body.appendChild(textarea);
              textarea.focus();
              textarea.select();
              document.execCommand("copy");
              document.body.removeChild(textarea);
            }
            setToolMessage("Copied to clipboard");
          } catch (err) {
            console.error("[share]", err);
            setToolMessage("Unable to share location");
          }
        }
      });

      actions.appendChild(focusBtn);
      actions.appendChild(addBtn);
      actions.appendChild(shareBtn);
      container.appendChild(actions);

      const popup =
        focusPopupRef.current ??
        new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: [0, 20] });
      popup.setDOMContent(container);
      popup.setLngLat([lon, lat]);
      popup.addTo(map);
      focusPopupRef.current = popup;
      focusPopupElsRef.current = { container, statusEl };

      fetchHexDetails(lat, lon).then((detail) => {
        const current = focusPointRef.current;
        if (!current || current.lng !== lon || current.lat !== lat) return;
        current.detail = detail;
        if (detail && focusPopupElsRef.current?.statusEl) {
          const sa2Part = detail.sa2_name || label;
          focusPopupElsRef.current.statusEl.textContent = sa2Part;
        }
      });
    },
    [closeFocusPopup, fetchHexDetails, focusMapOnPoint, openAddModal]
  );

  const startDraw = useCallback(
    (mode: DrawMode) => {
      const map = mapRef.current;
      const draw = drawRef.current;
      if (!map || !draw) return;
      stopMeasurement();
      closeFocusPopup();
      setIsDrawing(true);
      setDrawPaletteOpen(false);
      drawModeRef.current = mode;
      draw.changeMode(mode);
      map.getCanvas().style.cursor = "crosshair";
    },
    [stopMeasurement, closeFocusPopup]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setDrawPaletteOpen(false);
    drawModeRef.current = null;
    drawRef.current?.changeMode("simple_select");
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = "";
  }, []);

  const startMeasurement = useCallback((mode: "line" | "polygon") => {
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!map || !draw) return;
    closeFocusPopup();
    setMeasureActive(true);
    setMeasurePaletteOpen(false);
    setDrawPaletteOpen(false);
    setIsDrawing(false);
    const drawMode: DrawMode = mode === "line" ? "draw_line_string" : "draw_polygon";
    drawModeRef.current = drawMode;
    draw.changeMode(drawMode);
    map.getCanvas().style.cursor = "crosshair";
    measureStateRef.current.active = true;
    measureStateRef.current.mode = mode;
  }, [closeFocusPopup]);

  // Update filter when group toggles change
  useEffect(() => {
    if (layersEnabled.places) {
      updatePlacesFilter();
    }
  }, [placesGroups, layersEnabled.places, updatePlacesFilter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const allowPopup = () =>
      !drawModeRef.current &&
      !measureStateRef.current.active &&
      !showSearchUIRef.current &&
      !showAddModal;

    const handleClick = (e: maplibregl.MapMouseEvent & { originalEvent?: any }) => {
      if (!allowPopup()) return;
      if (e.originalEvent?.button !== 0) return;
      if (longPressHandledRef.current) {
        longPressHandledRef.current = false;
        return;
      }
      const mapInstance = mapRef.current;
      if (!mapInstance) return;
      
      // Check for planning zones click
      const planningHits = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["planning-fill", "planning-outline"].filter((id) => mapInstance.getLayer(id)),
      });
      if (planningHits.length > 0) {
        const feature = planningHits[0];
        const zoneCode = feature.properties?.zone_code || feature.properties?.ZONE_CODE || "Unknown";
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<div style="padding: 4px 8px; font-size: 12px;"><strong>Planning Zone:</strong> ${zoneCode}</div>`)
          .addTo(mapInstance);
        return;
      }
      
      // Check for SA2 click
      const sa2Hits = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["sa2-fill", "sa2-outline"].filter((id) => mapInstance.getLayer(id)),
      });
      if (sa2Hits.length > 0) {
        const feature = sa2Hits[0];
        const sa2Name = feature.properties?.SA2_NAME21 || feature.properties?.sa2_name || "Unknown";
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<div style="padding: 4px 8px; font-size: 12px;"><strong>SA2:</strong> ${sa2Name}</div>`)
          .addTo(mapInstance);
        return;
      }
      
      // Check for Places (POI) click
      const placesHits = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["places-circles"].filter((id) => mapInstance.getLayer(id)),
      });
      if (placesHits.length > 0) {
        const feature = placesHits[0];
        const name = feature.properties?.name || "Unknown";
        const group = feature.properties?.group || "N/A";
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<div style="padding: 4px 8px; font-size: 12px;"><strong>${name}</strong><br><span style="color: #666;">${group}</span></div>`)
          .addTo(mapInstance);
        return;
      }
      
      // Check for density layer click
      const densityHits = mapInstance.queryRenderedFeatures(e.point, {
        layers: ["density-fill"].filter((id) => mapInstance.getLayer(id)),
      });
      if (densityHits.length > 0) {
        const feature = densityHits[0];
        const mbCode = feature.properties?.MB_CODE21 ?? "N/A";
        const sa2Code = feature.properties?.SA2_CODE21 ?? "";
        const person = feature.properties?.Person ?? "N/A";
        const dwelling = feature.properties?.Dwelling ?? "N/A";
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<div style="padding: 4px 8px; font-size: 12px;"><strong>MB:</strong> ${mbCode}${sa2Code ? '<br><strong>SA2:</strong> ' + sa2Code : ''}<br><strong>Person:</strong> ${person}<br><strong>Dwelling:</strong> ${dwelling}</div>`)
          .addTo(mapInstance);
        return;
      }
      
      // Check for other interactive layers (no tooltip, just prevent focus popup)
      const interactiveLayers = [
        "parcels-outline",
        "mesh-fill",
        "mesh-outline",
      ].filter((layerId) => mapInstance.getLayer(layerId));
      if (interactiveLayers.length) {
        const hits = mapInstance.queryRenderedFeatures(e.point, {
          layers: interactiveLayers,
        });
        if (hits.length) return;
      }
      openFocusPopup(e.lngLat.lng, e.lngLat.lat);
    };

    const handleContext = (e: any) => {
      if (!allowPopup()) return;
      if (typeof e.preventDefault === "function") e.preventDefault();
      openFocusPopup(e.lngLat.lng, e.lngLat.lat);
    };

    const cancelLongPress = () => {
      if (longPressTimerRef.current != null) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handleTouchStart = (e: any) => {
      if (!allowPopup()) return;
      const touches = e.originalEvent?.touches?.length ?? 0;
      if (touches > 1) {
        cancelLongPress();
        return;
      }
      touchStartRef.current = { x: e.point.x, y: e.point.y };
      longPressHandledRef.current = false;
      cancelLongPress();
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        longPressHandledRef.current = true;
        const { lng, lat } = e.lngLat;
        if (typeof navigator.vibrate === "function") navigator.vibrate(35);
        openFocusPopup(lng, lat);
      }, 550);
    };

    const handleTouchMove = (e: any) => {
      if (longPressTimerRef.current == null || !touchStartRef.current) return;
      const dx = e.point.x - touchStartRef.current.x;
      const dy = e.point.y - touchStartRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 12) {
        cancelLongPress();
      }
    };

    const handleTouchEnd = () => {
      if (longPressTimerRef.current != null) {
        cancelLongPress();
      }
      touchStartRef.current = null;
    };

    map.on("click", handleClick);
    map.on("contextmenu", handleContext);
    map.on("touchstart", handleTouchStart);
    map.on("touchmove", handleTouchMove);
    map.on("touchend", handleTouchEnd);
    map.on("touchcancel", handleTouchEnd);

    return () => {
      map.off("click", handleClick);
      map.off("contextmenu", handleContext);
      map.off("touchstart", handleTouchStart);
      map.off("touchmove", handleTouchMove);
      map.off("touchend", handleTouchEnd);
      map.off("touchcancel", handleTouchEnd);
      cancelLongPress();
      longPressHandledRef.current = false;
      touchStartRef.current = null;
    };
  }, [mapReady, openFocusPopup]);

  // Toggle layer visibility
  const toggleLayer = useCallback(
    (layerKey: string) => {
      const map = mapRef.current;
      if (!map) return;

      const config = LAYER_CONFIGS.find(c => c.key === layerKey);
      if (!config) return;

      const newEnabled = !layersEnabled[layerKey];
      setLayersEnabled((prev) => ({ ...prev, [layerKey]: newEnabled }));

      if (newEnabled) {
        // Check if layers already exist
        const layersExist = config.mapLayerIds.every((id) => map.getLayer(id));

        if (layersExist) {
          // Just make them visible
          config.mapLayerIds.forEach((id) => {
            map.setLayoutProperty(id, "visibility", "visible");
          });
        }

        // Call the appropriate loader function
        const loaders: Record<string, () => void> = {
          planning: loadPlanningLayer,
          parcels: loadParcelsLayer,
          meshBlocks: loadMeshBlocksLayer,
          sa2: loadSA2Layer,
          places: loadPlacesLayer,
          density: loadDensityLayer,
          rail: loadRailLayer,
          flora: loadFloraLayer,
        };
        
        loaders[layerKey]?.();
      } else {
        // Hide layer
        config.mapLayerIds.forEach((id) => {
          if (map.getLayer(id)) {
            map.setLayoutProperty(id, "visibility", "none");
          }
        });
      }
    },
    [layersEnabled, loadPlanningLayer, loadParcelsLayer, loadMeshBlocksLayer, loadSA2Layer, loadPlacesLayer, loadDensityLayer, loadRailLayer, loadFloraLayer]
  );

  /* ============== Original Handlers ============== */

  const handlePick = useCallback((it: SuggestItem) => {
    if (it.tag === "Address") {
      setLocation({
        mode: "address",
        label: it.label,
        lon: it.lon ?? undefined,
        lat: it.lat ?? undefined,
        status: "input",
      });
      setLastPick({ kind: "location", label: it.label });

      // Fetch hex enrichment data
      if (it.lon != null && it.lat != null) {
        fetchHexDetails(it.lat, it.lon).then((data) => {
          setHexInfo(data ?? null);
        });
      }

      if (mapRef.current && it.lon != null && it.lat != null) {
        const map = mapRef.current;

        // Remember which layers were enabled before clearing
        const wasEnabled = { ...layersEnabled };

        // Temporarily disable all layers and hide them on the map
        setLayersEnabled(createLayerState(false));

        // Hide all layer visuals on the map
        const allLayerIds = LAYER_CONFIGS.flatMap(c => c.mapLayerIds);
        allLayerIds.forEach((id) => {
          if (map.getLayer(id)) {
            map.setLayoutProperty(id, "visibility", "none");
          }
        });

        // Fly to new location
        map.flyTo({
          center: [it.lon, it.lat],
          zoom: UX.addressFlyToZoom,
          speed: 1.2,
        });

        // Once the map finishes moving, restore previously enabled layers
        map.once("moveend", () => {
          // Restore layer enabled state
          setLayersEnabled(wasEnabled);
          
          // Make layers visible
          LAYER_CONFIGS.forEach(config => {
            if (wasEnabled[config.key]) {
              config.mapLayerIds.forEach((id) => {
                if (map.getLayer(id)) {
                  map.setLayoutProperty(id, "visibility", "visible");
                }
              });
            }
          });
          
          reloadActiveLayers(wasEnabled);
        });

        if (addrMarkerRef.current) addrMarkerRef.current.remove();
        addrMarkerRef.current = new maplibregl.Marker({ color: "#e86017" })
          .setLngLat([it.lon, it.lat])
          .addTo(map);
      }
      setShowToast(true);
      setPanelOpen(false);
    } else {
      const id = Math.random().toString(36).slice(2, 9);
      const ds: DatasetSection = { id, status: "input" };
      if ((it as any).key === "planning_zones") ds.dataset = "planning_zones";
      else if ((it as any).key === "sa2") ds.dataset = "sa2";
      else if ((it as any).key?.startsWith("pois")) ds.dataset = "pois";
      else if ((it as any).key === "dwell_struct") ds.dataset = "dwell_struct";
      setSections((prev) => [ds, ...prev]);
      if (it.tag === "Areas")
        setLocation({ mode: "area", label: it.label, status: "input" });

      const dsLabel = ds.dataset
        ? String(ds.dataset).replaceAll("_", " ")
        : it.label;
      setLastPick({ kind: "data", label: dsLabel });

      setPanelOpen(true);
      setOverlayTab("layers");
    }
  }, [layersEnabled, loadPlanningLayer, loadParcelsLayer, loadMeshBlocksLayer, loadSA2Layer, loadPlacesLayer, loadDensityLayer, loadRailLayer, loadFloraLayer, reloadActiveLayers]);

  /* ============== Render ============== */
  return (
    <div
      className="relative h-screen w-screen"
      style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
    >
      {/* Small global overrides + spinning logo + intro styles */}
      <style jsx global>{`
        .searchbar-wrapper input {
          border-radius: 0 !important;
        }
        .chev-ico {
          width: 12px;
          height: 12px;
          display: inline-block;
          background-repeat: no-repeat;
          background-size: contain;
          background-position: center;
        }
        .chev-ico.closed {
          background-image: url("/icons/chev-closed.svg");
        }
        .chev-ico.open {
          background-image: url("/icons/chev-open.svg");
        }
        .chev-ico:empty::after {
          content: "›";
          font-size: 12px;
          line-height: 12px;
          display: block;
        }

        .echo-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .echo-title .echo-logo {
          width: 20px;
          height: 20px;
          object-fit: contain;
        }
        .echo-title .spin {
          animation: echo-spin 800ms linear infinite;
        }
        @keyframes echo-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .map-tool-stack {
          position: fixed;
          right: 16px;
          bottom: 148px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 900;
        }
        .map-tool-wrapper {
          position: relative;
        }
        .map-tool-btn {
          width: 30px;
          height: 30px;
          border-radius: 7px;
          border: 1px solid #0a2540;
          background: #fff;
          display: grid;
          place-items: center;
          cursor: pointer;
          transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
        }
        .map-tool-btn svg {
          width: 16px;
          height: 16px;
        }
        .map-tool-btn.active {
          background: #0f172a;
          color: #fff;
          border-color: #0f172a;
        }
        .map-tool-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .map-tool-palette {
          position: absolute;
          right: 46px;
          top: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 6px;
          background: #fff;
          border: 1px solid #cbd5f5;
          border-radius: 8px;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.15);
          min-width: 132px;
        }
        .map-tool-sub-btn {
          font-size: 12px;
          border: 1px solid #cbd5f5;
          border-radius: 6px;
          padding: 4px 8px;
          background: #fff;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .map-tool-sub-btn:hover {
          background: #f1f5f9;
        }
        .map-tool-toast {
          position: fixed;
          right: 20px;
          bottom: 248px;
          background: rgba(15, 23, 42, 0.9);
          color: #fff;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          z-index: 980;
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.25);
          max-width: 220px;
          pointer-events: none;
        }

        .map-focus-marker {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #dc2626;
          border: 3px solid #ffffff;
          box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.7),
            0 2px 12px rgba(15, 23, 42, 0.35);
        }

        .map-focus-popup {
          min-width: 180px;
          background: #fff;
          border-radius: 10px;
          border: 1px solid #cbd5f5;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
          font-size: 12px;
          color: #0f172a;
        }
        .map-focus-popup__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 10px 0 12px;
          font-weight: 600;
        }
        .map-focus-popup__status {
          flex: 1;
          line-height: 1.35;
        }
        .map-focus-popup__close {
          border: none;
          background: none;
          color: #475569;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
        }
        .map-focus-popup__close:hover {
          color: #1f2937;
        }
        .map-focus-popup__actions {
          display: grid;
          gap: 6px;
          padding: 10px 12px 12px;
        }
        .map-focus-popup__btn {
          border: 1px solid #cbd5f5;
          border-radius: 6px;
          padding: 6px 10px;
          background: #fff;
          text-align: left;
          cursor: pointer;
          transition: background 0.12s ease, border-color 0.12s ease;
        }
        .map-focus-popup__btn:hover {
          background: #f8fafc;
          border-color: #94a3b8;
        }

        /* Intro overlay */
        .intro-overlay {
          position: fixed;
          inset: 0;
          background: #fff;
          z-index: 3000;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 1;
          transition: opacity 500ms ease;
          pointer-events: auto;
        }
        .intro-overlay.fade {
          opacity: 0;
          pointer-events: none;
        }

        /* Intro content centered on screen */
        .intro-shell {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .intro-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #1b1b1b;
        }
        .intro-gif {
          width: 30px;
          height: 30px;
          object-fit: contain;
        }

        /* word-by-word bounce in */
        .intro-word {
          opacity: 0;
          transform: translateX(16px);
        }
        .intro-animate .intro-word {
          animation: intro-bounce 500ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .intro-word[data-i="0"] {
          animation-delay: 0s;
        }
        .intro-word[data-i="1"] {
          animation-delay: 0.08s;
        }
        .intro-word[data-i="2"] {
          animation-delay: 0.16s;
        }
        .intro-word[data-i="3"] {
          animation-delay: 0.24s;
        }
        .intro-word[data-i="4"] {
          animation-delay: 0.32s;
        }
        .intro-word[data-i="5"] {
          animation-delay: 0.4s;
        }
        .intro-word[data-i="6"] {
          animation-delay: 0.48s;
        }

        @keyframes intro-bounce {
          0% {
            opacity: 0;
            transform: translateX(16px);
          }
          60% {
            opacity: 1;
            transform: translateX(-3px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      {/* Map */}
      <div className="map-frame">
        <div className="map-inner">
          <div ref={mapContainerRef} id="map" className="w-full h-full" />
        </div>
      </div>

      {/* Header logo (top-left) */}
      <div
        style={{
          position: "fixed",
          top: "var(--gap-5)",
          left: "var(--gap-5)",
          zIndex: 950,
        }}
      >
        <button
          className="px-2 py-1 border border-gray-700 bg-white"
          onClick={() => window.location.assign("/")}
          aria-label="Home"
        >
          ECHO
        </button>
      </div>

      {/* Star toggler (top-right) */}
      <div
        style={{
          position: "fixed",
          top: "var(--gap-5)",
          right: "var(--gap-10)",
          zIndex: 950,
        }}
      >
        <button
          className="header-star"
          onClick={togglePanel}
          aria-label="Toggle panel"
          title={panelOpen ? "Close" : "Open"}
        >
          <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M5 0v10M0 5h10M1.5 1.5l7 7M8.5 1.5l-7 7"
              stroke="black"
              strokeWidth="1"
            />
          </svg>
        </button>
      </div>

      {/* Map tool shortcuts */}
      <div className="map-tool-stack" aria-label="Map tool shortcuts">
        <button
          className="map-tool-btn"
          type="button"
          onClick={handleLocate}
          title={locating ? "Locating…" : "Locate me"}
          aria-label="Locate me"
          aria-busy={locating}
          disabled={locating}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l4.5 9h-9L12 3z" fill="currentColor" />
            <path d="M12 12v7" />
            <circle cx="12" cy="20" r="1" fill="currentColor" />
          </svg>
        </button>

        <div className="map-tool-wrapper">
          <button
            className={`map-tool-btn${isDrawing ? " active" : ""}`}
            type="button"
            onClick={() => {
              if (isDrawing) stopDrawing();
              else {
                setDrawPaletteOpen((v) => !v);
                setMeasurePaletteOpen(false);
              }
            }}
            title={isDrawing ? "Finish drawing" : "Draw on map"}
            aria-haspopup="true"
            aria-expanded={drawPaletteOpen}
            aria-label="Draw on map"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20l1.5-5.5L15 5l3.5 3.5-9.5 9.5L4 20z" fill="currentColor" />
              <path d="M13.5 6.5l3 3" />
            </svg>
          </button>
          {drawPaletteOpen && (
            <div className="map-tool-palette" role="menu">
              <button
                className="map-tool-sub-btn"
                type="button"
                onClick={() => startDraw("draw_polygon")}
                role="menuitem"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M7 4h10l5 8-5 8H7l-5-8 5-8z" />
                </svg>
                <span>Draw area</span>
              </button>
              <button
                className="map-tool-sub-btn"
                type="button"
                onClick={() => startDraw("draw_line_string")}
                role="menuitem"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M4 18l6-6 4 4 6-10" />
                </svg>
                <span>Draw line</span>
              </button>
            </div>
          )}
        </div>

        <div className="map-tool-wrapper">
          <button
            className={`map-tool-btn${measureActive ? " active" : ""}`}
            type="button"
            onClick={() => {
              if (measureActive) {
                stopMeasurement();
              } else {
                setMeasurePaletteOpen((v) => !v);
                setDrawPaletteOpen(false);
              }
            }}
            title={measureActive ? "Stop measuring" : "Measure"}
            aria-haspopup="true"
            aria-expanded={measurePaletteOpen}
            aria-label="Measure"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="5" width="16" height="6" rx="1" />
              <path d="M7 8h2M11 8h2M15 8h2" />
            </svg>
          </button>
          {measurePaletteOpen && (
            <div className="map-tool-palette" role="menu">
              <button
                className="map-tool-sub-btn"
                type="button"
                onClick={() => startMeasurement("line")}
                role="menuitem"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M4 18l16-12" />
                </svg>
                <span>Distance</span>
              </button>
              <button
                className="map-tool-sub-btn"
                type="button"
                onClick={() => startMeasurement("polygon")}
                role="menuitem"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M8 4h8l4 6-4 10H8L4 10z" />
                </svg>
                <span>Area</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {toolMessage && <div className="map-tool-toast">{toolMessage}</div>}

      {/* Toast container with pills */}
      {showToast && lastPick && (
        <div className="echo-toast-container">
          <div className="echo-toast" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px', position: 'relative', paddingRight: '80px' }}>
            {/* Close and Edit buttons - absolutely positioned in top-right */}
            <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                className="px-2 py-1 border bg-white"
                style={{ fontSize: '12px', height: '24px', lineHeight: '1' }}
                onClick={() => {
                  setShowSearchUI(true);
                  setShowToast(false);
                  setHexInfo(null);
                  setPanelOpen(false);
                }}
              >
                Edit
              </button>
              <button
                style={{
                  width: '24px',
                  height: '24px',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  fontSize: '20px',
                  lineHeight: '1',
                  cursor: 'pointer',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => {
                  setShowToast(false);
                  setHexInfo(null);
                }}
                title="Close"
                aria-label="Close"
                onMouseEnter={(e) => e.currentTarget.style.color = '#000'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="label">
                {lastPick.kind === "location" ? "Location" : "Data"}:
              </span>
              <span className="value" title={lastPick.label}>
                {lastPick.label}
              </span>
            </div>

            {lastPick.kind === "location" && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '12px',
                  marginTop: '8px'
                }}
              >
                <span style={{ color: '#475569', whiteSpace: 'nowrap' }}>Radius (hex): {pendingRadius}</span>
                <input
                  type="range"
                  min={MIN_RADIUS}
                  max={MAX_RADIUS}
                  step={1}
                  value={pendingRadius}
                  onChange={(e) => setPendingRadius(Number(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: '#000000'
                  }}
                />
                <button
                  className="px-2 py-1 border bg-white"
                  style={{ 
                    fontSize: '11px',
                    opacity: pendingRadius === analysisRadius ? 0.5 : 1,
                    cursor: pendingRadius === analysisRadius ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={handleRadiusApply}
                  disabled={pendingRadius === analysisRadius}
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Hex info pills - positioned directly below toast */}
          {hexInfo && lastPick.kind === "location" && (
            <div className="toast-pills">
              {hexInfo.sa2_name && (
                <span style={{
                  padding: '4px 8px',
                  background: '#dbeafe',
                  border: '1px solid #93c5fd',
                  borderRadius: '12px',
                  color: '#1e40af',
                  fontSize: '12px'
                }}>
                  SA2: {hexInfo.sa2_name}
                </span>
              )}
              {hexInfo.lga_name && (
                <span style={{
                  padding: '4px 8px',
                  background: '#e0e7ff',
                  border: '1px solid #a5b4fc',
                  borderRadius: '12px',
                  color: '#3730a3',
                  fontSize: '12px'
                }}>
                  LGA: {hexInfo.lga_name}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Center search modal */}
      {showSearchUI && (
        <div className="search-modal-wrap z-50 border border-gray-700">
          <div className="border bg-white/95 shadow-lg px-3 py-1">
            <div className="flex items-center justify-between">
              <div className="echo-title text-lg font-semibold text-slate-600 w-full">
                <img
                  src="/icons/echologo5.png"
                  alt="Echo"
                  width={30}
                  height={30}
                  className={`echo-logo ${searchLoading ? "spin" : ""}`}
                  style={{ width: 30, height: 30, display: "block" }}
                  decoding="async"
                  loading="eager"
                />

                <div
                  onFocusCapture={() => setPanelOpen(false)}
                  style={{ width: "100%" }}
                >
                  <SearchBar
                    onSelectAddress={handlePick}
                    onSelectAny={handlePick}
                    onDone={() => {
                      handleSearchClose();
                      setShowToast(true);
                    }}
                    onLoadingChange={setSearchLoading}
                    onClose={handleSearchClose}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Location (read-only) */}
          {location.mode !== "idle" && (
            <div className="mt-3 p-3 border bg-white/95">
              <div className="text-sm font-medium mb-1">Location</div>
              <div className="text-sm">
                {location.mode === "address" && (
                  <>
                    Address:{" "}
                    <span className="font-medium">{location.label}</span>
                  </>
                )}
                {location.mode === "area" && (
                  <>
                    Area: <span className="font-medium">{location.label}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Data selections (optional readout) */}
          {sections.length > 0 && (
            <div className="mt-3 p-3 border bg-white/95">
              <div className="text-sm font-medium mb-2">Data</div>
              <div className="space-y-2">
                {sections.map((s) => (
                  <div key={s.id} className="border rounded-lg p-2 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        {s.dataset ?? "Choose dataset"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Side panel (single instance) */}
      <div
        className={`side-panel ${panelOpen ? "open" : ""}`}
        aria-hidden={!panelOpen}
      >
        <div className="side-panel__header">
          <div className="font-semibold">ECHO</div>
        </div>

        <div className="side-panel__content">
          <div className="side-panel__list">
            <div
              className="side-panel__item"
              onClick={() => toggleOverlay("search")}
            >
              <span
                className={`chev-ico ${
                  overlayTab === "search" ? "open" : "closed"
                }`}
              />
              <span>Search</span>
            </div>

            <div
              className="side-panel__item"
              onClick={() => toggleOverlay("layers")}
            >
              <span
                className={`chev-ico ${
                  overlayTab === "layers" ? "open" : "closed"
                }`}
              />
              <span>Layers</span>
            </div>

            <div
              className="side-panel__item"
              onClick={() => toggleOverlay("input")}
            >
              <span
                className={`chev-ico ${
                  overlayTab === "input" ? "open" : "closed"
                }`}
              />
              <span>Input</span>
            </div>

            <div
              className="side-panel__item"
              onClick={() => toggleOverlay("export")}
            >
              <span
                className={`chev-ico ${
                  overlayTab === "export" ? "open" : "closed"
                }`}
              />
              <span>Export</span>
            </div>

            <div
              className="side-panel__item"
              onClick={() => setShowAccountModal(true)}
            >
              <span className="chev-ico closed" />
              <span>Join Waitlist</span>
            </div>
            <div
              className="side-panel__item"
              onClick={() => setShowAboutModal(true)}
            >
              <span className="chev-ico closed" />
              <span>About</span>
            </div>

            {/* Overlays */}
            <div
              className={`side-panel__overlay ${
                overlayTab === "search" ? "is-open" : ""
              }`}
            >
              <div
                className="side-panel__overlay-header"
                onClick={() => setOverlayTab(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setOverlayTab(null);
                }}
              >
                <span className="chev-ico open" /> <strong>Search</strong>
              </div>
              <div className="side-panel__overlay-body">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    className="px-2 py-1 border"
                    onClick={() => {
                      setPanelOpen(false);
                      setShowSearchUI(true);
                    }}
                  >
                    Search Address
                  </button>
                  <button
                    className="px-2 py-1 border"
                    onClick={() => setShowMultiSearchModal(true)}
                  >
                    Multi-search
                  </button>
                </div>
                <button
                  className="w-full px-2 py-1 border"
                  onClick={() => {
                    if (!lastPick) {
                      setToolMessage("Focus on a location first");
                      return;
                    }
                    setShowToast(true);
                    setPanelOpen(false);
                  }}
                >
                  Current focus
                </button>
              </div>
            </div>

            <div
              className={`side-panel__overlay ${
                overlayTab === "layers" ? "is-open" : ""
              }`}
            >
              <div
                className="side-panel__overlay-header"
                onClick={() => setOverlayTab(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setOverlayTab(null);
                }}
              >
                <span className="chev-ico open" /> <strong>Layers</strong>
              </div>
              <div className="side-panel__overlay-body">
                <div className="mb-2 text-sm font-semibold text-slate-700">
                  Map Layers
                </div>

                {/* Dynamic layer checkboxes - ADD NEW LAYERS TO LAYER_CONFIGS */}
                {LAYER_CONFIGS.map((config) => (
                  <label key={config.key} className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={layersEnabled[config.key] || false}
                      disabled={layersLoading[config.key] || false}
                      onChange={() => toggleLayer(config.key)}
                    />
                    <span className={layersLoading[config.key] ? "text-gray-400" : ""}>
                      {config.label} {layersLoading[config.key] && "(loading...)"}
                    </span>
                  </label>
                ))}

                {/* Places group legend/filters */}
                {layersEnabled.places && (
                  <div className="ml-2 mt-2 mb-4 p-3 bg-slate-50 rounded border border-slate-200">
                    <div className="text-xs font-semibold mb-2 text-slate-600">POI Groups</div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(max(100px, 45%), 1fr))',
                      gap: '8px'
                    }}>
                      {Object.entries({
                        cultural: { color: '#D36CF6', label: 'Cultural' },
                        health: { color: '#22B573', label: 'Health' },
                        social: { color: '#6B5B95', label: 'Social' },
                        industrial: { color: '#C2B280', label: 'Industrial' },
                        commercial: { color: '#FF8A00', label: 'Commercial' },
                        other: { color: '#808080', label: 'Other' },
                      }).map(([key, { color, label }]) => (
                        <label key={key} className="flex items-center gap-1.5 text-xs" style={{ minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={placesGroups[key as keyof typeof placesGroups]}
                            onChange={() => {
                              setPlacesGroups((prev) => ({
                                ...prev,
                                [key]: !prev[key as keyof typeof placesGroups],
                              }));
                            }}
                            className="w-3 h-3"
                            style={{ flexShrink: 0 }}
                          />
                          <span
                            style={{
                              display: 'inline-block',
                              width: '10px',
                              height: '10px',
                              minWidth: '10px',
                              minHeight: '10px',
                              borderRadius: '50%',
                              backgroundColor: color,
                              border: '1px solid rgba(0,0,0,0.2)',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 p-2 text-xs text-slate-500 bg-slate-50 rounded">
                  <strong>Note:</strong> Layers are clipped to current map view
                </div>
              </div>
            </div>

            <div
              className={`side-panel__overlay ${
                overlayTab === "input" ? "is-open" : ""
              }`}
            >
              <div
                className="side-panel__overlay-header"
                onClick={() => setOverlayTab(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setOverlayTab(null);
                }}
              >
                <span className="chev-ico open" /> <strong>Input</strong>
              </div>
              <div className="side-panel__overlay-body">
                <div className="space-y-2">
                  <button
                    className="px-3 py-2 border w-full"
                    onClick={() => setShowTablesModal(true)}
                  >
                    My Tables
                  </button>
                  <button
                    className="px-3 py-2 border w-full"
                    onClick={() => setShowTablesModal(true)}
                  >
                    Import
                  </button>
                  <button
                    className="px-3 py-2 border w-full"
                    onClick={() => openAddModal()}
                  >
                    Add to Map
                  </button>
                  <button
                    className="px-3 py-2 border w-full"
                    onClick={() => setShowAddLayerWizard(true)}
                  >
                    Add Layer
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`side-panel__overlay ${
                overlayTab === "export" ? "is-open" : ""
              }`}
            >
              <div
                className="side-panel__overlay-header"
                onClick={() => setOverlayTab(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setOverlayTab(null);
                }}
              >
                <span className="chev-ico open" /> <strong>Export</strong>
              </div>
              <div className="side-panel__overlay-body">
                <div className="space-y-2">
                  <button
                    className="px-3 py-2 border w-full"
                    onClick={() => setShowExportModal(true)}
                  >
                    PDF / DXF / CSV
                  </button>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Uses current view by default; choose layers & scale in the
                  modal.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="side-panel__footer">Echo Map Victoria - 2025 - V1.1</div>
      </div>

      {/* ===== Intro overlay ===== */}
      {introVisible && (
        <div className={`intro-overlay ${introFading ? "fade" : ""}`}>
          <div className={`intro-shell ${introAnimate ? "intro-animate" : ""}`}>
            <div className="intro-title" style={{ flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <img
                src="/icons/GIF-TYPE-07.gif"
                alt="Welcome"
                style={{ width: '240px', height: '240px', objectFit: 'contain' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '24px' }}>
                <span className="intro-word" data-i="0">
                  ECHO
                </span>
                <span className="intro-word" data-i="1">
                  —
                </span>
                <span className="intro-word" data-i="2">
                  your
                </span>
                <span className="intro-word" data-i="3">
                  digital
                </span>
                <span className="intro-word" data-i="4">
                  twin
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modals ===== */}
      {showAddModal && (
        <AddLocationModal
          map={mapRef.current}
          prefill={addModalPrefill ?? undefined}
          onClose={() => {
            setShowAddModal(false);
            setAddModalPrefill(null);
          }}
          onData={(pointsFC, buffersFC) => {
            /* hook to setUserPoints/setUserBuffers if needed */
          }}
        />
      )}
      {showTablesModal && (
        <MyLocationsModal
          map={mapRef.current}
          onClose={() => setShowTablesModal(false)}
          onShow={(pointsFC, buffersFC) => {
            /* hook to setUserPoints/setUserBuffers if needed */
          }}
        />
      )}
      {showExportModal && (
        <ExportModal
          map={mapRef.current}
          onClose={() => setShowExportModal(false)}
        />
      )}
      {showAddLayerWizard && (
        <AddLayerWizard onClose={() => setShowAddLayerWizard(false)} />
      )}
      {showAccountModal && (
        <SimpleModal title="Join Waitlist" onClose={() => setShowAccountModal(false)}>
          <div>
            <form onSubmit={handleAccountSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium">Email</label>
                <input
                  type="email"
                  value={acctEmail}
                  onChange={(e) => setAcctEmail(e.target.value)}
                  required
                  className="w-full border px-2 py-1"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium">Name</label>
                <input
                  type="text"
                  value={acctName}
                  onChange={(e) => setAcctName(e.target.value)}
                  required
                  className="w-full border px-2 py-1"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium">Comment (optional)</label>
                <textarea
                  value={acctComment}
                  onChange={(e) => setAcctComment(e.target.value)}
                  className="w-full border px-2 py-1"
                  rows={3}
                  placeholder="Tell us what you'd like to see in your digital twin.."
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-3 py-2 border bg-sky-600 text-white rounded"
                  disabled={acctSubmitting}
                >
                  {acctSubmitting ? "Signing up..." : "Sign up"}
                </button>
                <button
                  type="button"
                  className="px-3 py-2 border bg-white rounded"
                  onClick={() => setShowAccountModal(false)}
                >
                  Cancel
                </button>
              </div>

              {acctMessage && (
                <div className="text-sm text-slate-700">{acctMessage}</div>
              )}
            </form>
          </div>
        </SimpleModal>
      )}
      {showMultiSearchModal && (
        <SimpleModal
          title="Multi-search"
          onClose={() => setShowMultiSearchModal(false)}
        >
          Coming soon, join the waitlist
        </SimpleModal>
      )}
      {showAboutModal && (
        <SimpleModal title="About" onClose={() => setShowAboutModal(false)}>
          Echo Map 2025. Established in Melbourne with the guidance of CIVVIC labs- Empowering the grid of the future program.  Founding parters are Eddie Buckle and Eoghan McCarthy, with help from Loughlin O'Kane.
        </SimpleModal>
      )}
    </div>
  );
}
