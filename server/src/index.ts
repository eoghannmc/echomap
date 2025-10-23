import express from "express";
import cors from "cors";
import path from "path";
import { compileRunRouter } from "./routes/compileRun";
import { suggestRouter } from "./routes/suggest";

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
