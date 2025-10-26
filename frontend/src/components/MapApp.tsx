'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import SearchBar from "./SearchBar";
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

/* ================= SA2 hatch helpers ================= */
type PatternKey = 'diag' | 'cross' | 'dot' | 'diagGap' | 'h' | 'v';
const PATTERNS: PatternKey[] = ['diag', 'cross', 'dot', 'diagGap', 'h', 'v'];
const HATCH_FILES = ['diag-16-navy','cross-16-navy','dot-16-navy','diagGap-16-navy','h-16-navy','v-16-navy'];

// === MapTiler basemap styles (requires free API key) ===
// In .env.local set: NEXT_PUBLIC_MAPTILER_KEY=your_key_here
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

// Fallbacks if key is missing (still valid but will rate-limit)
const STYLE_BACKDROP = `https://api.maptiler.com/maps/backdrop/style.json?key=${MAPTILER_KEY || ''}`;
const STYLE_WINTER   = `https://api.maptiler.com/maps/winter/style.json?key=${MAPTILER_KEY || ''}`;
const STYLE_SATELLITE = `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY || ''}`;
// (your current default can remain demotiles; we’ll allow switching to these)






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
  await Promise.all(HATCH_FILES.map(n => addImageFromURL(map, n, `${base}/${n}.png`)));
}

async function addSA2Source(map: MLMap, url = '/data_web/geojson/sa2.geojson') {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`sa2.geojson fetch failed: ${resp.status}`);
  const gj = await resp.json();
  for (const f of gj.features) {
    const key = String(f.properties?.SA2_CODE ?? f.properties?.SA2_NAME ?? '');
    const idx = hashStringToIdx(key);
    f.properties = { ...f.properties, patternKey: HATCH_FILES[idx] };
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
    paint: { 'fill-pattern': ['coalesce', ['get','patternKey'], 'diag-16-navy'], 'fill-opacity': 1 }
  });
  map.addLayer({ id: 'sa2-outline', type: 'line', source: 'sa2', paint: { 'line-color': '#0A2540', 'line-width': 0.5 } });
}

/* ================= Component ================= */
export default function MapApp() {
  // Map refs/state
  const mapRef = useRef<MLMap | null>(null);
  const mapReady = useRef(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const addrMarkerRef = useRef<maplibregl.Marker | null>(null);

  // UI state
  const [dataShown, setDataShown] = useState(false);
  const [showLayers, setShowLayers] = useState(false);

  // Right panel state (closed on load)
  const [panelOpen, setPanelOpen] = useState(false);
  type PanelTab = 'search' | 'layers' | 'input' | 'export' | null;
  const [overlayTab, setOverlayTab] = useState<PanelTab>(null); // overlay panel over the list
    // helper to toggle the floating overlay without shifting the list
  
  function toggleOverlay(tab: Exclude<PanelTab, null>) {
    setOverlayTab(prev => (prev === tab ? null : tab));
  }

  // Central search block visibility
  const [showSearchUI, setShowSearchUI] = useState(true);

  // Sections state for P0 flow
  const [location, setLocation] = useState<LocationState>({ mode: 'idle', status: 'input' });
  const [sections, setSections] = useState<DatasetSection[]>([]);

  // Header star dropdown
  const [showStarMenu, setShowStarMenu] = useState(false);

  // Map init
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: STYLE_BACKDROP,
      center: [144.9631, -37.8136],
      zoom: 10,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    // We will NOT use maplibre bottom-right for positioning; we render our own .map-tools dock.

    map.on('load', () => { 
      mapReady.current = true; 
      console.info('[map] load ok');
    });
    map.on('error', (e) => {
      console.error('[map] error', (e as any)?.error || e);
    });

    mapRef.current = map;
    return () => { try { map.remove(); } catch {} mapRef.current = null; mapReady.current = false; };
  }, []);

  // Resize map on layout shifts (panel/search toggle)
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.resize();
  }, [panelOpen, showSearchUI]);

  // Update dynamic CSS vars (tools offset & search modal width guard)
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--dynamic-right-offset', panelOpen ? 'var(--panel-width)' : 'var(--panel-grabber)');
    root.style.setProperty('--collapsed-gap-right', 'calc(var(--panel-grabber) + 10px)');
  }, [panelOpen]);

  // Welcome layers only AFTER Show Data
  async function loadWelcomeLayers() {
    if (!mapRef.current) return;
    try {
      await preloadNavyHatches(mapRef.current);   // requires /public/patterns/*.png
      await addSA2Source(mapRef.current);         // requires /public/data_web/geojson/sa2.geojson
      addSA2WelcomeLayers(mapRef.current);
    } catch (e) {
      console.warn("Welcome layers not loaded:", e);
    }
  }

  // Show Data -> leave welcome, hide center search, open panel, load layers
  const onShowData = async () => {
    setDataShown(true);
    setShowLayers(true);
    setShowSearchUI(false);
    setPanelOpen(true);
    setOverlayTab('layers');
    await loadWelcomeLayers();
  };

  // Panel commands
  const openSearchFromPanel = () => {
    setShowSearchUI(true);
    setPanelOpen(false); // keep panel collapsed while searching
    setOverlayTab(null);
  };

  

  // Suggestion pick handler
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
      setPanelOpen(false); // searching: collapse
    } else {
      const id = Math.random().toString(36).slice(2, 9);
      const ds: DatasetSection = { id, status: 'input' };
      if ((it as any).key === 'planning_zones') ds.dataset = 'planning_zones';
      else if ((it as any).key === 'sa2')       ds.dataset = 'sa2';
      else if ((it as any).key?.startsWith('pois')) ds.dataset = 'pois';
      else if ((it as any).key === 'dwell_struct')  ds.dataset = 'dwell_struct';
      setSections(prev => [ds, ...prev]);
      if (it.tag === 'Areas') setLocation({ mode: 'area', label: it.label, status: 'input' });

      setPanelOpen(true);
      setOverlayTab('layers');
    }
  }, []);

  // Section controls
  const toggleLocationDone = () =>
    setLocation(prev => ({ ...prev, status: prev.status === 'input' ? 'verified' : 'input' } as LocationState));

  const toggleSectionDone = (id: string) =>
    setSections(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'input' ? 'verified' : 'input' } : s));

  const canShowData = (() => {
    const locOk = location.mode !== 'idle' && location.status === 'verified';
    const allOk = sections.length > 0 && sections.every(s => s.status === 'verified' && s.dataset);
    return locOk && allOk;
  })();

  return (
    <div className="relative h-screen w-screen" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
      {/* 5px gutter + inner black border + map container */}
      <div className="map-frame">
        <div className="map-inner">
          <div ref={mapContainerRef} id="map" className="w-full h-full" />
        </div>
      </div>

      {/* Header logo (top-left) */}
      <div style={{ position:'fixed', top:'var(--gap-10)', left:'var(--gap-10)', zIndex: 950 }}>
        <button className="px-2 py-1 border bg-white rounded" onClick={() => window.location.assign('/')} aria-label="Home">
          ECHO
        </button>
      </div>

      {/* Top-right star + dropdown (aligned to gutter) */}
      <div style={{ position:'fixed', top:'var(--gap-5)', right:'var(--gap-5)', zIndex:950 }}>
        <button className="header-star" onClick={() => setShowStarMenu(v => !v)} aria-label="Menu">
          {/* 10px asterisk */}
          <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M5 0v10M0 5h10M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="black" strokeWidth="1" /></svg>
        </button>
        {showStarMenu && (
          <div className="star-menu">
            <a className="block px-3 py-2">Account</a>
            <a className="block px-3 py-2">Settings</a>
          </div>
        )}
      </div>

      {/* Centered search "modal" (now 30px lower & with max-width that respects the collapsed drawer gap) */}
      {showSearchUI && (
        <div className="search-modal-wrap z-50">
          <div className="rounded-2xl border bg-white/95 shadow-lg px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold text-slate-800">
                <span className="text-slate-900">echomap</span>
                <span className="text-slate-500">.xyz</span>
                <span className="ml-2 text-sm font-normal text-slate-500">your digital twin</span>
              </div>
              {dataShown && (
                <button className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50" onClick={() => setShowLayers(v => !v)}>
                  {showLayers ? 'Hide Layers' : 'Layers'}
                </button>
              )}
            </div>

            {/* Collapses the panel when focusing the search input(s) */}
            <div onFocusCapture={() => setPanelOpen(false)}>
              <SearchBar onSelectAddress={handlePick} onSelectAny={handlePick} />
            </div>
          </div>

          {/* Location + Data sections + CTA */}
          {(location.mode !== 'idle' || sections.length > 0) && (
            <div className="mt-3 grid gap-3">
              {/* Location */}
              <div className="p-3 border rounded-xl bg-white/95">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Location</div>
                  <button className="text-xs px-2 py-1 rounded border" onClick={toggleLocationDone}>
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
                          <button className="text-xs px-2 py-1 rounded border" onClick={() => toggleSectionDone(s.id)}>
                            {s.status === 'input' ? 'Done' : 'Edit'}
                          </button>
                        </div>
                        {/* dataset-specific filters go here */}
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
      )}

      {/* Right-side collapsible panel (CSS positions it on the right; hidden on load) */}
      <div className={`side-panel ${panelOpen ? 'open' : ''}`} aria-hidden={!panelOpen}>
        <div className="side-panel__header">
          <div className="side-panel__header">
        <div className="font-semibold">ECHO</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button
            aria-label="Collapse panel"
            onClick={() => setPanelOpen(false)}
            title="Collapse"
            style={{ border:'1px solid var(--color-line)', background:'#fff', width:22, height:22, lineHeight:'20px', borderRadius:4 }}
          >
            −
          </button>
        </div>
      </div>

          {/* header remains static; dropdown via star in top-right */}
        </div>

        <div className="side-panel__list">
          {/* LIST items always visible; chevrons on the LEFT */}
          <div className="side-panel__item" onClick={() => toggleOverlay('search')}>
            <span className="chev">▶</span><span>Search</span>
          </div>
          <div className="side-panel__item" onClick={() => toggleOverlay('layers')}>
            <span className="chev">▶</span><span>Layers</span>
          </div>
          <div className="side-panel__item" onClick={() => toggleOverlay('input')}>
            <span className="chev">▶</span><span>Input</span>
          </div>
          <div className="side-panel__item" onClick={() => toggleOverlay('export')}>
            <span className="chev">▶</span><span>Export</span>



            
          </div>

          {/* Overlays (float above list; click chevron/back area to close) */}
          <div className={`side-panel__overlay ${overlayTab === 'search' ? 'is-open' : ''}`}>
            <div className="side-panel__overlay-header" onClick={() => setOverlayTab(null)}>
              <span style={{ transform:'rotate(90deg)' }}>▶</span><strong>Search</strong>
            </div>
            <div className="side-panel__overlay-body">
              <div className="mb-2 text-xs text-slate-500">Choose a search mode:</div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button className="px-2 py-1 border rounded">Address</button>
                <button className="px-2 py-1 border rounded">Multi-Search</button>
                <button className="px-2 py-1 border rounded">Data Filter</button>
              </div>
              {/* For now, all 3 mount the same SearchBar */}
              <div onFocusCapture={() => setPanelOpen(false)}>
                <SearchBar onSelectAddress={handlePick} onSelectAny={handlePick} />
              </div>
              <div className="mt-2 text-xs text-slate-500">Tip: selecting an address will zoom the map.</div>
              <div className="mt-3">
                <button className="px-3 py-1.5 border rounded" onClick={openSearchFromPanel}>Open full search</button>
              </div>
            </div>
          </div>

          <div className={`side-panel__overlay ${overlayTab === 'layers' ? 'is-open' : ''}`}>
            <div className="side-panel__overlay-header" onClick={() => setOverlayTab(null)}>
              <span style={{ transform:'rotate(90deg)' }}>▶</span><strong>Layers</strong>
            </div>
            <div className="side-panel__overlay-body">
              <div className="text-sm font-medium">Active Layers</div>
              <div className="text-xs text-slate-500 mb-2">No layers yet</div>
              {/* TODO: your layer toggles + legends */}
            </div>
          </div>

          <div className={`side-panel__overlay ${overlayTab === 'input' ? 'is-open' : ''}`}>
            <div className="side-panel__overlay-header" onClick={() => setOverlayTab(null)}>
              <span style={{ transform:'rotate(90deg)' }}>▶</span><strong>Input</strong>
            </div>
            <div className="side-panel__overlay-body">
              <div className="space-y-2">
                <button className="px-3 py-2 rounded border w-full">My Tables</button>
                <button className="px-3 py-2 rounded border w-full">Import</button>
                <button className="px-3 py-2 rounded border w-full">Add to Map</button>
              </div>
            </div>
          </div>

          <div className={`side-panel__overlay ${overlayTab === 'export' ? 'is-open' : ''}`}>
            <div className="side-panel__overlay-header" onClick={() => setOverlayTab(null)}>
              <span style={{ transform:'rotate(90deg)' }}>▶</span><strong>Export</strong>
            </div>
            <div className="side-panel__overlay-body">
              <div className="space-y-2">
                <button className="px-3 py-2 rounded border w-full">PDF</button>
                <button className="px-3 py-2 rounded border w-full">DXF</button>
                <button className="px-3 py-2 rounded border w-full">CSV</button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer pinned bottom-right */}
        <div className="side-panel__footer">Echo Map Victoria - 2025</div>
      </div>

      {/* Collapsed grabber (7px wide with +) */}
      {!panelOpen && (
        <button className="panel-grabber" aria-label="Open panel" onClick={() => setPanelOpen(true)}>+</button>
      )}

      
    </div>
  );
}
