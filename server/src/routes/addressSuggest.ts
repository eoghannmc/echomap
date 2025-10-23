// server/src/routes/addressSuggest.ts
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

export const addressSuggestRouter = Router();

const DATA_ROOT = process.env.DATA_ROOT || path.join(__dirname, '../../data');
const ADDR_DB = process.env.ADDR_DB || path.join(DATA_ROOT, 'addresses.sqlite');

// open DB only if it exists; otherwise return null (and the route will return [])
function openDbIfPresent() {
  if (!fs.existsSync(ADDR_DB)) return null;
  try {
    return new Database(ADDR_DB, { readonly: true /* , fileMustExist: true */ });
  } catch (e) {
    console.error('Failed to open addresses DB:', e);
    return null;
  }
}

addressSuggestRouter.get('/', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) return res.json([]);

  const db = openDbIfPresent();
  if (!db) {
    // No DB file present yet (e.g., Render without uploaded file) — keep UI responsive
    return res.json([]);
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
    const items = rows.map((r: any, i: number) => ({
      key: `addr-${i}-${r.label}`,
      tag: 'Address',
      label: r.label,
    }));
    res.json(items);
  } catch (e) {
    console.error('addressSuggest query error:', e);
    res.json([]);
  } finally {
    try { db.close(); } catch {}
  }
});
