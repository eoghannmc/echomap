import jsPDF from "jspdf";
import * as turf from "@turf/turf";

const PAPER = {
  A4L: { mm: [297,210] },
  A3L: { mm: [420,297] },
} as const;

export function exportPDF(payload: {
  fc: GeoJSON.FeatureCollection; // vector overlays to draw (optional minimal)
  snapshot?: HTMLCanvasElement | null; // optional basemap image
  mode: "scale" | "snapshot";
  scale?: number; // when mode === "scale"
  paper: "A4L" | "A3L";
  title?: string;
}) {
  const { paper, mode } = payload;
  const [wmm,hmm] = PAPER[paper].mm;
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format: paper==="A4L"?"a4":"a3" });
  // optional basemap snapshot (fills page)
  if (payload.snapshot && mode==="snapshot") {
    const url = payload.snapshot.toDataURL("image/png");
    doc.addImage(url, "PNG", 0, 0, wmm, hmm);
  }

  // simple header
  doc.setFontSize(10);
  doc.text(payload.title ?? "Export", 6, 6);

  // vector overlays: draw points as small circles, lines & polygons as thin strokes
  doc.setDrawColor(20); doc.setLineWidth(0.2);

  if (payload.fc?.features?.length) {
    // derive page transform from bbox (scale mode) or from geo bbox (snapshot: just fit)
    const bbox = turf.bbox(payload.fc);
    const [minx,miny,maxx,maxy] = bbox; // lon/lat bbox (approx)
    // simple lon/lat -> page mm fit (not true scale; for true-scale, pass pre-clipped/projected fc instead)
    const pad = 8; // mm
    const pw = wmm - pad*2, ph = hmm - pad*2;

    function pt(lon:number, lat:number){ 
      const x = ((lon-minx)/(maxx-minx))*pw + pad;
      const y = ((maxy-lat)/(maxy-miny))*ph + pad;
      return [x,y] as [number,number];
    }
    for (const f of payload.fc.features) {
      if (!f.geometry) continue;
      if (f.geometry.type==="Point") {
        const [lon,lat] = f.geometry.coordinates as [number,number];
        const [x,y] = pt(lon,lat); doc.circle(x,y, 0.7, "S");
      } else if (f.geometry.type==="LineString") {
        const coords = f.geometry.coordinates as [number,number][];
        coords.forEach((c,i)=> { const [x,y]=pt(c[0],c[1]); i?doc.line((doc as any)._lastX,(doc as any)._lastY,x,y):doc.line(x,y,x,y); (doc as any)._lastX=x;(doc as any)._lastY=y; });
      } else if (f.geometry.type==="Polygon") {
        const rings = f.geometry.coordinates as [number,number][][];
        rings.forEach(r => {
          const first = pt(r[0][0], r[0][1]); doc.line(first[0], first[1], first[0], first[1]);
          r.slice(1).forEach(c => { const [x,y]=pt(c[0],c[1]); doc.line((doc as any)._lastX,(doc as any)._lastY,x,y); (doc as any)._lastX=x;(doc as any)._lastY=y; });
        });
      }
    }
  }

  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}
