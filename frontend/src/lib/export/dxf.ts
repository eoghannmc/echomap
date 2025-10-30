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

  // Map source layers to DXF layer names
  const getLayerName = (sourceLayer?: string) => {
    if (!sourceLayer) return "DEFAULT";
    if (sourceLayer === "planning-zones") return "PLANNING_ZONES";
    if (sourceLayer === "parcels") return "PARCELS";
    if (sourceLayer === "mesh-blocks") return "MESH_BLOCKS";
    if (sourceLayer === "sa2") return "SA2_BOUNDARIES";
    if (sourceLayer === "user-points") return "USER_POINTS";
    if (sourceLayer === "user-buffers") return "USER_BUFFERS";
    return sourceLayer.toUpperCase().replace(/-/g, "_");
  };

  // Start DXF with HEADER section including projection info
  let dxf = `0\nSECTION\n2\nHEADER\n`;
  
  // Add coordinate system information
  dxf += `9\n$GEODATA\n1\nGDA2020_MGA_Zone_55\n`;
  dxf += `9\n$INSUNITS\n70\n6\n`; // 6 = meters
  
  // Add custom variables for projection metadata
  dxf += `9\n$CUSTOMPROPERTYTAG\n1\nPROJECTION\n`;
  dxf += `9\n$CUSTOMPROPERTY\n1\nEPSG:7855\n`;
  dxf += `9\n$CUSTOMPROPERTYTAG\n1\nPROJ4\n`;
  dxf += `9\n$CUSTOMPROPERTY\n1\n+proj=utm +zone=55 +south +ellps=GRS80 +units=m +no_defs\n`;
  dxf += `9\n$CUSTOMPROPERTYTAG\n1\nDATUM\n`;
  dxf += `9\n$CUSTOMPROPERTY\n1\nGDA2020\n`;
  dxf += `9\n$CUSTOMPROPERTYTAG\n1\nUNITS\n`;
  dxf += `9\n$CUSTOMPROPERTY\n1\nmeters\n`;
  
  dxf += `0\nENDSEC\n`;
  
  // TABLES section with layer definitions
  dxf += `0\nSECTION\n2\nTABLES\n`;
  dxf += `0\nTABLE\n2\nLAYER\n70\n6\n`; // 6 layers
  
  // Define each layer
  const layers = ["PLANNING_ZONES", "PARCELS", "MESH_BLOCKS", "SA2_BOUNDARIES", "USER_POINTS", "USER_BUFFERS"];
  layers.forEach((layerName, idx) => {
    const color = [1, 2, 3, 4, 5, 6][idx]; // Different colors for each layer
    dxf += `0\nLAYER\n2\n${layerName}\n70\n0\n62\n${color}\n6\nCONTINUOUS\n`;
  });
  
  dxf += `0\nENDTAB\n0\nENDSEC\n`;
  
  // ENTITIES section
  dxf += `0\nSECTION\n2\nENTITIES\n`;
  for (const f of fc.features) {
    if (!f.geometry) continue;
    const layerName = getLayerName((f.properties as any)?._sourceLayer);
    
    if (f.geometry.type === "Point") {
      const [x,y] = project(f.geometry.coordinates as [number,number]);
      dxf += `0\nCIRCLE\n8\n${layerName}\n10\n${x}\n20\n${y}\n30\n0\n40\n${pointRadiusMeters}\n`;
    } else if (f.geometry.type === "LineString") {
      const coords = f.geometry.coordinates as [number,number][];
      dxf += `0\nLWPOLYLINE\n8\n${layerName}\n90\n${coords.length}\n70\n0\n`;
      coords.forEach(([lon,lat],i)=> {
        const [x,y]=project([lon,lat]);
        dxf += `10\n${x}\n20\n${y}\n`;
      });
    } else if (f.geometry.type === "Polygon") {
      const rings = f.geometry.coordinates as [number,number][][];
      for (const ring of rings) {
        dxf += `0\nLWPOLYLINE\n8\n${layerName}\n90\n${ring.length}\n70\n1\n`;
        ring.forEach(([lon,lat])=> {
          const [x,y]=project([lon,lat]);
          dxf += `10\n${x}\n20\n${y}\n`;
        });
      }
    } else if (f.geometry.type === "MultiPolygon") {
      const polygons = f.geometry.coordinates as [number,number][][][];
      for (const polygon of polygons) {
        for (const ring of polygon) {
          dxf += `0\nLWPOLYLINE\n8\n${layerName}\n90\n${ring.length}\n70\n1\n`;
          ring.forEach(([lon,lat])=> {
            const [x,y]=project([lon,lat]);
            dxf += `10\n${x}\n20\n${y}\n`;
          });
        }
      }
    }
  }
  dxf += `0\nENDSEC\n0\nEOF\n`;
  return new Blob([dxf], { type: "application/dxf" });
}
