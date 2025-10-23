import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

export const compileRunRouter = Router();

function readGeoJSON(rel: string) {
  const full = path.join(process.cwd(), rel);
  return JSON.parse(fs.readFileSync(full, "utf-8"));
}

function ensureValue(f: any, field = "value") {
  if (!f.properties) f.properties = {};
  if (f.properties[field] == null) {
    const code = String(f.properties.SA2_CODE ?? "");
    let h = 0; for (let i=0;i<code.length;i++) h = (h*31 + code.charCodeAt(i))>>>0;
    f.properties[field] = (h % 100) + 1;
  }
  return f;
}

compileRunRouter.post("/", (req: Request, res: Response) => {
  try {
    const q = req.body || {};
    const ds: string = q.dataset;
    if (!ds) return res.status(400).json({ error: "Missing 'dataset'" });

    const base = "data_web/geojson";

    if (ds === "planning_zones") {
    const fc = readGeoJSON(path.join(base, "planning_zones.geojson"));
    // NEW: filter by ZONE_CODE if provided
    const zc = q?.filters?.find((f: any) => f.field === "ZONE_CODE")?.value;
    const features = (fc.features ?? fc).filter((f: any) =>
      !zc ? true : String(f.properties?.ZONE_CODE) === String(zc)
    );
    return res.json({ type: "FeatureCollection", features });
}

    if (ds === "pois") {
      const fc = readGeoJSON(path.join(base, "pois.geojson"));
      const ftype = q?.filters?.find((f: any) => f.field === "FTYPE")?.value;
      const features = (fc.features ?? fc).filter((f: any) =>
        !ftype ? true : String(f.properties?.FTYPE).toLowerCase() === String(ftype).toLowerCase()
      );
      return res.json({ type: "FeatureCollection", features });
    }

    if (ds === "sa2") {
      const fc = readGeoJSON(path.join(base, "sa2.geojson"));
      return res.json({ type: "FeatureCollection", features: fc.features ?? fc });
    }

    if (ds === "dwell_struct") {
      const fc = readGeoJSON(path.join(base, "sa2.geojson"));
      const features = (fc.features ?? fc).map((f: any) => ensureValue(f, "value"));
      return res.json({ type: "FeatureCollection", meta: { year: q.time ?? 2021, category: q.category ?? "Separate_house" }, features });
    }

    return res.status(400).json({ error: `Unknown dataset '${ds}'` });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "compile-run failed", details: e?.message });
  }
});
