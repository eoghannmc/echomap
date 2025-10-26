export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createInterface } from "node:readline";

// Where we wrote the shards: <project-root>/frontend/local_index/address_shards/<bucket>.csv


function resolveBaseDir(): string {
  const env = process.env.LOCAL_SHARD_DIR;
  if (env && fs.existsSync(path.join(env, "address_shards"))) return env;

  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "local_index"),
    path.join(cwd, "frontend", "local_index"),
    path.join(cwd, "..", "frontend", "local_index"),
  ];
  for (const b of candidates) {
    try { if (fs.existsSync(path.join(b, "address_shards"))) return b; } catch {}
  }
  return path.join(cwd, "local_index");
}

const BASE = resolveBaseDir();
const SHARD_DIR = path.join(BASE, "address_shards");

function bucketFor(s: string) {
  if (!s) return "other";
  const c = s[0]?.toLowerCase?.() ?? "";
  return /[a-z0-9]/.test(c) ? c : "other";
}

// minimal CSV parser that handles quoted commas
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i=0;i<line.length;i++){
    const ch=line[i];
    if (ch==='"'){ if(inQ && line[i+1]==='"'){cur+='"'; i++;} else {inQ=!inQ;} }
    else if (ch===',' && !inQ){ out.push(cur); cur=""; }
    else { cur+=ch; }
  }
  out.push(cur);
  return out;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const street   = (url.searchParams.get("street")   || "").trim().toLowerCase();
  const locality = (url.searchParams.get("locality") || "").trim().toLowerCase();
  const num      = (url.searchParams.get("num")      || "").trim().toLowerCase();
  const limit    = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 200);

  if (!street) return NextResponse.json({ items: [], total: 0 });

  const bucket = bucketFor(street);
  const file = path.join(SHARD_DIR, `${bucket}.csv`);

  try { await fs.promises.access(file); }
  catch {
    return NextResponse.json({ items: [], total: 0, debug: { base: BASE, file, exists: false } });
  }

  const stream = fs.createReadStream(file, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Number.POSITIVE_INFINITY });

  let header: string[] | null = null;
  const items: any[] = [];
  try {
    for await (const raw of rl) {
      const cols = parseCsvLine(raw);
      if (!header) { header = cols; continue; }
      const rec: Record<string,string> = {};
      header.forEach((h, i) => (rec[h] = cols[i] ?? ""));

      if ((rec["street_key"] || "").toLowerCase() !== street) continue;
      if (locality && (rec["locality_key"] || "") !== locality) continue;
      if (num && (rec["house_no"] || "").toLowerCase().indexOf(num) !== 0) continue;

      items.push({
        id: rec["id"],
        label: rec["label"],
        lon: rec["lon"] ? Number(rec["lon"]) : null,
        lat: rec["lat"] ? Number(rec["lat"]) : null,
        locality: rec["locality_key"],
        postcode: rec["postcode"],
        tag: "Address" as const,
      });
      if (items.length >= limit) break;
    }
  } finally {
    rl.close();
    stream.close();
  }

  return NextResponse.json({ items, total: items.length });
}


// ______________________

