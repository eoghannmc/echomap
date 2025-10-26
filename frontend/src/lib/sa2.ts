// src/lib/sa2.ts
import maplibregl from "maplibre-gl";

type PatternKey = "diag" | "cross" | "dot" | "diagGap" | "h" | "v";
const PATTERNS: PatternKey[] = ["diag","cross","dot","diagGap","h","v"];

function hashStringToIdx(s: string, modulo = PATTERNS.length) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % modulo;
}

export async function addSA2Source(map: maplibregl.Map) {
  const resp = await fetch("/data_web/geojson/sa2.geojson");
  const gj = await resp.json();

  for (const f of gj.features) {
    const key = String(
      f.properties?.SA2_CODE ?? f.properties?.SA2_NAME ?? ""
    );
    const idx = hashStringToIdx(key);
    f.properties = {
      ...f.properties,
      patternKey: PATTERNS[idx],
      colorKey: "navy",
    };
  }
  map.addSource("sa2", { type: "geojson", data: gj });
}

export function addSA2WelcomeLayers(map: maplibregl.Map) {
  // 10% white underlay
  map.addLayer({
    id: "sa2-underlay",
    type: "fill",
    source: "sa2",
    paint: { "fill-color": "#FFFFFF", "fill-opacity": 0.10 },
  });

  // navy hatches (binned by patternKey)
  map.addLayer({
    id: "sa2-hatch",
    type: "fill",
    source: "sa2",
    paint: {
      "fill-pattern": [
        "match", ["get","patternKey"],
        "diag","diag-16-navy",
        "cross","cross-16-navy",
        "dot","dot-16-navy",
        "diagGap","diagGap-16-navy",
        "h","h-16-navy",
        "v","v-16-navy",
        /* default */ "diag-16-navy"
      ],
      "fill-opacity": 1,
    },
  });

  // optional crisp outline
  map.addLayer({
    id: "sa2-outline",
    type: "line",
    source: "sa2",
    paint: { "line-color": "#0A2540", "line-width": 0.5 },
  });
}

/** Stubs for later “chosen feature” highlight flow (we’ll wire these when ready). */
export function ensureSA2HighlightLayers(map: maplibregl.Map) {
  if (!map.getLayer("sa2-highlight")) {
    map.addLayer({
      id: "sa2-highlight",
      type: "fill",
      source: "sa2",
      filter: ["==", ["get","SA2_CODE"], ""], // no selection yet
      paint: { "fill-pattern": "cross-16-navy", "fill-opacity": 1 },
    });
    map.addLayer({
      id: "sa2-highlight-outline",
      type: "line",
      source: "sa2",
      filter: ["==", ["get","SA2_CODE"], ""],
      paint: { "line-color": "#0A2540", "line-width": 1 },
    });
  }
}
