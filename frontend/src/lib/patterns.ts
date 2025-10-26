'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import SearchBar from "../components/SearchBar";
import type { SuggestItem } from "../lib/suggest";

/* ================= UX constants ================= */
const UX = { addressFlyToZoom: 16 };

/* ================= Types (local only) ================= */
type SectionStatus = 'input' | 'searching' | 'verified';
type DatasetKey = 'planning_zones' | 'pois' | 'sa2' | 'dwell_struct';

type DatasetSection = {
  id: string;
  status: SectionStatus;
  dataset?: DatasetKey;
  options?: Record<string, any>;
};

type LocationState =
  | { mode: 'idle';   status: SectionStatus }
  | { mode: 'address'; label?: string; lon?: number; lat?: number; status: SectionStatus }
  | { mode: 'area';    label?: string; status: SectionStatus };

/* ================= SA2 hatch demo assets ================= */
type PatternKey = 'diag' | 'cross' | 'dot' | 'diagGap' | 'h' | 'v';
const PATTERNS: PatternKey[] = ['diag', 'cross', 'dot', 'diagGap', 'h', 'v'];

function hashStringToIdx(s: string, modulo = PATTERNS.length) {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % modulo;
}

async function addImageFromURL(map: MLMap, name: string, url: string) {
  const res = await fetch(url, { cache: "force-cache" });
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  if (!map.hasImage(name)) map.addImage(name, bmp);
}
async function preloadNavyHatches(map: MLMap, base = '/patterns') {
  const imgs = ['diag-16-navy','cross-16-navy','dot-16-navy','diagGap-16-navy','h-16-navy','v-16-navy'];
  await Promise.all(imgs.map(n => addImageFromURL(map, n, `${base}/${n}.png`)));
}

async function addSA2Source(map: MLMap, url = '/data_web/geojson/sa2.geojson') {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`sa2.geojson fetch failed: ${resp.status}`);
  const gj = await resp.json();
  for (const f of gj.features) {
    const key = String(f.properties?.SA2_CODE ?? f.properties?.SA2_NAME ?? '');
    const idx = hashStringToIdx(key);
    f.properties = { ...f.properties, patternKey: ['diag-16-navy','cross-16-navy','dot-16-navy','diagGap-16-navy','h-16-navy','v-16-navy'][idx] };
  }
  map.addSource('sa2', { type: 'geojson', data: gj } as any);
}
function addSA2WelcomeLayers(map: MLMap) {
  if (!map.getSource('sa2')) return;
  map.addLayer({ id: 'sa2-underlay', type: 'fill', source: 'sa2', paint: { 'fill-color': '#FFFFFF', 'fill-opacity': 0.08 } });
  map.addLayer({
    id: 'sa2-hatch',
    type: 'fill',
    source: 'sa2',
    paint: {
      'fill-pattern': ['coalesce', ['get','patternKey'], 'diag-16-navy'],
      'fill-opacity': 1
    }
  });
  map.addLayer({ id: 'sa2-outline', type: 'line', source: 'sa2', paint: { 'line-color': '#0A2540', 'line-width': 0.5 } });
}

/* ================= Component ================= */
export default function MapApp() {
  const mapRef = useRef<MLMap | null>(null);
  const mapReady = useRef(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const addrMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [dataShown, setDataShown] = useState(false);
  const [showLayers, setShowLayers] = useState(false);

  // P0 state for sections
  const [location, setLocation] = useState<LocationState>({ mode: 'idle', status: 'input' });
  const [sections, setSections] = useState<DatasetSection[]>([]);

  // === Map init (single) ===
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [144.9631, -37.8136],
      zoom: 10,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', async () => {
      mapReady.current = true;
      try {
        await preloadNavyHatches(map);   // ensure images exist at /public/patterns/*.png
        await addSA2Source(map);         // ensure file exists at /public/data_web/geojson/sa2.geojson
        addSA2WelcomeLayers(map);
      } catch (e) {
        console.warn('Welcome layers not loaded:', e);
      }
    });

    mapRef.current = map;
    return () => { try { map.remove(); } catch {} mapRef.current = null; mapReady.current = false; };
  }, []);

  // === Pick handler (Address + basic non-address stubs) ===
  const handlePick = useCallback((it: SuggestItem) => {
    if (it.tag === 'Address') {
      setLocation({ mode: 'address', label: it.label, lon: it.lon ?? undefined, lat: it.lat ?? undefined, status: 'input' });
      if (mapRef.current && it.lon != null && it.lat != null) {
        mapRef.current.flyTo({ center: [it.lon, it.lat], zoom: UX.addressFlyToZoom, speed: 1.2 });
        if (addrMarkerRef.current) addrMarkerRef.current.remove();
        addrMarkerRef.current = new maplibregl.Marker({ color: '#e86017' })
          .setLngLat([it.lon, it.lat])
          .addTo(mapRef.current);
      }
    } else {
      // simple presets to open Data section
      const id = Math.random().toString(36).slice(2, 9);
      const ds: DatasetSection = { id, status: 'input' };
      if ((it as any).key === 'planning_zones') ds.dataset = 'planning_zones';
      else if ((it as any).key === 'sa2')       ds.dataset = 'sa2';
      else if ((it as any).key?.startsWith('pois')) ds.dataset = 'pois';
      else if ((it as any).key === 'dwell_struct')  ds.dataset = 'dwell_struct';
      setSections(prev => [ds, ...prev]);
      if (it.tag === 'Areas') setLocation({ mode: 'area', label: it.label, status: 'input' });
    }
  }, []);

  // === Section controls (P0 minimal flow) ===
  const locationDone = () => setLocation(prev => ({ ...prev, status: prev.status === 'input' ? 'verified' : 'input' } as LocationState));
  const markSectionDone = (id: string) =>
    setSections(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'input' ? 'verified' : 'input' } : s));

  const canShowData = (() => {
    const locOk = location.mode !== 'idle' && location.status === 'verified';
    const allOk = sections.length > 0 && sections.every(s => s.status === 'verified' && s.dataset);
    return locOk && allOk;
  })();

  const onShowData = () => { setDataShown(true); setShowLayers(true); };

  return (
    <div className="relative h-screen w-screen">
      {/* Map */}
      <div ref={mapContainerRef} className="absolute inset-0" />

      {/* Centered brand + search */}
      <div className="absolute left-1/2 top-5 z-50 w-[min(760px,92vw)] -translate-x-1/2">
        <div className="rounded-2xl border bg-white/95 shadow-lg px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-semibold text-slate-800">
              <span className="text-slate-900">echomap</span>
              <span className="text-slate-500">.xyz</span>
              <span className="ml-2 text-sm font-normal text-slate-500">your digital twin</span>
            </div>
            {dataShown && (
              <button className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50"
                      onClick={() => setShowLayers(v => !v)}>
                {showLayers ? 'Hide Layers' : 'Layers'}
              </button>
            )}
          </div>
          <SearchBar onSelectAddress={handlePick} onSelectAny={handlePick} />
        </div>

        {/* After a pick, show Location + Data cards and a Show Data CTA */}
        {(location.mode !== 'idle' || sections.length > 0) && (
          <div className="mt-3 grid gap-3">
            {/* Location */}
            <div className="p-3 border rounded-xl bg-white/95">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Location</div>
                <button className="text-xs px-2 py-1 rounded border" onClick={locationDone}>
                  {location.status === 'input' ? 'Done' : 'Edit'}
                </button>
              </div>
              <div className="mt-2 text-sm">
                {location.mode === 'address' && <>Address: <span className="font-medium">{location.label}</span></>}
                {location.mode === 'area'    && <>Area: <span className="font-medium">{location.label}</span></>}
              </div>
            </div>

            {/* Data sections */}
            {sections.length > 0 && (
              <div className="p-3 border rounded-xl bg-white/95">
                <div className="text-sm font-medium mb-2">Data</div>
                <div className="space-y-2">
                  {sections.map(s => (
                    <div key={s.id} className="border rounded-lg p-2 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">{s.dataset ?? 'Choose dataset'}</div>
                        <button className="text-xs px-2 py-1 rounded border" onClick={() => markSectionDone(s.id)}>
                          {s.status === 'input' ? 'Done' : 'Edit'}
                        </button>
                      </div>
                      {/* TODO: render dataset-specific filters here */}
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <button
                    className="w-full py-2 rounded-lg border text-sm hover:bg-gray-50"
                    onClick={() => setSections(prev => [{ id: Math.random().toString(36).slice(2,9), status: 'input' }, ...prev])}
                  >
                    + Add dataset
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                disabled={!canShowData}
                onClick={onShowData}
                className={`px-4 py-2 rounded-lg text-white ${canShowData ? 'bg-[#0E1A75] hover:opacity-95' : 'bg-gray-300'}`}
              >
                Show Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
