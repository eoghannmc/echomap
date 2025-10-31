export type NomPlace = {
  display_name: string; lat: string; lon: string; type?: string;
  address?: { state?: string; country?: string; };
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export async function nominatimSearchVic(q: string, limit = 5): Promise<NomPlace[]> {
  try {
    const qs = new URLSearchParams({ q, limit: String(limit) });
    const r = await fetch(`${BACKEND_URL}/geocode/search?${qs}`);
    if (!r.ok) {
      console.error(`Geocode search error: ${r.status} ${r.statusText}`);
      return [];
    }
    const arr = (await r.json()) as NomPlace[];
    return arr;
  } catch (error) {
    console.error("Geocode search failed:", error);
    return [];
  }
}

export async function nominatimReverse(lon: number, lat: number): Promise<NomPlace | null> {
  try {
    const qs = new URLSearchParams({ lon: String(lon), lat: String(lat) });
    const r = await fetch(`${BACKEND_URL}/geocode/reverse?${qs}`);
    if (!r.ok) {
      console.error(`Geocode reverse error: ${r.status} ${r.statusText}`);
      return null;
    }
    const obj = (await r.json()) as NomPlace;
    return obj;
  } catch (error) {
    console.error("Geocode reverse failed:", error);
    return null;
  }
}
