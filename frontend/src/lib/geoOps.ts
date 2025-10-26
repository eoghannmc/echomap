import * as turf from "@turf/turf";
import type { BBox } from "@/types/geo";

export function makeBuffer(lon: number, lat: number, meters: number): GeoJSON.Feature<GeoJSON.Polygon> {
  return turf.circle([lon, lat], meters, { units: "meters", steps: 64 }) as any;
}

export function fcFromRows(rows: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: rows };
}

export function bboxOfFC(fc: GeoJSON.FeatureCollection): BBox {
  return turf.bbox(fc) as any;
}

export function clipFCtoBBox(fc: GeoJSON.FeatureCollection, bbox: BBox): GeoJSON.FeatureCollection {
  const poly = turf.bboxPolygon(bbox);
  const out: GeoJSON.Feature[] = [];
  for (const f of fc.features) {
    try {
      if (f.geometry.type === "Point") {
        const inside = turf.booleanPointInPolygon(f as any, poly as any);
        if (inside) out.push(f);
      } else {
        const inter = turf.intersect(poly as any, f as any);
        if (inter) out.push(inter as any);
      }
    } catch { /* ignore */ }
  }
  return { type: "FeatureCollection", features: out };
}
