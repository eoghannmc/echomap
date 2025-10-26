import { useEffect, useMemo, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import * as turf from "@turf/turf";
import type { BBox } from "@/types/geo";

import { exportCSV } from "@/lib/export/csv";
import { exportGeoJSON } from "@/lib/export/geojson";
import { exportDXF } from "@/lib/export/dxf";
import { exportPDF } from "@/lib/export/pdf";

const SCALES = [200,500,1000,2000,5000,10000] as const;

export default function ExportModal({ map, onClose }:{ map: MLMap|null, onClose:()=>void }) {
  const [paper,setPaper] = useState<"A4L"|"A3L">("A4L");
  const [mode,setMode]   = useState<"scale"|"snapshot">("snapshot");
  const [scale,setScale] = useState<number>(1000);
  const [crop,setCrop] = useState(true);

  // discover visible vector sources we control:
  const exportables = useMemo(()=>{
    if(!map) return [];
    const style = map.getStyle();
    const visible = (style.layers||[])
      .filter(l => (map.getLayoutProperty(l.id,"visibility") ?? "visible") !== "none")
      .map(l => l.id);
    // we export our user layers + any others you later register
    const ids = ["user-points","user-buffers"]; // extend later
    return ids.filter(id => visible.includes(id.replace(/-.+$/,"")));
  },[map, (map as any)?.__v]); // crude dep; okay for MVP

  function currentBBox(): BBox {
    if (!map) return [144, -38, 146, -37] as any;
    const b = map.getBounds(); return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  }

  async function collectFC() {
    if (!map) return { fc: { type:"FeatureCollection", features: [] } as GeoJSON.FeatureCollection, snapshot: null as HTMLCanvasElement|null };
    const sources = ["user-points","user-buffers"];
    let feats: GeoJSON.Feature[] = [];
    for (const sid of sources) {
      const src: any = map.getSource(sid);
      if (!src || !exportables.some(v => sid.startsWith(v))) continue;
      const data = (src._data || src._options?.data) as GeoJSON.FeatureCollection;
      if (!data) continue;
      feats = feats.concat(data.features);
    }
    let fc: GeoJSON.FeatureCollection = { type:"FeatureCollection", features: feats };
    if (crop) fc = turf.bboxClip(fc as any, currentBBox() as any) as any;
    return { fc, snapshot: map.getCanvas() };
  }

  function download(blob: Blob, name: string) {
    const a = document.createElement("a"); const url = URL.createObjectURL(blob);
    a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/30 grid place-items-center">
      <div className="w-[640px] max-w-[94vw] bg-white rounded-xl border shadow-xl">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-semibold">Export</div>
          <button onClick={onClose} className="px-2 py-1 border rounded">Close</button>
        </div>
        <div className="p-3 grid gap-3">
          <div className="flex gap-3">
            <button className={`px-3 py-1 rounded border ${mode==="snapshot"?"bg-gray-100":""}`} onClick={()=>setMode("snapshot")}>PDF</button>
            <button className={`px-3 py-1 rounded border`} onClick={()=>setMode("scale")}>DXF</button>
            {/* CSV/GeoJSON quick actions on the right */}
            <div className="ml-auto flex gap-2">
              <button className="px-3 py-1 rounded border" onClick={async()=>{
                const { fc } = await collectFC(); download(exportCSV(fc), "export.csv");
              }}>CSV</button>
              <button className="px-3 py-1 rounded border" onClick={async()=>{
                const { fc } = await collectFC(); download(exportGeoJSON(fc), "export.geojson");
              }}>GeoJSON</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Paper
              <select className="border rounded w-full px-2 py-1" value={paper} onChange={e=>setPaper(e.target.value as any)}>
                <option value="A4L">A4 Landscape</option>
                <option value="A3L">A3 Landscape</option>
              </select>
            </label>
            <label className="text-sm">Scale (for DXF or scale-true PDF later)
              <select className="border rounded w-full px-2 py-1" value={scale} onChange={e=>setScale(parseInt(e.target.value,10))}>
                {SCALES.map(s=> <option key={s} value={s}>1:{s}</option>)}
              </select>
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={crop} onChange={e=>setCrop(e.target.checked)} /> Crop to current view
          </label>

          <div className="flex justify-end gap-2">
            <button className="px-3 py-1 border rounded" onClick={onClose}>Cancel</button>
            <button className="px-3 py-1 rounded bg-[#1a7f37] text-white" onClick={async()=>{
              const { fc, snapshot } = await collectFC();
              if (mode === "snapshot") {
                // PDF snapshot mode (fast path)
                const blob = exportPDF({ fc, snapshot, mode:"snapshot", paper, title:"Export" });
                download(blob, "export.pdf");
              } else {
                const blob = exportDXF(fc, { scale, pointPaperRadiusMm: 2 });
                download(blob, "export.dxf");
              }
            }}>Export</button>
          </div>
        </div>
      </div>
    </div>
  );
}
