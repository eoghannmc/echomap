"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import SearchBar from "./SearchBar";
import type { SuggestItem } from "../lib/suggest";

import AddLocationModal from "./AddLocationModal";
import MyLocationsModal from "./MyLocationsModal";
import ExportModal from "./ExportModal";

/* ================= UX constants ================= */
const UX = { addressFlyToZoom: 16 };

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
  | { mode: "area"; label?: string; status: SectionStatus };

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

  // Panel + overlays
  const [panelOpen, setPanelOpen] = useState(false);
  type PanelTab = "search" | "layers" | "input" | "export" | null;
  const [overlayTab, setOverlayTab] = useState<PanelTab>(null);

  // Search modal + toast
  const [showSearchUI, setShowSearchUI] = useState(true);
  type PickSummary = { kind: "location" | "data"; label: string };
  const [lastPick, setLastPick] = useState<PickSummary | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Location + sections
  const [location, setLocation] = useState<LocationState>({
    mode: "idle",
    status: "input",
  });
  const [sections, setSections] = useState<DatasetSection[]>([]);

  // Backend layer toggles and state
  const [layersEnabled, setLayersEnabled] = useState({
    planning: false,
    parcels: false,
    meshBlocks: false,
    sa2: false,
  });
  const [layersLoading, setLayersLoading] = useState({
    planning: false,
    parcels: false,
    meshBlocks: false,
    sa2: false,
  });

  // Simple modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTablesModal, setShowTablesModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // SearchBar loading flag → spin logo (already wired)
  const [searchLoading, setSearchLoading] = useState(false);

  // Intro overlay state
  const [introVisible, setIntroVisible] = useState(true);
  const [introAnimate, setIntroAnimate] = useState(false); // starts animations after 0.5s
  const [introFading, setIntroFading] = useState(false); // begin fade just before removal

  /* ============== Map init ============== */
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style:
        "https://api.maptiler.com/maps/backdrop/style.json?key=" +
        (process.env.NEXT_PUBLIC_MAPTILER_KEY || ""),
      center: [144.96675745, -37.741669550],
      zoom: 10,
      attributionControl: false,
    });
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "bottom-right"
    );
    map.on("error", (e) =>
      console.error("[map] error", (e as any)?.error || e)
    );
    mapRef.current = map;
    return () => {
      try {
        map.remove();
      } catch {}
      mapRef.current = null;
    };
  }, []);

  // Layout reacts
  useEffect(() => {
    mapRef.current?.resize();
  }, [panelOpen, showSearchUI]);

  // CSS runtime vars
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

  // Esc to close overlay then panel
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

  // Intro overlay timers: start anim at 0.5s, fade at 2.5s, remove at 3.0s
  useEffect(() => {
    const t1 = setTimeout(() => setIntroAnimate(true), 500);
    const t2 = setTimeout(() => setIntroFading(true), 2500);
    const t3 = setTimeout(() => setIntroVisible(false), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  /* ============== Handlers ============== */
  const toggleOverlay = (tab: Exclude<PanelTab, null>) =>
    setOverlayTab((prev) => (prev === tab ? null : tab));
  const togglePanel = () => setPanelOpen((v) => !v);

  /* ============== Backend Layer Functions ============== */
  const BACKEND_URL =
    process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  // Get current map center for backend queries
  const getMapCenter = () => {
    const map = mapRef.current;
    if (!map) return { lat: -37.8136, lon: 144.9631 };
    const center = map.getCenter();
    return { lat: center.lat, lon: center.lng };
  };

  // Fetch and add planning zones
  // Fetch and add planning zones layer
  const loadPlanningLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, planning: true }));
    try {
      const { lat, lon } = getMapCenter();
      const response = await fetch(`${BACKEND_URL}/analyze/zones_h3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          center_lat: lat,
          center_lon: lon,
          layer: "planning_zones",
          res: 8,
          k: 4,
          band_index: 2,
          clip_mode: "disk",
        }),
      });

      if (!response.ok)
        throw new Error(`Planning zones API error: ${response.status}`);
      const data = await response.json();

      if (!map.getSource("planning-zones")) {
        map.addSource("planning-zones", {
          type: "geojson",
          data: data.features,
        });
        map.addLayer({
          id: "planning-fill",
          type: "fill",
          source: "planning-zones",
          layout: {
            visibility: "visible",
          },
          paint: {
            "fill-color": [
              "match",
              ["get", "ZONE_CODE"],
              // Residential - General
              "GRZ", "#66bb66", "GRZ1", "#66bb66", "GRZ2", "#66bb66", "GRZ3", "#66bb66",
              "GRZ4", "#66bb66", "GRZ5", "#66bb66", "GRZ6", "#66bb66", "GRZ7", "#66bb66",
              "GRZ8", "#66bb66", "GRZ9", "#66bb66", "GRZ10", "#66bb66", "GRZ11", "#66bb66",
              "GRZ12", "#66bb66", "GRZ13", "#66bb66", "GRZ14", "#66bb66", "GRZ15", "#66bb66",
              "GRZ16", "#66bb66", "GRZ17", "#66bb66", "GRZ18", "#66bb66",
              // Residential - Neighbourhood
              "NRZ1", "#99cc99", "NRZ2", "#99cc99", "NRZ3", "#99cc99", "NRZ4", "#99cc99",
              "NRZ5", "#99cc99", "NRZ6", "#99cc99", "NRZ7", "#99cc99", "NRZ8", "#99cc99",
              "NRZ9", "#99cc99", "NRZ10", "#99cc99", "NRZ11", "#99cc99", "NRZ12", "#99cc99",
              "NRZ14", "#99cc99",
              // Residential - Growth
              "RGZ", "#339966", "RGZ1", "#339966", "RGZ2", "#339966", "RGZ3", "#339966",
              "RGZ4", "#339966", "RGZ5", "#339966", "RGZ6", "#339966", "RGZ7", "#339966",
              "RGZ8", "#339966", "RGZ9", "#339966",
              // Residential - Low Density
              "LDRZ", "#cce5cc", "LDRZ1", "#cce5cc", "LDRZ2", "#cce5cc", "LDRZ3", "#cce5cc",
              "LDRZ4", "#cce5cc", "LDRZ5", "#cce5cc",
              // Industrial
              "IN1Z", "#999966", "IN2Z", "#999966", "IN3Z", "#999966",
              // Commercial
              "B1Z", "#996633", "B2Z", "#996633", "B3Z", "#996633", "B4Z", "#996633",
              "B5Z", "#996633", "C1Z", "#996633", "C2Z", "#996633",
              // Development / Priority
              "CDZ1", "#4da6ff", "CDZ2", "#4da6ff", "CDZ3", "#4da6ff", "CDZ4", "#4da6ff",
              "CDZ5", "#4da6ff", "CDZ6", "#4da6ff", "PDZ", "#4da6ff", "PDZ1", "#4da6ff",
              "PDZ2", "#4da6ff",
              // Urban Growth
              "UGZ", "#64b5f6", "UGZ1", "#64b5f6", "UGZ2", "#64b5f6", "UGZ3", "#64b5f6",
              "UGZ4", "#64b5f6", "UGZ5", "#64b5f6", "UGZ6", "#64b5f6", "UGZ7", "#64b5f6",
              "UGZ8", "#64b5f6", "UGZ9", "#64b5f6", "UGZ10", "#64b5f6", "UGZ11", "#64b5f6",
              "UGZ12", "#64b5f6", "UGZ13", "#64b5f6", "UGZ14", "#64b5f6", "UGZ15", "#64b5f6",
              "UGZ16", "#64b5f6",
              // Transport
              "TRZ1", "#b3b3b3", "TRZ2", "#b3b3b3", "TRZ3", "#b3b3b3", "TRZ4", "#b3b3b3",
              // Farming
              "FZ", "#d4e157", "FZ1", "#d4e157", "FZ2", "#d4e157", "FZ3", "#d4e157",
              "FZ4", "#d4e157",
              // Rural Living
              "RLZ", "#a1887f", "RLZ1", "#a1887f", "RLZ2", "#a1887f", "RLZ3", "#a1887f",
              "RLZ4", "#a1887f", "RLZ5", "#a1887f",
              // Rural Activity
              "RAZ", "#bcaaa4", "RAZ1", "#bcaaa4", "RAZ2", "#bcaaa4", "RAZ3", "#bcaaa4",
              // Rural Conservation
              "RCZ", "#8d6e63", "RCZ1", "#8d6e63", "RCZ2", "#8d6e63", "RCZ3", "#8d6e63",
              "RCZ4", "#8d6e63", "RCZ5", "#8d6e63", "RCZ6", "#8d6e63", "RCZ7", "#8d6e63",
              "RCZ8", "#8d6e63", "RCZ9", "#8d6e63", "RCZ10", "#8d6e63", "RCZ11", "#8d6e63",
              "RCZ12", "#8d6e63", "RCZ13", "#8d6e63", "RCZ14", "#8d6e63", "RCZ15", "#8d6e63",
              // Township
              "TZ", "#aed581", "TZ1", "#aed581", "TZ2", "#aed581",
              // Green Wedge
              "GWZ", "#a5d6a7", "GWZ1", "#a5d6a7", "GWZ2", "#a5d6a7", "GWZ3", "#a5d6a7",
              "GWZ4", "#a5d6a7", "GWZ5", "#a5d6a7", "GWZ6", "#a5d6a7",
              "GWAZ", "#a5d6a7", "GWAZ1", "#a5d6a7", "GWAZ2", "#a5d6a7", "GWAZ4", "#a5d6a7",
              "GWAZ5", "#a5d6a7", "GWAZ6", "#a5d6a7",
              // Public / Open
              "PPRZ", "#81c784", "PCRZ", "#81c784", "PUZ1", "#81c784", "PUZ2", "#81c784",
              "PUZ3", "#81c784", "PUZ5", "#81c784", "PUZ6", "#81c784", "PUZ7", "#81c784",
              // Special Use
              "SUZ1", "#ffcc80", "SUZ2", "#ffcc80", "SUZ3", "#ffcc80", "SUZ4", "#ffcc80",
              "SUZ5", "#ffcc80", "SUZ6", "#ffcc80", "SUZ7", "#ffcc80", "SUZ8", "#ffcc80",
              "SUZ9", "#ffcc80", "SUZ10", "#ffcc80", "SUZ11", "#ffcc80", "SUZ12", "#ffcc80",
              "SUZ13", "#ffcc80", "SUZ14", "#ffcc80", "SUZ15", "#ffcc80", "SUZ16", "#ffcc80",
              "SUZ17", "#ffcc80",
              // Central City / Docklands
              "CCZ1", "#2e5984", "CCZ2", "#2e5984", "CCZ3", "#2e5984", "CCZ4", "#2e5984",
              "CCZ5", "#2e5984", "CCZ6", "#2e5984", "CCZ7", "#2e5984",
              "DZ1", "#2e5984", "DZ2", "#2e5984", "DZ3", "#2e5984", "DZ4", "#2e5984",
              "DZ5", "#2e5984", "DZ6", "#2e5984", "DZ7", "#2e5984",
              // Activity / Mixed Use
              "ACZ1", "#6c91bf", "ACZ2", "#6c91bf", "ACZ3", "#6c91bf",
              "MUZ", "#6c91bf", "MUZ1", "#6c91bf", "MUZ2", "#6c91bf", "MUZ3", "#6c91bf",
              "MUZ4", "#6c91bf",
              // Other
              "UFZ", "#4fc3f7", "CA", "#b0bec5", "PZ", "#8eacbb",
              "#cccccc" // default
            ],
            "fill-opacity": 0.6,
          },
        });
        map.addLayer({
          id: "planning-outline",
          type: "line",
          source: "planning-zones",
          layout: {
            visibility: "visible",
          },
          paint: {
            "line-color": "#333",
            "line-width": 1,
          },
        });
      } else {
        (map.getSource("planning-zones") as any).setData(data.features);
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
  }, []);

  // Fetch and add property parcels layer
  const loadParcelsLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, parcels: true }));
    try {
      const { lat, lon } = getMapCenter();
      const response = await fetch(`${BACKEND_URL}/analyze/parcels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          center_lat: lat,
          center_lon: lon,
          res: 9,
          k: 1,
          disk_k: 1,
        }),
      });

      if (!response.ok)
        throw new Error(`Parcels API error: ${response.status}`);
      const data = await response.json();

      // Use the parcels data from the backend
      const parcelData = data.parcels || { type: "FeatureCollection", features: [] };

      if (!map.getSource("parcels")) {
        map.addSource("parcels", {
          type: "geojson",
          data: parcelData,
        });
        map.addLayer({
          id: "parcels-outline",
          type: "line",
          source: "parcels",
          layout: {
            visibility: "visible",
          },
          paint: {
            "line-color": "#FF0000",
            "line-width": 1.0,
          },
        });
      } else {
        (map.getSource("parcels") as any).setData(parcelData);
      }

      console.log("[Parcels] Loaded:", data.summary);
    } catch (error) {
      console.error("[Parcels] Error:", error);
      alert("Failed to load property parcels. Make sure backend is running.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, parcels: false }));
    }
  }, []);

  const loadMeshBlocksLayer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, meshBlocks: true }));
    try {
      const { lat, lon } = getMapCenter();
      const response = await fetch(`${BACKEND_URL}/analyze/mesh_blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          center_lat: lat,
          center_lon: lon,
          res: 9,
          k: 1,
          disk_k: 1,
        }),
      });

      if (!response.ok)
        throw new Error(`Mesh blocks API error: ${response.status}`);
      const data = await response.json();

      // Use the mesh blocks data from the backend
      const meshData = data.mesh_blocks || { type: "FeatureCollection", features: [] };

      if (!map.getSource("mesh-blocks")) {
        map.addSource("mesh-blocks", {
          type: "geojson",
          data: meshData,
        });
        map.addLayer({
          id: "mesh-fill",
          type: "fill",
          source: "mesh-blocks",
          layout: {
            visibility: "visible",
          },
          paint: {
            "fill-color": "#000000",
            "fill-opacity": 0,
          },
        });
        map.addLayer({
          id: "mesh-outline",
          type: "line",
          source: "mesh-blocks",
          layout: {
            visibility: "visible",
          },
          paint: {
            "line-color": "#FFA500",
            "line-width": 1.0,
          },
        });
      } else {
        (map.getSource("mesh-blocks") as any).setData(meshData);
      }

      console.log("[Mesh Blocks] Loaded:", data.summary);
    } catch (error) {
      console.error("[Mesh Blocks] Error:", error);
      alert("Failed to load mesh blocks. Make sure backend is running.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, meshBlocks: false }));
    }
  }, []);

  // Fetch and add SA2 boundaries layer
  const loadSA2Layer = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    setLayersLoading((prev) => ({ ...prev, sa2: true }));
    try {
      const { lat, lon } = getMapCenter();
      const response = await fetch(`${BACKEND_URL}/analyze/zones_h3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          center_lat: lat,
          center_lon: lon,
          layer: "sa2",
          res: 8,
          k: 8,
          band_index: 4,
          clip_mode: "disk",
        }),
      });

      if (!response.ok) throw new Error(`SA2 API error: ${response.status}`);
      const data = await response.json();

      // Define 5 green patterns to choose from randomly
      const greenPatterns = [
        "cross-24-green",
        "diag-24-green",
        "dot-24-green",
        "diagGap-24-green",
        "h-24-green"
      ];

      // Load all pattern images if not already loaded
      for (const patternName of greenPatterns) {
        if (!map.hasImage(patternName)) {
          const patternUrl = `/patterns/${patternName}.png`;
          const res = await fetch(patternUrl, { cache: "force-cache" });
          const blob = await res.blob();
          const bmp = await createImageBitmap(blob);
          map.addImage(patternName, bmp);
        }
      }

      // Assign a random pattern to each SA2 feature
      if (data.features && data.features.features) {
        data.features.features.forEach((feature: any) => {
          const randomIndex = Math.floor(Math.random() * greenPatterns.length);
          feature.properties = {
            ...feature.properties,
            patternKey: greenPatterns[randomIndex]
          };
        });
      }

      if (!map.getSource("sa2")) {
        map.addSource("sa2", {
          type: "geojson",
          data: data.features,
        });
        map.addLayer({
          id: "sa2-fill",
          type: "fill",
          source: "sa2",
          layout: {
            visibility: "visible",
          },
          paint: {
            "fill-pattern": ["get", "patternKey"],
            "fill-opacity": 1,
          },
        });
        map.addLayer({
          id: "sa2-outline",
          type: "line",
          source: "sa2",
          layout: {
            visibility: "visible",
          },
          paint: {
            "line-color": "#333",
            "line-width": 1,
          },
        });
      } else {
        (map.getSource("sa2") as any).setData(data.features);
      }

      console.log("[SA2] Loaded:", data.summary);
    } catch (error) {
      console.error("[SA2] Error:", error);
      alert("Failed to load SA2 boundaries. Make sure backend is running.");
    } finally {
      setLayersLoading((prev) => ({ ...prev, sa2: false }));
    }
  }, []);

  // Toggle layer visibility
  const toggleLayer = useCallback(
    (layerKey: keyof typeof layersEnabled) => {
      const map = mapRef.current;
      if (!map) return;

      const newEnabled = !layersEnabled[layerKey];
      setLayersEnabled((prev) => ({ ...prev, [layerKey]: newEnabled }));

      const layerIds: Record<string, string[]> = {
        planning: ["planning-fill", "planning-outline"],
        parcels: ["parcels-outline"],
        meshBlocks: ["mesh-fill", "mesh-outline"],
        sa2: ["sa2-fill", "sa2-outline"],
      };

      if (newEnabled) {
        // Check if layers already exist
        const layersExist = layerIds[layerKey]?.every((id) => map.getLayer(id));

        if (layersExist) {
          // Just show existing layers
          layerIds[layerKey]?.forEach((id) => {
            map.setLayoutProperty(id, "visibility", "visible");
          });
        } else {
          // Load data and create layers
          switch (layerKey) {
            case "planning":
              loadPlanningLayer();
              break;
            case "parcels":
              loadParcelsLayer();
              break;
            case "meshBlocks":
              loadMeshBlocksLayer();
              break;
            case "sa2":
              loadSA2Layer();
              break;
          }
        }
      } else {
        // Hide layer
        layerIds[layerKey]?.forEach((id) => {
          if (map.getLayer(id)) {
            map.setLayoutProperty(id, "visibility", "none");
          }
        });
      }
    },
    [layersEnabled, loadPlanningLayer, loadParcelsLayer, loadMeshBlocksLayer, loadSA2Layer]
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

      if (mapRef.current && it.lon != null && it.lat != null) {
        mapRef.current.flyTo({
          center: [it.lon, it.lat],
          zoom: UX.addressFlyToZoom,
          speed: 1.2,
        });
        if (addrMarkerRef.current) addrMarkerRef.current.remove();
        addrMarkerRef.current = new maplibregl.Marker({ color: "#e86017" })
          .setLngLat([it.lon, it.lat])
          .addTo(mapRef.current);
      }
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
  }, []);

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

      {/* Toast */}
      {showToast && lastPick && (
        <div className="echo-toast">
          <span className="label">
            {lastPick.kind === "location" ? "Location" : "Data"}:
          </span>
          <span className="value" title={lastPick.label}>
            {lastPick.label}
          </span>
          <button
            className="px-2 py-1 border bg-white"
            onClick={() => {
              setShowSearchUI(true);
              setShowToast(false);
              setPanelOpen(false);
            }}
          >
            Edit
          </button>
          <button
            className="px-2 py-1 border bg-white"
            onClick={() => setShowToast(false)}
            title="Close"
            aria-label="Close"
          >
            ×
          </button>
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
                      setShowSearchUI(false);
                      setShowToast(true);
                    }}
                    onLoadingChange={setSearchLoading}
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
              <span>Account</span>
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
                <div className="grid grid-cols-3 gap-2 mb-3">
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
                    onClick={() => setShowAboutModal(true)}
                  >
                    Multi-Focus
                  </button>
                  <button
                    className="px-2 py-1 border"
                    onClick={() => {
                      setPanelOpen(false);
                      setShowSearchUI(true);
                    }}
                  >
                    Data
                  </button>
                </div>
                <div onFocusCapture={() => setPanelOpen(false)}>
                  <SearchBar
                    onSelectAddress={handlePick}
                    onSelectAny={handlePick}
                    onDone={() => {
                      setShowSearchUI(false);
                      setShowToast(true);
                    }}
                    onLoadingChange={setSearchLoading}
                  />
                </div>
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

                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={layersEnabled.planning}
                    disabled={layersLoading.planning}
                    onChange={() => toggleLayer("planning")}
                  />
                  <span
                    className={layersLoading.planning ? "text-gray-400" : ""}
                  >
                    Planning Zones {layersLoading.planning && "(loading...)"}
                  </span>
                </label>

                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={layersEnabled.parcels}
                    disabled={layersLoading.parcels}
                    onChange={() => toggleLayer("parcels")}
                  />
                  <span
                    className={layersLoading.parcels ? "text-gray-400" : ""}
                  >
                    Property Parcels {layersLoading.parcels && "(loading...)"}
                  </span>
                </label>

                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={layersEnabled.meshBlocks}
                    disabled={layersLoading.meshBlocks}
                    onChange={() => toggleLayer("meshBlocks")}
                  />
                  <span
                    className={layersLoading.meshBlocks ? "text-gray-400" : ""}
                  >
                    Mesh Blocks {layersLoading.meshBlocks && "(loading...)"}
                  </span>
                </label>

                <label className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    checked={layersEnabled.sa2}
                    disabled={layersLoading.sa2}
                    onChange={() => toggleLayer("sa2")}
                  />
                  <span className={layersLoading.sa2 ? "text-gray-400" : ""}>
                    SA2 Boundaries {layersLoading.sa2 && "(loading...)"}
                  </span>
                </label>

                <div className="mt-4 p-2 text-xs text-slate-500 bg-slate-50 rounded">
                  <strong>Note:</strong> Layers are loaded based on current map
                  center. Move the map and re-toggle to update data.
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
                    onClick={() => setShowAddModal(true)}
                  >
                    Add to Map
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
        <div className="side-panel__footer">Echo Map Victoria - 2025</div>
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
          onClose={() => setShowAddModal(false)}
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
      {showAccountModal && (
        <SimpleModal title="Account" onClose={() => setShowAccountModal(false)}>
          Your account settings will appear here.
        </SimpleModal>
      )}
      {showAboutModal && (
        <SimpleModal title="About" onClose={() => setShowAboutModal(false)}>
          Echo Map Victoria — 2025. About text / version info goes here.
        </SimpleModal>
      )}
    </div>
  );
}
