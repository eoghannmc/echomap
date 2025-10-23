"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestRouter = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.suggestRouter = (0, express_1.Router)();
function readJSON(rel) {
    const full = path_1.default.join(process.cwd(), rel);
    return JSON.parse(fs_1.default.readFileSync(full, "utf-8"));
}
exports.suggestRouter.get("/", (_req, res) => {
    // keep minimal for now
    const results = [
        { key: "planning_zones", tag: "Data", label: "Planning Zones" },
        { key: "dwell_struct", tag: "Data", label: "Dwelling structure" },
        { key: "pois", tag: "Places", label: "Places (POIs by category)" },
        { key: "sa2", tag: "Areas", label: "SA2 boundaries" }
    ];
    res.json({ suggestions: results });
});
