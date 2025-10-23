import express from "express";
import addressSuggest from "./addressSuggest";

const router = express.Router();

router.get("/", (_req, res) => {
  const base = [
    { key: "planning_zones", tag: "Data", label: "Planning Zones" },
    { key: "dwell_struct",   tag: "Data", label: "Dwelling structure" },
    { key: "pois",           tag: "Places", label: "Places (POIs by category)" },
    { key: "sa2",            tag: "Areas", label: "SA2 boundaries" }
  ];
  res.json({ suggestions: base });
});

// merge: mount the addressSuggest under /address
router.use("/address", addressSuggest);

export default router;
