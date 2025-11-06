import { useEffect, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { nominatimSearchVic, nominatimReverse } from "@/lib/geocode";
import { createTable, listTables, addRow, getTable } from "@/lib/geoTables";
import { makeBuffer, fcFromRows } from "@/lib/geoOps";

type PrefillLocation = {
  lon?: number;
  lat?: number;
  name?: string;
  h3?: string;
};

export default function AddLocationModal({
  map,
  onClose,
  onData,
  prefill,
}: {
  map: MLMap | null;
  onClose: () => void;
  onData: (
    points: GeoJSON.FeatureCollection,
    buffers: GeoJSON.FeatureCollection
  ) => void;
  prefill?: PrefillLocation;
}) {

  const [tables, setTables] = useState<{ id: string; name: string }[]>([]);
  const [tableId, setTableId] = useState<string>("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [lon, setLon] = useState<number | undefined>(prefill?.lon);
  const [lat, setLat] = useState<number | undefined>(prefill?.lat);
  const [ID, setID] = useState(prefill?.h3 ?? "tag");
  const [name, setName] = useState(prefill?.name ?? "");
  const [color, setColor] = useState("#1a7f37");
  const [bufOn, setBufOn] = useState(false);
  const [bufR, setBufR] = useState(500);

  useEffect(()=>{ listTables().then(ts => { setTables(ts); if (ts[0]) setTableId(ts[0].id); }); },[]);

  useEffect(() => {
    if (!prefill) return;
    setLon(prefill.lon);
    setLat(prefill.lat);
    setName(prefill.name ?? "");
    setID(prefill.h3 ?? "tag");
  }, [prefill]);

  async function ensureTable() {
    if (tableId) return tableId;
    const t = await createTable("My Locations");
    setTables(ts => [t, ...ts]); setTableId(t.id); return t.id;
  }

  async function doSearch() {
    setResults(await nominatimSearchVic(q));
  }
  async function pickOnMap() {
    if (!map) return;
    const once = (e:any)=> {
      const [lng,lat_] = e.lngLat.toArray(); setLon(lng); setLat(lat_);
      nominatimReverse(lng,lat_).then(p => setName(p?.display_name ?? ""));
      map.getCanvas().style.cursor = "grab"; map.off("click",once);
    };
    map.getCanvas().style.cursor = "crosshair";
    map.once("click", once);
  }

  async function save() {
    if (lon==null||lat==null) return;
    const id = await ensureTable();
    const feat: GeoJSON.Feature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        ID: ID || "tag",
        name,
        color,
        bufferOn: bufOn,
        bufferRadius: bufOn ? bufR : undefined,
        h3: prefill?.h3,
      },
    };
    await addRow(id, feat as any);
    // refresh to map
    const b = await getTable(id);
    const points = fcFromRows(b.rows);
    const buffers = {
      type: "FeatureCollection",
      features: b.rows
        .filter((r) => r.properties.bufferOn)
        .map((r) => {
          const coords = ((r.geometry as any)?.coordinates ?? [0, 0]) as [number, number];
          const buf = makeBuffer(
            coords[0],
            coords[1],
            r.properties.bufferRadius || 0
          );
          return {
            ...buf,
            properties: { color: r.properties.color },
          };
        }),
    } as GeoJSON.FeatureCollection;
    onData(points, buffers);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/30 grid place-items-center">
      <div className="w-[520px] max-w-[92vw] bg-white rounded-xl border shadow-xl">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-semibold">Add Location</div>
          <button onClick={onClose} className="px-2 py-1 border rounded">Close</button>
        </div>
        <div className="p-3 grid gap-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input className="border rounded px-2 py-1" placeholder="Search Victoria…" value={q} onChange={e=>setQ(e.target.value)} />
            <button onClick={doSearch} className="border rounded px-3">Search</button>
          </div>
          {!!results.length && (
            <div className="border rounded p-2 max-h-40 overflow-auto">
              {results.map((r,i)=>(
                <button key={i} className="block w-full text-left px-2 py-1 hover:bg-gray-50"
                  onClick={()=>{ setLon(parseFloat(r.lon)); setLat(parseFloat(r.lat)); setName(r.display_name); }}>
                  {r.display_name}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button className="border rounded px-3 py-1" onClick={pickOnMap}>Place on map</button>
            <div className="text-xs text-slate-500 self-center">
              {lon != null && lat != null
                ? `Picked: ${lon.toFixed(5)}, ${lat.toFixed(5)}${prefill?.h3 ? ` (H3 r8: ${prefill.h3})` : ""}`
                : "Click to pick a location"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">ID (required)<input className="border rounded w-full px-2 py-1" value={ID} onChange={e=>setID(e.target.value||"tag")} /></label>
            <label className="text-sm">Name<input className="border rounded w-full px-2 py-1" value={name} onChange={e=>setName(e.target.value)} /></label>
            <label className="text-sm">Color<input type="color" className="border rounded w-full px-2 py-1" value={color} onChange={e=>setColor(e.target.value)} /></label>
            <label className="text-sm">Buffer (m)
              <div className="flex gap-2 items-center">
                <input type="checkbox" checked={bufOn} onChange={e=>setBufOn(e.target.checked)} />
                {bufOn && <input type="number" className="border rounded px-2 py-1 w-full" value={bufR} onChange={e=>setBufR(parseInt(e.target.value||"0",10))} />}
              </div>
            </label>
          </div>

          <div>
            <label className="text-sm">Table</label>
            <div className="flex gap-2">
              <select className="border rounded px-2 py-1 flex-1" value={tableId} onChange={e=>setTableId(e.target.value)}>
                <option value="">(new) My Locations</option>
                {tables.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button className="border rounded px-3" onClick={async()=>{
                const t = await createTable("My Locations");
                setTables(ts=>[t,...ts]); setTableId(t.id);
              }}>New</button>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button className="px-3 py-1 border rounded" onClick={onClose}>Cancel</button>
            <button className="px-3 py-1 rounded bg-[#1a7f37] text-white" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
