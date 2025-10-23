"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATHS = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const compileRun_1 = require("./routes/compileRun");
const suggest_1 = require("./routes/suggest");
require("dotenv/config"); // at top of server/src/index.ts
const health_1 = require("./routes/health");
// ... other imports
require("dotenv/config");
const fs_1 = __importDefault(require("fs"));
// Ensure DATA_ROOT exists so routes that use it won't crash
const DATA_ROOT = process.env.DATA_ROOT || path_1.default.join(__dirname, '../data');
try {
    fs_1.default.mkdirSync(DATA_ROOT, { recursive: true });
    console.log('DATA_ROOT:', DATA_ROOT);
}
catch (e) {
    console.error('Failed to create DATA_ROOT directory', DATA_ROOT, e);
}
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:3000",
        /\.vercel\.app$/, // any Vercel preview
    ],
}));
app.use(express_1.default.json());
app.use("/api/health", health_1.healthRouter);
// app.use("/api/suggest", suggestRouter);
// app.use("/api/address-suggest", addressSuggestRouter);
// app.use("/api/compile-run", compileRunRouter);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server on :${PORT}`);
});
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// (Optional) expose raw geojson for quick checks:
app.use("/geojson", express_1.default.static(path_1.default.join(process.cwd(), "data_web", "geojson")));
app.use("/api/compile-run", compileRun_1.compileRunRouter);
app.use("/api/suggest", suggest_1.suggestRouter);
app.get("/api/health", (_req, res) => res.json({ ok: true }));
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
const addressSuggest_1 = require("./routes/addressSuggest");
app.use("/api/address-suggest", addressSuggest_1.addressSuggestRouter);
const DATA_ROOT = process.env.DATA_ROOT || path_1.default.join(__dirname, '../data');
// Example paths (adjust names to your files)
exports.PATHS = {
    planningZones: path_1.default.join(DATA_ROOT, 'planning_zones.geojson'),
    properties: path_1.default.join(DATA_ROOT, 'vic_properties.geojson'),
    pois: path_1.default.join(DATA_ROOT, 'pois.geojson')
    // masterpackage gpkg would be read via ogr2ogr / gdal or similar if needed
};
