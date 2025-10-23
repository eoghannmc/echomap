import express from "express";
import cors from "cors";
import path from "path";
import { compileRunRouter } from "./routes/compileRun";
import { suggestRouter } from "./routes/suggest";
import 'dotenv/config'; // at top of server/src/index.ts
import express from "express";
import cors from "cors";
import { healthRouter } from "./routes/health";
// ... other imports

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Ensure DATA_ROOT exists so routes that use it won't crash
const DATA_ROOT = process.env.DATA_ROOT || path.join(__dirname, '../data');
try {
  fs.mkdirSync(DATA_ROOT, { recursive: true });
  console.log('DATA_ROOT:', DATA_ROOT);
} catch (e) {
  console.error('Failed to create DATA_ROOT directory', DATA_ROOT, e);
}

const app = express();
app.use(cors({
  origin: [
    "http://localhost:3000",
    /\.vercel\.app$/,                // any Vercel preview
  ],
}));
app.use(express.json());

app.use("/api/health", healthRouter);
// app.use("/api/suggest", suggestRouter);
// app.use("/api/address-suggest", addressSuggestRouter);
// app.use("/api/compile-run", compileRunRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server on :${PORT}`);
});

const app = express();
app.use(cors());
app.use(express.json());

// (Optional) expose raw geojson for quick checks:
app.use("/geojson", express.static(path.join(process.cwd(), "data_web", "geojson")));

app.use("/api/compile-run", compileRunRouter);
app.use("/api/suggest", suggestRouter);
app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));

import { addressSuggestRouter } from "./routes/addressSuggest";
app.use("/api/address-suggest", addressSuggestRouter);
import path from 'path';

const DATA_ROOT = process.env.DATA_ROOT || path.join(__dirname, '../data');

// Example paths (adjust names to your files)
export const PATHS = {
  planningZones: path.join(DATA_ROOT, 'planning_zones.geojson'),
  properties: path.join(DATA_ROOT, 'vic_properties.geojson'),
  pois: path.join(DATA_ROOT, 'pois.geojson')
  // masterpackage gpkg would be read via ogr2ogr / gdal or similar if needed
};
