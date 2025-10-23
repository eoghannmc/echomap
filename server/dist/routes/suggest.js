"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const addressSuggest_1 = __importDefault(require("./addressSuggest"));
const router = express_1.default.Router();
router.get("/", (_req, res) => {
    const base = [
        { key: "planning_zones", tag: "Data", label: "Planning Zones" },
        { key: "dwell_struct", tag: "Data", label: "Dwelling structure" },
        { key: "pois", tag: "Places", label: "Places (POIs by category)" },
        { key: "sa2", tag: "Areas", label: "SA2 boundaries" }
    ];
    res.json({ suggestions: base });
});
// merge: mount the addressSuggest under /address
router.use("/address", addressSuggest_1.default);
exports.default = router;
