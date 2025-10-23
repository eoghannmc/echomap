"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addressSuggestRouter = void 0;
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
exports.addressSuggestRouter = (0, express_1.Router)();
// Resolve DB path from env or DATA_ROOT default
const DATA_ROOT = process.env.DATA_ROOT || path_1.default.join(__dirname, '../../data');
const ADDR_DB = process.env.ADDR_DB || path_1.default.join(DATA_ROOT, 'addresses.sqlite');
// Helper to open DB only if file exists
function openDbIfPresent() {
    if (!fs_1.default.existsSync(ADDR_DB)) {
        return null; // DB not present yet
    }
    try {
        return new better_sqlite3_1.default(ADDR_DB, { readonly: true /*, fileMustExist: true */ });
    }
    catch (e) {
        console.error('Failed to open addresses DB:', e);
        return null;
    }
}
exports.addressSuggestRouter.get('/', (req, res) => {
    const q = String(req.query.q || '').trim();
    if (q.length < 3)
        return res.json([]); // same UX rule
    const db = openDbIfPresent();
    if (!db) {
        // No DB yet => return empty suggestions so UI stays responsive
        return res.json([]);
        // (Optional fallback: call ArcGIS API and proxy results instead)
    }
    try {
        const stmt = db.prepare(`
      SELECT full_address AS label
      FROM address_index
      WHERE full_address LIKE ? 
      ORDER BY full_address
      LIMIT 3
    `);
        const rows = stmt.all(`%${q}%`);
        const items = rows.map((r, i) => ({
            key: `addr-${i}-${r.label}`,
            tag: 'Address',
            label: r.label
        }));
        res.json(items);
    }
    catch (e) {
        console.error('addressSuggest query error:', e);
        res.json([]);
    }
    finally {
        try {
            db.close();
        }
        catch { }
    }
});
