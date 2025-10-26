import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/* ---------------- Types ---------------- */
type PillTag = "Data" | "Areas" | "Places";
type StreetTag = "Street";
type AddressTag = "Address";

type Street = { id?: string; name: string; locality?: string; state?: string; postcode?: string };

type StreetSuggest  = { key: string; tag: StreetTag;  label: string };
type AddressSuggest = { key: string; tag: AddressTag; label: string; lon?: number; lat?: number };
type PillSuggest    = { key: string; tag: PillTag;    label: string };
type Suggest        = StreetSuggest | AddressSuggest | PillSuggest;

/* ---------------- Config ---------------- */
const SHARD_BASE = process.env.NEXT_PUBLIC_SHARD_BASE || "/local_index"; // HTTP first (Storage or /public)
const LOCAL_SHARD_DIR = process.env.LOCAL_SHARD_DIR || "";               // FS fallback (dev)

const STREET_SHARD     = (ch: string) => `street_shards/${ch}.json`;
const ADDR_MICRO_SHARD = (ch: string) => `address_micro/${ch}_addr_micro.json`;

const BASE_PILLS: PillSuggest[] = [
  { key: "planning_zones", tag: "Data",   label: "Planning Zones" },
  { key: "dwell_struct",   tag: "Data",   label: "Dwelling structure" },
  { key: "pois",           tag: "Places", label: "Places (POIs by category)" },
  { key: "sa2",            tag: "Areas",  label: "SA2 boundaries" },
];

const STREET_API  = process.env.FRONTEND_STREET_API;
const ADDRESS_API = process.env.FRONTEND_ADDRESS_API;




/* --------------SQL STATS-----------------*/




/* ---------------- Helpers ---------------- */
function normStreet(text: string) {
  return (text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\b(street|st|road|rd|avenue|ave|av|boulevard|blvd|pde|parade|drive|dr|court|ct|lane|ln|terrace|tce|place|pl)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const take3 = (s: string) => s.slice(0, 3);
function firstAlphaOrNull(s: string) {
  const m = s.match(/[a-z]/i);
  return m ? m[0].toLowerCase() : null;
}

/** Build absolute HTTP url for shards */
function toHttpUrl(relPath: string, origin: string) {
  const base = SHARD_BASE.replace(/\/+$/, "");
  const rel  = relPath.replace(/^\/+/, "");
  return /^https?:\/\//i.test(base) ? `${base}/${rel}` : new URL(`${base}/${rel}`, origin).toString();
}

async function readJsonHttp(relPath: string, origin: string) {
  const url = toHttpUrl(relPath, origin);
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    return { json: await res.json(), source: "http" as const, where: url };
  } catch {
    return null;
  }
}

async function readJsonFs(relPath: string) {
  if (!LOCAL_SHARD_DIR) return null;
  const normalized = relPath.replace(/^\/+/, "").split("/").join(path.sep);
  const full = path.join(LOCAL_SHARD_DIR, normalized);
  try {
    const txt = await fs.readFile(full, "utf8");
    return { json: JSON.parse(txt), source: "fs" as const, where: full };
  } catch {
    return null;
  }
}

/** HTTP first (Storage/CDN or /public), FS fallback (dev) */
async function getShard(relPath: string, origin: string) {
  const httpHit = await readJsonHttp(relPath, origin);
  if (httpHit) return httpHit;
  const fsHit = await readJsonFs(relPath);
  if (fsHit) return fsHit;
  return null;
}

/** Accept many shard shapes and return normalized [ [id, Street], ... ] and keys for debug. */
function getStreetEntriesAndMeta(shard: any): { entries: Array<[string, Street]>, rootKeys: string[] } {
  if (!shard) return { entries: [], rootKeys: [] };
  const keys = Array.isArray(shard) ? ["<top-level-array>"] : Object.keys(shard);

  if (shard.streets && !Array.isArray(shard.streets) && typeof shard.streets === "object") {
    return { entries: Object.entries(shard.streets).map(([id, s]: [string, any]) => [id, s as Street]), rootKeys: keys };
  }
  if (Array.isArray(shard.streets)) {
    return { entries: (shard.streets as any[]).map((s, i) => [String(s.id ?? i), s as Street]), rootKeys: keys };
  }
  if (Array.isArray(shard.items)) {
    return { entries: (shard.items as any[]).map((s, i) => [String(s.id ?? i), s as Street]), rootKeys: keys };
  }
  if (Array.isArray(shard.data)) {
    return { entries: (shard.data as any[]).map((s, i) => [String(s.id ?? i), s as Street]), rootKeys: keys };
  }
  if (Array.isArray(shard)) {
    return { entries: (shard as any[]).map((s, i) => [String(s.id ?? i), s as Street]), rootKeys: ["<top-level-array>"] };
  }
  return { entries: [], rootKeys: keys };
}

function parseQueryParts(qRaw: string) {
  const m = qRaw.match(/^\s*(\d{1,4})\s+(.+)$/);
  const num = m ? m[1] : null;
  const tail = m ? m[2] : qRaw;
  const parts = tail.split(",").map(s => s.trim()).filter(Boolean);
  const streetRaw   = parts[0] ?? "";
  const localityRaw = parts.length > 1 ? parts.slice(1).join(", ").trim() : null;
  return { num, streetRaw, localityRaw };
}

/* ---------------- Route ---------------- */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qRaw  = (searchParams.get("q") || "").trim();
    const debug = searchParams.get("debug") === "1";
    const origin = req.nextUrl.origin;

    if (qRaw.length < 2) {
      return NextResponse.json({ suggestions: BASE_PILLS as Suggest[] });
    }

    const { num, streetRaw, localityRaw } = parseQueryParts(qRaw);
    const hasLeadingNum = !!num;

    const streetPart = normStreet(streetRaw);
    if (!streetPart) {
      const hint: StreetSuggest = { key: "hint-street", tag: "Street", label: 'Type a street name, e.g. "125 Holden ..."' };
      return NextResponse.json({ suggestions: [hint, BASE_PILLS[0]] as Suggest[] });
    }

    const shardChar = firstAlphaOrNull(streetPart);
    if (!shardChar) {
      const hint: StreetSuggest = { key: "hint-street", tag: "Street", label: 'Type a street name, e.g. "125 Holden ..."' };
      return NextResponse.json({ suggestions: [hint, BASE_PILLS[0]] as Suggest[] });
    }

    // Load shards (HTTP first → FS fallback)
    const [streetShardHit, addrMicroHit] = await Promise.all([
      getShard(STREET_SHARD(shardChar), origin),
      hasLeadingNum ? getShard(ADDR_MICRO_SHARD(shardChar), origin) : Promise.resolve(null),
    ]);
    const streetShard = streetShardHit?.json ?? null;
    const addrMicro   = addrMicroHit?.json ?? null;

    const out: Suggest[] = [];
    let streetSource: "prefix3" | "scan_startswith" | "scan_contains" | "api_street" | "none" = "none";
    let apiStreetStatus: number | null = null;
    let addressLocalStatus: number | null = null;

    // ---- Streets via shard (prefix3 -> scan) or fallback /api/street ----
    let streetIds: string[] = [];
    const { entries: streetEntries, rootKeys } = getStreetEntriesAndMeta(streetShard);

    if (streetShard && (streetShard as any).prefix3) {
      const by3 = (streetShard as any).prefix3[take3(streetPart)];
      if (Array.isArray(by3) && by3.length) {
        streetIds = by3.slice(0, 64);
        streetSource = "prefix3";
      }
    }
    if (streetIds.length === 0 && streetEntries.length) {
      const starts = streetEntries.filter(([_, s]) => normStreet(s?.name || "").startsWith(streetPart));
      if (starts.length) {
        streetIds = starts.slice(0, 64).map(([id]) => id);
        streetSource = "scan_startswith";
      }
    }
    if (streetIds.length === 0 && streetEntries.length) {
      const contains = streetEntries.filter(([_, s]) => normStreet(s?.name || "").includes(streetPart));
      if (contains.length) {
        streetIds = contains.slice(0, 64).map(([id]) => id);
        streetSource = "scan_contains";
      }
    }
    if (streetIds.length === 0) {
      try {
        const streetUrl = `${(STREET_API ?? `${origin}/api/street`)}?q=${encodeURIComponent(streetRaw)}&limit=8`;
        const res = await fetch(streetUrl, { cache: "no-store" });
        apiStreetStatus = res.status ?? null;
        if (res.ok) {
          const data = await res.json();
          const arr: any[] =
            Array.isArray(data?.suggestions) ? data.suggestions :
            Array.isArray(data) ? data : [];
          for (const s of arr.slice(0, 8)) {
            const baseLabel: string =
              typeof s?.label === "string" ? s.label :
              typeof s?.name === "string" ? s.name :
              String(s);
            if (!baseLabel) continue;
            const loc = (s?.locality ?? s?.suburb ?? "").toString().trim();
            const label = loc ? `${baseLabel} (${loc})` : baseLabel;
            out.push({ key: `street:${baseLabel}:${loc}`, tag: "Street", label });
          }
          if (arr.length) streetSource = "api_street";
        }
      } catch { apiStreetStatus = -1; }
    } else {
      // Emit from shard; append locality in parentheses
      for (const id of streetIds.slice(0, 8)) {
        const s = streetEntries.find(([sid]) => sid === id)?.[1];
        if (!s) continue;
        const loc = (s.locality ?? "").toString().trim();
        const label = loc ? `${s.name} (${loc})` : `${s.name}`;
        out.push({ key: `street-${id}`, tag: "Street", label });
      }
    }

    // ---- Addresses via micro-index ----
    let microUsed = false;
    let computedKey: string | null = null;

    if (hasLeadingNum && addrMicro) {
      const streetPrefix3 = take3(streetPart);
      const numPrefix = (num ?? "").slice(0, 3);
      computedKey = `${numPrefix}${streetPrefix3}`; // e.g. 215hol
      const addrIds: string[] = (addrMicro[computedKey] ?? []).slice(0, 4);

      if (addrIds.length > 0) {
        microUsed = true;
        const bestStreet = out.find(s => s.tag === "Street")?.label ?? streetRaw;
        const bestStreetName = bestStreet.split("(")[0].split(",")[0].trim(); // "Farnham Street"
        const bestLocality = (bestStreet.match(/\(([^)]+)\)/)?.[1] ?? "").trim();
        for (const aid of addrIds) {
          const base = `${num} ${bestStreetName}`.trim();
          const label = bestLocality ? `${base} (${bestLocality})` : base;
          out.unshift({ key: `addr-${aid}`, tag: "Address", label });
        }
      }
    }

    // ---- Enrichment via /api/address-local (even if no streets) ----
    if (hasLeadingNum && (microUsed || out.every(s => s.tag !== "Street"))) {
      const bestStreetName = (out.find(s => s.tag === "Street")?.label ?? streetRaw).split("(")[0].split(",")[0].trim();
      const params = new URLSearchParams({ street: bestStreetName, num: String(num), limit: "4" });
      const explicitLocality = (out.find(s => s.tag === "Street")?.label.match(/\(([^)]+)\)/)?.[1] ?? localityRaw ?? "").trim();
      if (explicitLocality) params.set("locality", explicitLocality);

      try {
        const res = await fetch(`${(ADDRESS_API ?? `${origin}/api/address-local`)}?${params.toString()}`, { cache: "no-store" });
        addressLocalStatus = res.status ?? null;
        if (res.ok) {
          const rows = await res.json() as Array<{ id: string; label: string; lon?: number; lat?: number }>;
          const byId = new Map(rows.map(r => [String(r.id), r]));
          for (let i = 0; i < out.length; i++) {
            const it = out[i];
            if (it.tag !== "Address") continue;
            const m = it.key.match(/^addr-(.+)$/);
            if (!m) continue;
            const rid = m[1];
            const full = byId.get(rid);
            if (full && full.label) {
              out[i] = { ...it, label: full.label, lon: full.lon, lat: full.lat };
            }
          }
          if (!microUsed && rows.length) {
            const injected: AddressSuggest[] = rows.slice(0, 4).map(r => ({
              key: `addr-${r.id}`,
              tag: "Address",
              label: r.label,
              lon: r.lon,
              lat: r.lat
            }));
            out.unshift(...injected);
          }
        }
      } catch { addressLocalStatus = -1; }
    }

    // ---- FINAL ASSEMBLY (de-dupe + “fill with streets” + 1 pill) ----
    const addresses = out.filter((s): s is AddressSuggest => s.tag === "Address");
    const streets   = out.filter((s): s is StreetSuggest  => s.tag === "Street");

    const dedupAddr: AddressSuggest[] = [];
    const seenAddrKeys = new Set<string>();
    for (const a of addresses) {
      if (seenAddrKeys.has(a.key)) continue;
      seenAddrKeys.add(a.key);
      dedupAddr.push(a);
      if (dedupAddr.length === 4) break;
    }

    const needed = Math.max(0, 4 - dedupAddr.length);
    const dedupStreets: StreetSuggest[] = [];
    const seenStreetKeys = new Set<string>();
    for (const s of streets) {
      if (seenStreetKeys.has(s.key)) continue;
      seenStreetKeys.add(s.key);
      dedupStreets.push(s);
      if (dedupStreets.length === needed) break;
    }

    const onePill: Suggest[] = BASE_PILLS.length ? [BASE_PILLS[0]] : [];
    const finalList: Suggest[] = [...dedupAddr, ...dedupStreets, ...onePill].slice(0, 5);

    return NextResponse.json({
      suggestions: finalList,
      ...(debug ? {
        debug: {
          hasLeadingNum, microUsed, computedKey: hasLeadingNum ? `${(num ?? "").slice(0,3)}${take3(streetPart)}` : null,
          shardChar, streetPart, localityRaw,
          sources: {
            streetShard: streetShardHit ? streetShardHit.source : null,
            addrMicro:   addrMicroHit   ? addrMicroHit.source   : null
          },
          where: {
            streetShard: streetShardHit ? streetShardHit.where : null,
            addrMicro:   addrMicroHit   ? addrMicroHit.where   : null
          },
          streetSource,
          apiStreetStatus,
          addressLocalStatus
        }
      } : {})
    });

  } catch (e) {
    console.error("suggest route error:", e);
    return NextResponse.json({ suggestions: BASE_PILLS as Suggest[] }, { status: 200 });
  }
}
