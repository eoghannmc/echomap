export type Tag = "Data" | "Places" | "Areas" | "Address" | "Multi";
export type SuggestItem = { key: string; tag: Tag; label: string };

const API = process.env.NEXT_PUBLIC_API_BASE || "";

// Keep one controller per call-site to cancel stale requests
let ctrlMain: AbortController | null = null;
let ctrlLoc: AbortController | null = null;

export async function fetchMergedSuggestions(q: string): Promise<SuggestItem[]> {
  if (ctrlMain) ctrlMain.abort();
  ctrlMain = new AbortController();
  const signal = ctrlMain.signal;

  const wantAddr = q.trim().length >= 3;
  const wantNonAddr = q.trim().length >= 2;

  const [addrRes, genericRes] = await Promise.all([
    wantAddr
      ? fetch(`${API}/api/address-suggest?q=${encodeURIComponent(q)}`, { signal }).then(r => r.ok ? r.json() : { suggestions: [] })
      : Promise.resolve({ suggestions: [] }),
    wantNonAddr
      ? fetch(`${API}/api/suggest?q=${encodeURIComponent(q)}`, { signal }).then(r => r.ok ? r.json() : { suggestions: [] })
      : Promise.resolve({ suggestions: [] }),
  ]);

  const addresses: SuggestItem[] = (addrRes?.suggestions ?? []).slice(0, 3);
  const rest: SuggestItem[] = (genericRes?.suggestions ?? []).filter((s: SuggestItem) => s.tag !== "Address");

  const spaceLeft = Math.max(0, 4 - addresses.length);
  const nonAddrPicks = rest.slice(0, spaceLeft);
  return [...addresses, ...nonAddrPicks];
}

export async function fetchAddressOnly(q: string): Promise<SuggestItem[]> {
  if (ctrlLoc) ctrlLoc.abort();
  ctrlLoc = new AbortController();
  const signal = ctrlLoc.signal;

  if (q.trim().length < 3) return [];
  const r = await fetch(`${API}/api/address-suggest?q=${encodeURIComponent(q)}`, { signal });
  const data = r.ok ? await r.json() : { suggestions: [] };
  return (data?.suggestions ?? []).slice(0, 3);
}
