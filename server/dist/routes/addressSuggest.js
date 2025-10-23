"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addressSuggestRouter = void 0;
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
exports.addressSuggestRouter = (0, express_1.Router)();
// point to the DB built above
const DB_PATH = process.env.ADDR_DB || path_1.default.resolve(__dirname, "../../data/addresses.sqlite");
const db = new better_sqlite3_1.default(DB_PATH, { readonly: true });
/**
 * Strategy:
 *  - If q contains a digit → assume house number search, prefer num_road_address prefix LIKE
 *  - Else → FTS5 prefix via MATCH 'term*'
 *  - Always return top 3
 */
exports.addressSuggestRouter.get("/", (req, res) => {
    const q = String(req.query.q || "").trim();
    if (q.length < 3)
        return res.json({ suggestions: [] });
    const hasDigit = /\d/.test(q);
    const limit = 3;
    try {
        if (hasDigit) {
            // fast LIKE on num_road_address (ensure it’s uppercased for consistency)
            const like = q.toUpperCase() + "%";
            const stmt = db.prepare(`
        SELECT id, num_road_address, locality_name, postcode
        FROM addr
        WHERE UPPER(num_road_address) LIKE ?
        ORDER BY num_road_address
        LIMIT ?
      `);
            const rows = stmt.all(like, limit);
            return res.json({
                suggestions: rows.map((r) => ({
                    key: "address:" + r.id,
                    tag: "Address",
                    label: [r.num_road_address, r.locality_name && `, ${r.locality_name}`, r.postcode && ` ${r.postcode}`].filter(Boolean).join("")
                }))
            });
        }
        else {
            // FTS prefix on combined full_text (built as "num_road_address, locality, postcode")
            // Split by spaces and add * to last token for prefix
            const tokens = q.split(/\s+/).filter(Boolean);
            const last = tokens.pop();
            const match = [...tokens, `${last}*`].join(" ");
            const stmt = db.prepare(`
        SELECT a.id, a.num_road_address, a.locality_name, a.postcode
        FROM addr a
        JOIN addr_fts f ON f.rowid = a.id
        WHERE addr_fts MATCH ?
        LIMIT ?
      `);
            const rows = stmt.all(match, limit);
            return res.json({
                suggestions: rows.map((r) => ({
                    key: "address:" + r.id,
                    tag: "Address",
                    label: [r.num_road_address, r.locality_name && `, ${r.locality_name}`, r.postcode && ` ${r.postcode}`].filter(Boolean).join("")
                }))
            });
        }
    }
    catch (e) {
        console.error("addressSuggest error:", e);
        return res.json({ suggestions: [] });
    }
});
