// src/lib/patterns.ts
import type { Map as MLMap } from "maplibre-gl";

/* ================= SA2 hatch helpers (no JSX here) ================= */
export type PatternKey = "diag" | "cross" | "dot" | "diagGap" | "h" | "v";
export const PATTERNS: PatternKey[] = ["diag", "cross", "dot", "diagGap", "h", "v"];
export const HATCH_FILES = [
  "diag-16-navy", "cross-16-navy", "dot-16-navy",
  "diagGap-16-navy", "h-16-navy", "v-16-navy",
];

export function hashStringToIdx(s: string, modulo = PATTERNS.length) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % modulo;
}

export async function addImageFromURL(map: MLMap, name: string, url: string) {
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Image fetch failed: ${url}`);
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  if (!map.hasImage(name)) map.addImage(name, bmp);
}

export async function preloadNavyHatches(map: MLMap, base = "/patterns") {
  await Promise.all(HATCH_FILES.map(n => addImageFromURL(map, n, `${base}/${n}.png`)));
}

export async function addSA2Source(map: MLMap, url = "/data_web/geojson/sa2.geojson") {
  const resp = await fetch(url, { cache: "force-cache" });
  if (!resp.ok) throw new Error(`sa2.geojson fetch failed: ${resp.status}`);
  const gj = await resp.json();

  // tag each feature with a pattern
  for (const f of (gj.features ?? [])) {
    const key = String(f.properties?.SA2_CODE ?? f.properties?.SA2_NAME ?? "");
    const idx = hashStringToIdx(key);
    f.properties = { ...f.properties, patternKey: HATCH_FILES[idx] };
  }

  if (!map.getSource("sa2")) {
    map.addSource("sa2", { type: "geojson", data: gj } as any);
  } else {
    (map.getSource("sa2") as any).setData(gj);
  }
}

export function addSA2WelcomeLayers(map: MLMap) {
  if (!map.getSource("sa2")) return;

  if (!map.getLayer("sa2-underlay")) {
    map.addLayer({
      id: "sa2-underlay",
      type: "fill",
      source: "sa2",
      paint: { "fill-color": "#FFFFFF", "fill-opacity": 0.08 },
    });
  }

  if (!map.getLayer("sa2-hatch")) {
    map.addLayer({
      id: "sa2-hatch",
      type: "fill",
      source: "sa2",
      paint: {
        "fill-pattern": ["coalesce", ["get", "patternKey"], "diag-16-navy"],
        "fill-opacity": 1,
      },
    });
  }

  if (!map.getLayer("sa2-outline")) {
    map.addLayer({
      id: "sa2-outline",
      type: "line",
      source: "sa2",
      paint: { "line-color": "#0A2540", "line-width": 0.5 },
    });
  }
}
