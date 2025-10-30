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
    
    // Calculate aspect ratios to preserve geometry proportions
    const pad = 8; // mm
    const pw = wmm - pad*2;
    const ph = hmm - pad*2;
    
    const geoBboxWidth = maxx - minx;
    const geoBboxHeight = maxy - miny;
    const geoAspect = geoBboxWidth / geoBboxHeight;
    const pageAspect = pw / ph;
    
    // Determine scaling to fit while preserving aspect ratio
    let scaleX: number, scaleY: number, offsetX: number, offsetY: number;
    
    if (geoAspect > pageAspect) {
      // Geometry is wider than page - fit to width
      scaleX = pw / geoBboxWidth;
      scaleY = scaleX; // Use same scale to preserve aspect ratio
      const usedHeight = geoBboxHeight * scaleY;
      offsetX = pad;
      offsetY = pad + (ph - usedHeight) / 2; // Center vertically
    } else {
      // Geometry is taller than page - fit to height
      scaleY = ph / geoBboxHeight;
      scaleX = scaleY; // Use same scale to preserve aspect ratio
      const usedWidth = geoBboxWidth * scaleX;
      offsetX = pad + (pw - usedWidth) / 2; // Center horizontally
      offsetY = pad;
    }

    function pt(lon:number, lat:number){ 
      const x = (lon - minx) * scaleX + offsetX;
      const y = (maxy - lat) * scaleY + offsetY;
      return [x,y] as [number,number];
    }
    for (const f of payload.fc.features) {
      if (!f.geometry) continue;
      if (f.geometry.type==="Point") {
        const [lon,lat] = f.geometry.coordinates as [number,number];
        const [x,y] = pt(lon,lat); 
        doc.circle(x,y, 0.7, "S");
      } else if (f.geometry.type==="LineString") {
        const coords = f.geometry.coordinates as [number,number][];
        if (coords.length < 2) continue;
        for (let i = 1; i < coords.length; i++) {
          const [x1, y1] = pt(coords[i-1][0], coords[i-1][1]);
          const [x2, y2] = pt(coords[i][0], coords[i][1]);
          doc.line(x1, y1, x2, y2);
        }
      } else if (f.geometry.type==="Polygon") {
        const rings = f.geometry.coordinates as [number,number][][];
        rings.forEach(ring => {
          if (ring.length < 2) return;
          for (let i = 1; i < ring.length; i++) {
            const [x1, y1] = pt(ring[i-1][0], ring[i-1][1]);
            const [x2, y2] = pt(ring[i][0], ring[i][1]);
            doc.line(x1, y1, x2, y2);
          }
        });
      } else if (f.geometry.type==="MultiPolygon") {
        const polygons = f.geometry.coordinates as [number,number][][][];
        polygons.forEach(polygon => {
          polygon.forEach(ring => {
            if (ring.length < 2) return;
            for (let i = 1; i < ring.length; i++) {
              const [x1, y1] = pt(ring[i-1][0], ring[i-1][1]);
              const [x2, y2] = pt(ring[i][0], ring[i][1]);
              doc.line(x1, y1, x2, y2);
            }
          });
        });
      }
    }
  }

  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}
