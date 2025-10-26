// src/lib/suggest.ts
export type Tag = "Address" | "Areas" | "Places" | "Data" | "Multi";
export type SuggestItem = {
  key: string;
  tag: Tag;
  label: string;
  lon?: number | null;
  lat?: number | null;
  // extras for street drill-down:
  street_key?: string;
  locality?: string;
  postcode?: string;
  localities?: { locality_key: string; postcode: string; lon_c: number|null; lat_c: number|null; addr_count: number }[];
};

const LRU = new Map<string, { t: number; data: any }>();
const TTL = 15_000;
const cacheGet = (k: string) => {
  const v = LRU.get(k);
  if (!v) return null;
  if (Date.now() - v.t > TTL) { LRU.delete(k); return null; }
  return v.data;
};
const cacheSet = (k: string, data: any) => {
  LRU.set(k, { t: Date.now(), data });
  if (LRU.size > 200) LRU.delete(LRU.keys().next().value);
};

export async function fetchGenericOnly(q: string, limit = 8, signal?: AbortSignal): Promise<SuggestItem[]> {
  const key = `gen:${q}:${limit}`; const hit = cacheGet(key); if (hit) return hit;
  const r = await fetch(`/api/suggest?q=${encodeURIComponent(q)}&limit=${limit}`, { signal, cache: "no-store" });
  const data = r.ok ? await r.json() : { suggestions: [] };
  const out = (data?.suggestions ?? []) as SuggestItem[];
  cacheSet(key, out);
  return out;
}

export async function fetchStreet(q: string, limit = 12, signal?: AbortSignal): Promise<SuggestItem[]> {
  const key = `street:${q}:${limit}`; const hit = cacheGet(key); if (hit) return hit;
  const r = await fetch(`/api/street?q=${encodeURIComponent(q)}&limit=${limit}`, { signal, cache: "no-store" });
  const data = r.ok ? await r.json() : { suggestions: [] };
  const out = (data?.suggestions ?? []) as SuggestItem[];
  cacheSet(key, out);
  return out;
}

export async function fetchAddressLocal(street_key: string, locality_key?: string, numPrefix?: string, limit = 10, signal?: AbortSignal): Promise<SuggestItem[]> {
  const qs = new URLSearchParams({ street: street_key, limit: String(limit) });
  if (locality_key) qs.set("locality", locality_key);
  if (numPrefix)   qs.set("num", numPrefix);
  const key = `addrLocal:${qs.toString()}`; const hit = cacheGet(key); if (hit) return hit;
  const r = await fetch(`/api/address-local?${qs.toString()}`, { signal, cache: "no-store" });
  const data = r.ok ? await r.json() : { items: [] };
  const out = (data?.items ?? []) as SuggestItem[];
  cacheSet(key, out);
  return out;
}
