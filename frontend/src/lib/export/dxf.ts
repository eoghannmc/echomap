import proj4 from "proj4";
import * as turf from "@turf/turf";

// GDA2020 / MGA Zone 55
proj4.defs("EPSG:7855","+proj=utm +zone=55 +south +ellps=GRS80 +units=m +no_defs");

function project([lon,lat]: [number,number]) {
  return proj4("EPSG:4326","EPSG:7855",[lon,lat]) as [number,number];
}

export function exportDXF(fc: GeoJSON.FeatureCollection, opts?: {
  pointPaperRadiusMm?: number; // default 2mm circle
  scale?: number;              // 200 | 500 | ... | 10000
}) {
  const scale = opts?.scale ?? 1000;
  const mm = opts?.pointPaperRadiusMm ?? 2;
  const pointRadiusMeters = (mm/1000) * scale;

  let dxf = `0\nSECTION\n2\nENTITIES\n`;
  for (const f of fc.features) {
    if (!f.geometry) continue;
    if (f.geometry.type === "Point") {
      const [x,y] = project(f.geometry.coordinates as [number,number]);
      dxf += `0\nCIRCLE\n8\nUSER_POINTS\n10\n${x}\n20\n${y}\n30\n0\n40\n${pointRadiusMeters}\n`;
    } else if (f.geometry.type === "LineString") {
      const coords = f.geometry.coordinates as [number,number][];
      dxf += `0\nLWPOLYLINE\n8\nUSER_LINES\n90\n${coords.length}\n70\n0\n`;
      coords.forEach(([lon,lat],i)=> {
        const [x,y]=project([lon,lat]);
        dxf += `10\n${x}\n20\n${y}\n`;
      });
    } else if (f.geometry.type === "Polygon") {
      const rings = f.geometry.coordinates as [number,number][][];
      for (const ring of rings) {
        dxf += `0\nLWPOLYLINE\n8\nUSER_POLYGONS\n90\n${ring.length}\n70\n1\n`;
        ring.forEach(([lon,lat])=> {
          const [x,y]=project([lon,lat]);
          dxf += `10\n${x}\n20\n${y}\n`;
        });
      }
    }
  }
  dxf += `0\nENDSEC\n0\nEOF\n`;
  return new Blob([dxf], { type: "application/dxf" });
}
