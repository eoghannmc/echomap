import { useEffect, useMemo, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import * as turf from "@turf/turf";
import type { BBox } from "@/types/geo";

import { exportCSV } from "@/lib/export/csv";
import { exportGeoJSON } from "@/lib/export/geojson";
import { exportDXF } from "@/lib/export/dxf";
import { exportPDF } from "@/lib/export/pdf";

const SCALES = [200,500,1000,2000,5000,10000] as const;

type LayerConfig = {
  id: string;
  label: string;
  description: string;
};

const AVAILABLE_LAYERS: LayerConfig[] = [
  { id: "planning-zones", label: "Planning Zones", description: "Victorian planning zone boundaries" },
  { id: "parcels", label: "Property Parcels", description: "Property boundary parcels" },
  { id: "mesh-blocks", label: "Mesh Blocks", description: "Census mesh block boundaries" },
  { id: "sa2", label: "SA2 Boundaries", description: "Statistical Area Level 2" },
  { id: "user-points", label: "User Points", description: "Custom point locations" },
  { id: "user-buffers", label: "User Buffers", description: "Custom buffer areas" },
];

export default function ExportModal({ map, onClose }:{ map: MLMap|null, onClose:()=>void }) {
  const [exportFormat, setExportFormat] = useState<"pdf"|"dxf"|"csv"|"geojson">("dxf");
  const [paper,setPaper] = useState<"A4L"|"A3L">("A4L");
  const [scale,setScale] = useState<number>(1000);
  const [crop,setCrop] = useState(true);
  const [selectedLayers, setSelectedLayers] = useState<string[]>([]);
  const [includeAttributes, setIncludeAttributes] = useState(true);

  // Discover available sources on the map
  const availableSources = useMemo(()=>{
    if(!map) return [];
    const sources = AVAILABLE_LAYERS.map(l => l.id).filter(id => {
      const src = map.getSource(id);
      return !!src;
    });
    return sources;
  },[map]);

  // Auto-select visible layers on mount
  useEffect(() => {
    if (!map || selectedLayers.length > 0) return;
    const style = map.getStyle();
    const visible = (style.layers||[])
      .filter(l => (map.getLayoutProperty(l.id,"visibility") ?? "visible") !== "none")
      .map(l => l.id);
    
    const visibleSources = AVAILABLE_LAYERS
      .map(l => l.id)
      .filter(id => visible.includes(id) || visible.some(v => v.startsWith(id)));
    
    setSelectedLayers(visibleSources);
  }, [map]);

  const toggleLayer = (layerId: string) => {
    setSelectedLayers(prev => 
      prev.includes(layerId) 
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
  };

  const selectAll = () => setSelectedLayers(availableSources);
  const selectNone = () => setSelectedLayers([]);

  function currentBBox(): BBox {
    if (!map) return [144, -38, 146, -37] as any;
    const b = map.getBounds(); return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
  }

  async function collectFC() {
    if (!map) return { fc: { type:"FeatureCollection", features: [] } as GeoJSON.FeatureCollection, snapshot: null as HTMLCanvasElement|null };
    
    let feats: GeoJSON.Feature[] = [];
    for (const sid of selectedLayers) {
      const src: any = map.getSource(sid);
      if (!src) continue;
      
      const data = (src._data || src._options?.data) as GeoJSON.FeatureCollection;
      if (!data || !data.features) continue;
      
      // Add layer identification and optionally strip attributes
      const layerFeatures = data.features.map(f => {
        const props = includeAttributes ? {
          ...f.properties,
          _sourceLayer: sid
        } : {
          _sourceLayer: sid
        };
        
        return {
          ...f,
          properties: props
        };
      });
      
      feats = feats.concat(layerFeatures);
    }
    
    // Clip features individually if crop is enabled
    if (crop) {
      const bbox = currentBBox();
      feats = feats.filter(f => {
        if (!f.geometry) return false;
        try {
          const clipped = turf.bboxClip(f as any, bbox as any);
          return clipped && clipped.geometry && clipped.geometry.coordinates;
        } catch (e) {
          console.warn("Failed to clip feature:", e);
          return false;
        }
      }).map(f => {
        try {
          return turf.bboxClip(f as any, bbox as any) as GeoJSON.Feature;
        } catch (e) {
          return f;
        }
      });
    }
    
    let fc: GeoJSON.FeatureCollection = { type:"FeatureCollection", features: feats };
    return { fc, snapshot: map.getCanvas() };
  }

  function download(blob: Blob, name: string) {
    const a = document.createElement("a"); const url = URL.createObjectURL(blob);
    a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  }

  async function handleExport() {
    if (selectedLayers.length === 0) {
      alert("Please select at least one layer to export.");
      return;
    }

    const { fc, snapshot } = await collectFC();
    
    if (fc.features.length === 0) {
      alert("No features to export. Try adjusting your layer selection or map view.");
      return;
    }

    switch (exportFormat) {
      case "pdf":
        const pdfBlob = exportPDF({ fc, snapshot, mode:"snapshot", paper, title:"ECHO Export" });
        download(pdfBlob, "echo-export.pdf");
        break;
      case "dxf":
        const dxfBlob = exportDXF(fc, { scale, pointPaperRadiusMm: 2 });
        download(dxfBlob, "echo-export.dxf");
        break;
      case "csv":
        download(exportCSV(fc), "echo-export.csv");
        break;
      case "geojson":
        download(exportGeoJSON(fc), "echo-export.geojson");
        break;
    }
  }

  const featureCount = useMemo(() => {
    if (!map) return 0;
    let count = 0;
    for (const sid of selectedLayers) {
      const src: any = map.getSource(sid);
      if (!src) continue;
      const data = (src._data || src._options?.data) as GeoJSON.FeatureCollection;
      if (data?.features) count += data.features.length;
    }
    return count;
  }, [map, selectedLayers]);

  return (
    <div className="fixed inset-0 z-[1000] bg-black/30 grid place-items-center" onClick={onClose}>
      <div className="w-[720px] max-w-[94vw] bg-white rounded-lg border shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <strong className="text-lg">Export Data</strong>
            {featureCount > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {featureCount} features
              </span>
            )}
          </div>
          <button onClick={onClose} className="px-3 py-1 border rounded hover:bg-gray-100">✕</button>
        </div>

        <div className="p-4 grid gap-4 max-h-[80vh] overflow-y-auto">
          {/* Export Format Selection */}
          <div>
            <div className="text-sm font-semibold mb-2">Export Format</div>
            <div className="grid grid-cols-4 gap-2">
              <button 
                className={`px-3 py-2 rounded border text-sm ${exportFormat==="dxf"?"bg-blue-500 text-white border-blue-600":"hover:bg-gray-50"}`} 
                onClick={()=>setExportFormat("dxf")}
              >
                DXF
              </button>
              <button 
                className={`px-3 py-2 rounded border text-sm ${exportFormat==="pdf"?"bg-blue-500 text-white border-blue-600":"hover:bg-gray-50"}`} 
                onClick={()=>setExportFormat("pdf")}
              >
                PDF
              </button>
              <button 
                className={`px-3 py-2 rounded border text-sm ${exportFormat==="geojson"?"bg-blue-500 text-white border-blue-600":"hover:bg-gray-50"}`} 
                onClick={()=>setExportFormat("geojson")}
              >
                GeoJSON
              </button>
              <button 
                className={`px-3 py-2 rounded border text-sm ${exportFormat==="csv"?"bg-blue-500 text-white border-blue-600":"hover:bg-gray-50"}`} 
                onClick={()=>setExportFormat("csv")}
              >
                CSV
              </button>
            </div>
          </div>

          {/* Layer Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Select Layers</div>
              <div className="flex gap-2">
                <button className="text-xs text-blue-600 hover:underline" onClick={selectAll}>All</button>
                <button className="text-xs text-blue-600 hover:underline" onClick={selectNone}>None</button>
              </div>
            </div>
            <div className="border rounded-lg p-3 bg-gray-50 space-y-2 max-h-64 overflow-y-auto">
              {AVAILABLE_LAYERS.map(layer => {
                const isAvailable = availableSources.includes(layer.id);
                const isSelected = selectedLayers.includes(layer.id);
                
                return (
                  <label 
                    key={layer.id}
                    className={`flex items-start gap-3 p-2 rounded border bg-white ${
                      !isAvailable ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-blue-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={!isAvailable}
                      onChange={() => toggleLayer(layer.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{layer.label}</div>
                      <div className="text-xs text-gray-500">{layer.description}</div>
                      {!isAvailable && <div className="text-xs text-red-500 mt-1">Not loaded on map</div>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Export Options */}
          <div>
            <div className="text-sm font-semibold mb-2">Export Options</div>
            <div className="grid gap-3">
              {/* Crop to view */}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={crop} onChange={e=>setCrop(e.target.checked)} />
                <div>
                  <div className="font-medium">Crop to current view</div>
                  <div className="text-xs text-gray-500">Only export features visible in the map viewport</div>
                </div>
              </label>

              {/* Include attributes */}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={includeAttributes} onChange={e=>setIncludeAttributes(e.target.checked)} />
                <div>
                  <div className="font-medium">Include attributes</div>
                  <div className="text-xs text-gray-500">Export feature properties (zone codes, names, etc.)</div>
                </div>
              </label>

              {/* Scale (for DXF) */}
              {exportFormat === "dxf" && (
                <label className="text-sm">
                  <div className="font-medium mb-1">Scale</div>
                  <select className="border rounded w-full px-3 py-2" value={scale} onChange={e=>setScale(parseInt(e.target.value,10))}>
                    {SCALES.map(s=> <option key={s} value={s}>1:{s}</option>)}
                  </select>
                  <div className="text-xs text-gray-500 mt-1">Drawing scale for CAD export</div>
                </label>
              )}

              {/* Paper size (for PDF) */}
              {exportFormat === "pdf" && (
                <label className="text-sm">
                  <div className="font-medium mb-1">Paper Size</div>
                  <select className="border rounded w-full px-3 py-2" value={paper} onChange={e=>setPaper(e.target.value as any)}>
                    <option value="A4L">A4 Landscape</option>
                    <option value="A3L">A3 Landscape</option>
                  </select>
                </label>
              )}
            </div>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <div className="font-medium text-blue-900 mb-1">Export Info</div>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• <strong>DXF:</strong> CAD format with layers, projected to GDA2020 MGA Zone 55</li>
              <li>• <strong>PDF:</strong> Map snapshot with vector overlays</li>
              <li>• <strong>GeoJSON:</strong> Standard geographic data format (WGS84)</li>
              <li>• <strong>CSV:</strong> Tabular data with coordinates and attributes</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-4 py-3 border-t bg-gray-50">
          <div className="text-xs text-gray-600">
            {selectedLayers.length} layer{selectedLayers.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
            <button 
              onClick={handleExport}
              disabled={selectedLayers.length === 0}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Export {exportFormat.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
