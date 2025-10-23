import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";

export const suggestRouter = Router();

function readJSON(rel: string) {
  const full = path.join(process.cwd(), rel);
  return JSON.parse(fs.readFileSync(full, "utf-8"));
}

suggestRouter.get("/", (_req: Request, res: Response) => {
  // keep minimal for now
  const results = [
    { key: "planning_zones", tag: "Data", label: "Planning Zones" },
    { key: "dwell_struct",   tag: "Data", label: "Dwelling structure" },
    { key: "pois",           tag: "Places", label: "Places (POIs by category)" },
    { key: "sa2",            tag: "Areas", label: "SA2 boundaries" }
  ];
  res.json({ suggestions: results });
});
