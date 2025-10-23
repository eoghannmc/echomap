import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

/**
 * INPUT: a CSV with columns:
 *   objectid,num_road_address,road_name,locality_name,postcode,lon,lat
 * You can produce it from your Vicmap downloads with ogr2ogr or QGIS.
 * Keep only Victoria (it already is), no need for geometry beyond lon/lat here.
 */
const INPUT_CSV = process.env.ADDR_CSV || path.resolve(__dirname, "../../data/addresses.csv");
const OUT_DB    = process.env.ADDR_DB  || path.resolve(__dirname, "../../data/addresses.sqlite");

if (!fs.existsSync(INPUT_CSV)) {
  console.error("Missing input CSV:", INPUT_CSV);
  process.exit(1);
}
fs.mkdirSync(path.dirname(OUT_DB), { recursive: true });

const db = new Database(OUT_DB);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

// main table
db.exec(`
  DROP TABLE IF EXISTS addr;
  CREATE TABLE addr (
    id INTEGER PRIMARY KEY,
    num_road_address TEXT,
    road_name TEXT,
    locality_name TEXT,
    postcode TEXT,
    lon REAL,
    lat REAL
  );
`);

// FTS5 virtual table for fast prefix match on combined text
db.exec(`
  DROP TABLE IF EXISTS addr_fts;
  CREATE VIRTUAL TABLE addr_fts USING fts5(
    full_text, content='addr', content_rowid='id',
    tokenize = 'porter'
  );
`);

const ins = db.prepare(`
  INSERT INTO addr (id,num_road_address,road_name,locality_name,postcode,lon,lat)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const updFts = db.prepare(`
  INSERT INTO addr_fts (rowid, full_text) VALUES (?, ?)
`);

// crude CSV reader
function* readCSV(file: string) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const header = lines.shift();
  if (!header) return;
  const cols = header.split(",");
  const idx = (name:string) => cols.indexOf(name);
  const idI = idx("objectid");
  const numI = idx("num_road_address");
  const roadI = idx("road_name");
  const locI = idx("locality_name");
  const pcI = idx("postcode");
  const lonI = idx("lon");
  const latI = idx("lat");
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(",");
    yield {
      id: Number(parts[idI]),
      num: parts[numI],
      road: parts[roadI],
      loc: parts[locI],
      pc: parts[pcI],
      lon: Number(parts[lonI]),
      lat: Number(parts[latI]),
    };
  }
}

const tx = db.transaction(() => {
  let n = 0;
  for (const r of readCSV(INPUT_CSV)) {
    const full = [r.num, r.loc, r.pc].filter(Boolean).join(", ");
    ins.run(r.id, r.num, r.road, r.loc, r.pc, r.lon, r.lat);
    updFts.run(r.id, full);
    if (++n % 5000 === 0) console.log("Inserted", n);
  }
});
tx();

db.exec(`CREATE INDEX IF NOT EXISTS idx_addr_loc ON addr(locality_name, postcode);`);
console.log("Built", OUT_DB);
