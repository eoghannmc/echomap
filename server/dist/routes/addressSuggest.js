"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/addressSuggest.ts
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
// If you're on Node 18+, global fetch exists; otherwise uncomment the next line
// import fetch from "node-fetch";
const router = express_1.default.Router();
// ---- Env / config ----
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const DATA_ROOT = process.env.DATA_ROOT || path_1.default.join(__dirname, "../../data");
const ADDR_DB = process.env.ADDR_DB || path_1.default.join(DATA_ROOT, "addresses.sqlite");
// ---- Helpers ----
function openDbIfPresent() {
    if (!fs_1.default.existsSync(ADDR_DB))
        return null;
    try {
        return new better_sqlite3_1.default(ADDR_DB, { readonly: true /* , fileMustExist: true */ });
    }
    catch (e) {
        console.error("Failed to open addresses DB:", e);
        return null;
    }
}
function normalizeLimit(input, def = 10, max = 50) {
    const n = Number(input);
    if (!Number.isFinite(n) || n <= 0)
        return def;
    return Math.min(n, max);
}
// ---- Route ----
router.post("/", async (req, res) => {
    try {
        const q = String((req.body?.q ?? "")).trim();
        const lim = normalizeLimit(req.body?.lim, 10, 50);
        if (q.length < 2)
            return res.json([]);
        // Prefer Supabase if configured
        if (SUPABASE_URL && SUPABASE_KEY) {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/addresses_search`, {
                method: "POST",
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ q, lim }),
            });
            if (!r.ok) {
                const text = await r.text();
                console.warn("Supabase RPC error:", r.status, text);
            }
            else {
                const rows = await r.json();
                // Normalize to your UI’s expected shape
                const items = rows.map((r) => ({
                    key: `addr-${r.id}`,
                    tag: "Address",
                    label: r.label,
                    lon: r.lon,
                    lat: r.lat,
                }));
                return res.json(items);
            }
        }
        // Fallback: local SQLite index (dev/offline mode)
        const db = openDbIfPresent();
        if (!db)
            return res.json([]);
        try {
            const stmt = db.prepare(`
        SELECT full_address AS label
        FROM address_index
        WHERE full_address LIKE ?
        ORDER BY full_address
        LIMIT ?
      `);
            const rows = stmt.all(`%${q}%`, lim);
            const items = rows.map((r, i) => ({
                key: `addr-local-${i}`,
                tag: "Address",
                label: r.label,
            }));
            return res.json(items);
        }
        finally {
            try {
                db.close();
            }
            catch { }
        }
    }
    catch (err) {
        console.error("addressSuggest error:", err);
        return res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
