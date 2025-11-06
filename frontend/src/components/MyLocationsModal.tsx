import { useEffect, useMemo, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import * as turf from "@turf/turf";
import { listTables, getTable, renameTable, deleteRow } from "@/lib/geoTables";
import { fcFromRows, makeBuffer } from "@/lib/geoOps";
import { exportCSV } from "@/lib/export/csv";
import { exportGeoJSON } from "@/lib/export/geojson";

export default function MyLocationsModal({ map, onClose, onShow }:{
  map: MLMap|null, onClose:()=>void,
  onShow:(points: GeoJSON.FeatureCollection, buffers: GeoJSON.FeatureCollection)=>void
}) {
  const [tables,setTables] = useState<{id:string;name:string}[]>([]);
  const [active,setActive] = useState<string>("");

  useEffect(()=>{ listTables().then(ts=>{ setTables(ts); if(ts[0]) setActive(ts[0].id); }); },[]);
  const [rows,setRows] = useState<any[]>([]);

  useEffect(()=>{ (async()=>{
    if(!active) return;
    const b = await getTable(active); setRows(b.rows);
  })(); },[active]);

  async function showOnMap() {
    if (!active) return;
    const b = await getTable(active);
    const points = fcFromRows(b.rows);
    const buffers = {
      type:"FeatureCollection",
      features: b.rows
        .filter(r=>r.properties.bufferOn && r.geometry.type === "Point")
        .map(r => ({
          ...(makeBuffer(
            (r.geometry as GeoJSON.Point).coordinates[0],
            (r.geometry as GeoJSON.Point).coordinates[1],
            r.properties.bufferRadius||0
          )),
          properties: { color: r.properties.color }
        }))
    } as GeoJSON.FeatureCollection;
    onShow(points, buffers);
  }

  const decoratedRows = useMemo(()=> rows.map(r=>{
    const geom = r.geometry;
    const summary: { type: string; detail: string } = { type: geom.type, detail: "" };
    try {
      if (geom.type === "Point") {
        const [lon, lat] = (geom as GeoJSON.Point).coordinates;
        summary.detail = `${lon.toFixed(5)}, ${lat.toFixed(5)}`;
      } else if (geom.type === "LineString") {
        const lenKm = turf.length(r as any, { units: "kilometers" });
        summary.detail = `${lenKm >= 1 ? lenKm.toFixed(2)+" km" : (lenKm*1000).toFixed(0)+" m"}`;
      } else if (geom.type === "Polygon") {
        const area = turf.area(r as any);
        summary.detail = area >= 1e6 ? `${(area/1e6).toFixed(2)} km²` : `${area.toFixed(0)} m²`;
      } else {
        const center = turf.center(r as any);
        const [lon,lat] = (center.geometry as GeoJSON.Point).coordinates;
        summary.detail = `${lon.toFixed(5)}, ${lat.toFixed(5)}`;
      }
    } catch {}
    const storedMeasure = (r.properties as any)?.measurement;
    if (storedMeasure) summary.detail = storedMeasure;
    return { feature: r, summary };
  }), [rows]);

  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/30 grid place-items-center">
      <div className="w-[720px] max-w-[94vw] bg-white rounded-xl border shadow-xl">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-semibold">My Tables</div>
          <button onClick={onClose} className="px-2 py-1 border rounded">Close</button>
        </div>
        <div className="p-3 grid gap-3">
          <div className="flex gap-2 items-center">
            <select className="border rounded px-2 py-1" value={active} onChange={e=>setActive(e.target.value)}>
              {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button className="border rounded px-2 py-1" onClick={async()=>{
              const nm = prompt("Rename table to?"); if(!nm) return;
              await renameTable(active, nm);
              const ts = await listTables(); setTables(ts);
            }}>Rename</button>
            <button className="border rounded px-2 py-1" onClick={showOnMap}>Show on map</button>
            <button className="border rounded px-2 py-1" onClick={async()=>{
              const b = await getTable(active);
              download(exportCSV(fcFromRows(b.rows)), "table.csv");
            }}>Export CSV</button>
            <button className="border rounded px-2 py-1" onClick={async()=>{
              const b = await getTable(active);
              download(exportGeoJSON(fcFromRows(b.rows)), "table.geojson");
            }}>Export GeoJSON</button>
          </div>

          <div className="border rounded max-h-[50vh] overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Geometry</th>
                <th className="text-left p-2">Summary</th>
                <th className="p-2">Actions</th>
              </tr></thead>
              <tbody>
                {decoratedRows.map(({ feature, summary })=>(
                  <tr key={feature.properties.ID} className="border-t">
                    <td className="p-2">{feature.properties.ID}</td>
                    <td className="p-2">{feature.properties.name||""}</td>
                    <td className="p-2 uppercase text-xs text-slate-600">{summary.type}</td>
                    <td className="p-2 text-xs text-slate-700">{summary.detail}</td>
                    <td className="p-2 text-right">
                      <button className="border rounded px-2 py-1 mr-2" onClick={async()=>{
                        const newID = prompt("New ID", feature.properties.ID); if(!newID) return;
                        // you can reuse updateRow() here (omitted for brevity)…
                      }}>Rename ID</button>
                      <button className="border rounded px-2 py-1" onClick={async()=>{
                        if(!confirm("Delete this row?")) return;
                        await deleteRow(active, feature.properties.ID);
                        const b = await getTable(active); setRows(b.rows);
                      }}>Delete</button>
                    </td>
                  </tr>
                ))}
                {!decoratedRows.length && <tr><td colSpan={5} className="p-4 text-center text-slate-500">No rows yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
