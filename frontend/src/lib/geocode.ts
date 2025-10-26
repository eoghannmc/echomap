export type NomPlace = {
  display_name: string; lat: string; lon: string; type?: string;
  address?: { state?: string; country?: string; };
};

const VIC_VIEWBOX = "140.96,-39.20,150.05,-33.98"; // lon1,lat1,lon2,lat2

export async function nominatimSearchVic(q: string, limit = 5): Promise<NomPlace[]> {
  const qs = new URLSearchParams({
    q, format: "jsonv2", addressdetails: "1", limit: String(limit),
    countrycodes: "au", viewbox: VIC_VIEWBOX, bounded: "1",
  });
  const r = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, {
    headers: { "Accept-Language": "en" }
  });
  const arr = (await r.json()) as NomPlace[];
  return arr.filter(p => p.address?.state?.toLowerCase().includes("victoria"));
}

export async function nominatimReverse(lon: number, lat: number): Promise<NomPlace | null> {
  const qs = new URLSearchParams({
    lon: String(lon), lat: String(lat), format: "jsonv2", addressdetails: "1"
  });
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?${qs}`, {
    headers: { "Accept-Language": "en" }
  });
  const obj = (await r.json()) as NomPlace;
  // optional: reject if outside VIC
  if (!obj?.address?.state?.toLowerCase().includes("victoria")) return null;
  return obj;
}
