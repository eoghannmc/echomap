export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type StreetRow = {
  street_key: string;
  variants: string[];
  localities: { locality_key: string; postcode: string; lon_c: number|null; lat_c: number|null; addr_count: number }[];
};

const cache = new Map<string, StreetRow[]>();

function resolveBaseDir(): string {
  const env = process.env.LOCAL_SHARD_DIR;
  if (env && fs.existsSync(path.join(env, "street_shards"))) return env;

  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "local_index"),
    path.join(cwd, "frontend", "local_index"),
    path.join(cwd, "..", "frontend", "local_index"),
  ];
  for (const b of candidates) {
        try { if (fs.existsSync(path.join(b, "street_shards"))) return b; } catch {}
  }
  return path.join(cwd, "local_index"); // fallback
}

const BASE = resolveBaseDir();
const SHARD_DIR = path.join(BASE, "street_shards");

function bucketFor(s: string) {
  if (!s) return "other";
  const c = s[0].toLowerCase();
  return /[a-z0-9]/.test(c) ? c : "other";
}

function loadShard(bucket: string) {
  const file = path.join(SHARD_DIR, `${bucket}.json`);
  const exists = fs.existsSync(file);
  if (!exists) return { items: [] as StreetRow[], file, exists: false, base: BASE };
  let items = cache.get(bucket);
  if (!items) {
    const raw = fs.readFileSync(file, "utf-8");
    items = JSON.parse(raw) as StreetRow[];
    cache.set(bucket, items);
  }
  return { items, file, exists: true, base: BASE };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const qRaw = (url.searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 50);
  const wantDebug = url.searchParams.get("debug") === "1";

  const letters = (qRaw.match(/[a-z]/gi) || []).length;
  if (letters < 2) {
    return NextResponse.json({ suggestions: [], ...(wantDebug && { debug: { reason: "letters<2", qRaw }}) });
  }

  const firstLetterIdx = qRaw.search(/[a-z0-9]/i);
  const norm = firstLetterIdx >= 0 ? qRaw.slice(firstLetterIdx) : qRaw;
  const bucket = bucketFor(norm);
  const { items, file, exists, base } = loadShard(bucket);

  if (!exists) {
    return NextResponse.json({ suggestions: [], ...(wantDebug && { debug: { bucket, file, base, exists }}) });
  }

  const scored = items
    .filter(s => s.street_key.includes(norm))
    .map(s => {
      const tot = (s.localities?.reduce((a,c)=>a + (c.addr_count||0), 0) || 0);
      const score = (s.street_key.startsWith(norm) ? 5 : 2) + Math.min(3, Math.log10(Math.max(1, tot)));
      return { s, score };
    })
    .sort((a,b) => b.score - a.score)
    .slice(0, limit)
    .map(({ s }) => ({
      key: `street:${s.street_key}`,
      tag: "Areas" as const,
      label: s.variants[0] || s.street_key,
      street_key: s.street_key,
      localities: s.localities,
    }));

  return NextResponse.json({
    suggestions: scored,
    ...(wantDebug && { debug: { bucket, file, base, count: items.length, q: qRaw, norm } })
  });
}