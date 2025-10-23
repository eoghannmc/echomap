"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileRunRouter = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.compileRunRouter = (0, express_1.Router)();
function readGeoJSON(rel) {
    const full = path_1.default.join(process.cwd(), rel);
    return JSON.parse(fs_1.default.readFileSync(full, "utf-8"));
}
function ensureValue(f, field = "value") {
    if (!f.properties)
        f.properties = {};
    if (f.properties[field] == null) {
        const code = String(f.properties.SA2_CODE ?? "");
        let h = 0;
        for (let i = 0; i < code.length; i++)
            h = (h * 31 + code.charCodeAt(i)) >>> 0;
        f.properties[field] = (h % 100) + 1;
    }
    return f;
}
exports.compileRunRouter.post("/", (req, res) => {
    try {
        const q = req.body || {};
        const ds = q.dataset;
        if (!ds)
            return res.status(400).json({ error: "Missing 'dataset'" });
        const base = "data_web/geojson";
        if (ds === "planning_zones") {
            const fc = readGeoJSON(path_1.default.join(base, "planning_zones.geojson"));
            // NEW: filter by ZONE_CODE if provided
            const zc = q?.filters?.find((f) => f.field === "ZONE_CODE")?.value;
            const features = (fc.features ?? fc).filter((f) => !zc ? true : String(f.properties?.ZONE_CODE) === String(zc));
            return res.json({ type: "FeatureCollection", features });
        }
        if (ds === "pois") {
            const fc = readGeoJSON(path_1.default.join(base, "pois.geojson"));
            const ftype = q?.filters?.find((f) => f.field === "FTYPE")?.value;
            const features = (fc.features ?? fc).filter((f) => !ftype ? true : String(f.properties?.FTYPE).toLowerCase() === String(ftype).toLowerCase());
            return res.json({ type: "FeatureCollection", features });
        }
        if (ds === "sa2") {
            const fc = readGeoJSON(path_1.default.join(base, "sa2.geojson"));
            return res.json({ type: "FeatureCollection", features: fc.features ?? fc });
        }
        if (ds === "dwell_struct") {
            const fc = readGeoJSON(path_1.default.join(base, "sa2.geojson"));
            const features = (fc.features ?? fc).map((f) => ensureValue(f, "value"));
            return res.json({ type: "FeatureCollection", meta: { year: q.time ?? 2021, category: q.category ?? "Separate_house" }, features });
        }
        return res.status(400).json({ error: `Unknown dataset '${ds}'` });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: "compile-run failed", details: e?.message });
    }
});
