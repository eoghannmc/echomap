"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const compileRun_1 = require("./routes/compileRun");
const suggest_1 = require("./routes/suggest");
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
