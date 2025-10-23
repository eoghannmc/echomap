// tools/build_address_db.ts
// Build a prefix index from data/addresses.csv to public/addresses/index.json
// Usage:  npx ts-node tools/build_address_db.ts

import fs from "fs";
import path from "path";
import readline from "readline";

const CSV_PATH = path.resolve("data/addresses.csv");
const OUT_DIR = path.resolve("public", "addresses");
const OUT_JSON = path.join(OUT_DIR, "index.json");

// Normalise to ascii-ish, lowercase, alnum+space only
function normaliseLabel(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function prefixKey(s: string): string {
  return normaliseLabel(s).replace(/\s+/g, "").slice(0, 3); // first 3 chars, no spaces
}

type Row = { id: string; label: string; lon: number; lat: number; locality?: string; postcode?: string };
type Bucket = Array<{ id: string; l: string; x: number; y: number }>; // l=label, x=lon, y=lat

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Missing CSV at ${CSV_PATH}. Run tools/update_addresses.py first.`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const fileStream = fs.createReadStream(CSV_PATH);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers: string[] = [];
  const buckets: Record<string, Bucket> = {};
  let lineNo = 0;

  for await (const line of rl) {
    lineNo++;
    if (lineNo === 1) {
      headers = line.split(","); // simple CSV (no embedded commas in label from our script)
      continue;
    }
    if (!line.trim()) continue;

    const parts = splitCsv(line, headers.length);
    const obj: any = Object.fromEntries(parts.map((v, i) => [headers[i], v]));

    const row: Row = {
      id: obj.id,
      label: obj.label,
      lon: parseFloat(obj.lon),
      lat: parseFloat(obj.lat),
      locality: obj.locality,
      postcode: obj.postcode
    };
    if (!row.label || isNaN(row.lon) || isNaN(row.lat)) continue;

    const key = prefixKey(row.label);
    if (!key) continue;

    if (!buckets[key]) buckets[key] = [];
    buckets[key].push({ id: row.id, l: row.label, x: row.lon, y: row.lat });
  }

  // Optionally cap bucket sizes to keep payload tiny (keeps most-relevant by natural order)
  const MAX_PER_BUCKET = 5000; // tune if needed
  for (const k of Object.keys(buckets)) {
    if (buckets[k].length > MAX_PER_BUCKET) {
      buckets[k] = buckets[k].slice(0, MAX_PER_BUCKET);
    }
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify({ version: 1, buckets }), "utf-8");
  console.log(`Built ${OUT_JSON} with ${Object.keys(buckets).length} buckets`);
}

// basic CSV splitter for our simple rows
function splitCsv(line: string, expected: number): string[] {
  // labels do not contain commas from our python script, so a naive split is safe.
  const parts = line.split(",");
  if (parts.length !== expected) {
    // fallback: try to recombine tail
    const head = parts.slice(0, expected - 1);
    const tail = parts.slice(expected - 1).join(",");
    return [...head, tail];
  }
  return parts;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
