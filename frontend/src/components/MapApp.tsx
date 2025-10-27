'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import SearchBar from "./SearchBar";
import type { SuggestItem } from "../lib/suggest";

import AddLocationModal from "./AddLocationModal";
import MyLocationsModal from "./MyLocationsModal";
import ExportModal from "./ExportModal";

/* ================= UX constants ================= */
const UX = { addressFlyToZoom: 16 };

/* ================= Types ================= */
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

/* (SA2 helpers kept for later use) */
type PatternKey = 'diag' | 'cross' | 'dot' | 'diagGap' | 'h' | 'v';
const PATTERNS: PatternKey[] = ['diag', 'cross', 'dot', 'diagGap', 'h', 'v'];
const HATCH_FILES = ['diag-16-navy','cross-16-navy','dot-16-navy','diagGap-16-navy','h-16-navy','v-16-navy'];
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

/* ================= Lightweight modals (Account/About) ================= */
function SimpleModal({ title, onClose, children }:{
  title: string; onClose: () => void; children?: React.ReactNode
}) {
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.25)', zIndex:2000,
      display:'grid', placeItems:'center'
    }} onClick={onClose}>
      <div onClick={(e)=>e.stopPropagation()} style={{
        width:'min(520px, 92vw)', background:'#fff', border:'1px solid var(--color-line)',
        borderRadius:10, boxShadow:'var(--shadow-panel)', padding:16
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
          <strong>{title}</strong>
          <button onClick={onClose} aria-label="Close" style={{border:'1px solid var(--color-line)', background:'#fff', width:24, height:24, borderRadius:6}}>×</button>
        </div>
        <div style={{fontSize:14, color:'#333'}}>{children || 'Coming soon…'}</div>
      </div>
    </div>
  );
}

/* ================= Component ================= */
export default function MapApp() {
  // Map refs/state
  const mapRef = useRef<MLMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const addrMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Panel + overlays
  const [panelOpen, setPanelOpen] = useState(false);
  type PanelTab = 'search' | 'layers' | 'input' | 'export' | null;
  const [overlayTab, setOverlayTab] = useState<PanelTab>(null);

  // Search modal + toast
  const [showSearchUI, setShowSearchUI] = useState(true);
  type PickSummary = { kind: 'location' | 'data'; label: string };
  const [lastPick, setLastPick] = useState<PickSummary | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Location + sections
  const [location, setLocation] = useState<LocationState>({ mode: 'idle', status: 'input' });
  const [sections, setSections] = useState<DatasetSection[]>([]);

  // Simple modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTablesModal, setShowTablesModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // SearchBar loading flag → spin logo (already wired)
  const [searchLoading, setSearchLoading] = useState(false);

  // Intro overlay state
  const [introVisible, setIntroVisible] = useState(true);
  const [introAnimate, setIntroAnimate] = useState(false); // starts animations after 0.5s
  const [introFading, setIntroFading] = useState(false);   // begin fade just before removal

  /* ============== Map init ============== */
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://api.maptiler.com/maps/backdrop/style.json?key=" + (process.env.NEXT_PUBLIC_MAPTILER_KEY || ""),
      center: [144.9631, -37.8136],
      zoom: 10,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.on('error', (e) => console.error('[map] error', (e as any)?.error || e));
    mapRef.current = map;
    return () => { try { map.remove(); } catch {} mapRef.current = null; };
  }, []);

  // Layout reacts
  useEffect(() => { mapRef.current?.resize(); }, [panelOpen, showSearchUI]);

  // CSS runtime vars
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--dynamic-right-offset', panelOpen ? 'var(--panel-width)' : 'var(--panel-grabber)');
    root.style.setProperty('--collapsed-gap-right', 'calc(var(--panel-grabber) + 10px)');
    if (!getComputedStyle(root).getPropertyValue('--panel-footer-h')) {
      root.style.setProperty('--panel-footer-h', '26px');
    }
  }, [panelOpen]);

  // Esc to close overlay then panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (overlayTab) setOverlayTab(null);
        else if (panelOpen) setPanelOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlayTab, panelOpen]);

  // Intro overlay timers: start anim at 0.5s, fade at 2.5s, remove at 3.0s
  useEffect(() => {
    const t1 = setTimeout(() => setIntroAnimate(true), 500);
    const t2 = setTimeout(() => setIntroFading(true), 2500);
    const t3 = setTimeout(() => setIntroVisible(false), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  /* ============== Handlers ============== */
  const toggleOverlay = (tab: Exclude<PanelTab, null>) =>
    setOverlayTab(prev => (prev === tab ? null : tab));
  const togglePanel = () => setPanelOpen(v => !v);

  const handlePick = useCallback((it: SuggestItem) => {
    if (it.tag === 'Address') {
      setLocation({ mode: 'address', label: it.label, lon: it.lon ?? undefined, lat: it.lat ?? undefined, status: 'input' });
      setLastPick({ kind: 'location', label: it.label });

      if (mapRef.current && it.lon != null && it.lat != null) {
        mapRef.current.flyTo({ center: [it.lon, it.lat], zoom: UX.addressFlyToZoom, speed: 1.2 });
        if (addrMarkerRef.current) addrMarkerRef.current.remove();
        addrMarkerRef.current = new maplibregl.Marker({ color: '#e86017' })
          .setLngLat([it.lon, it.lat])
          .addTo(mapRef.current);
      }
      setPanelOpen(false);
    } else {
      const id = Math.random().toString(36).slice(2, 9);
      const ds: DatasetSection = { id, status: 'input' };
      if ((it as any).key === 'planning_zones') ds.dataset = 'planning_zones';
      else if ((it as any).key === 'sa2')       ds.dataset = 'sa2';
      else if ((it as any).key?.startsWith('pois')) ds.dataset = 'pois';
      else if ((it as any).key === 'dwell_struct')  ds.dataset = 'dwell_struct';
      setSections(prev => [ds, ...prev]);
      if (it.tag === 'Areas') setLocation({ mode: 'area', label: it.label, status: 'input' });

      const dsLabel = ds.dataset ? String(ds.dataset).replaceAll('_',' ') : it.label;
      setLastPick({ kind: 'data', label: dsLabel });

      setPanelOpen(true);
      setOverlayTab('layers');
    }
  }, []);

  /* ============== Render ============== */
  return (
    <div className="relative h-screen w-screen" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
      {/* Small global overrides + spinning logo + intro styles */}
      <style jsx global>{`
        .searchbar-wrapper input { border-radius: 0 !important; }
        .chev-ico { width: 12px; height: 12px; display:inline-block; background-repeat:no-repeat; background-size:contain; background-position:center; }
        .chev-ico.closed { background-image: url('/icons/chev-closed.svg'); }
        .chev-ico.open   { background-image: url('/icons/chev-open.svg'); }
        .chev-ico:empty::after { content: '›'; font-size:12px; line-height:12px; display:block; }

        .echo-title { display:flex; align-items:center; gap:8px; }
        .echo-title .echo-logo { width:20px; height:20px; object-fit:contain; }
        .echo-title .spin { animation: echo-spin 800ms linear infinite; }
        @keyframes echo-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Intro overlay */
        .intro-overlay {
          position: fixed; inset: 0; background: #fff; z-index: 3000;
          display: flex; align-items: center; justify-content: center;
          opacity: 1; transition: opacity 500ms ease;
          pointer-events: auto;
        }
        .intro-overlay.fade { opacity: 0; pointer-events: none; }

        /* Intro content positioned exactly like search modal title area */
        .intro-shell {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: 30%;
          width: min(1200px, calc(70vw - ((var(--gap-50) + var(--collapsed-gap-right)) + (var(--gap-50) + 10px))));
          display: flex; justify-content: space-between; align-items: center;
        }
        .intro-title { display:flex; align-items:center; gap:8px; font-weight:600; color:#1b1b1b; }
        .intro-gif { width:30px; height:30px; object-fit:contain; }

        /* word-by-word bounce in */
        .intro-word { opacity: 0; transform: translateX(16px); }
        .intro-animate .intro-word { animation: intro-bounce 500ms cubic-bezier(.2,.8,.2,1) forwards; }
        .intro-word[data-i="0"] { animation-delay: 0.00s; }
        .intro-word[data-i="1"] { animation-delay: 0.08s; }
        .intro-word[data-i="2"] { animation-delay: 0.16s; }
        .intro-word[data-i="3"] { animation-delay: 0.24s; }
        .intro-word[data-i="4"] { animation-delay: 0.32s; }
        .intro-word[data-i="5"] { animation-delay: 0.40s; }
        .intro-word[data-i="6"] { animation-delay: 0.48s; }

        @keyframes intro-bounce {
          0%   { opacity:0; transform: translateX(16px); }
          60%  { opacity:1; transform: translateX(-3px); }
          100% { opacity:1; transform: translateX(0); }
        }
      `}</style>

      {/* Map */}
      <div className="map-frame">
        <div className="map-inner">
          <div ref={mapContainerRef} id="map" className="w-full h-full" />
        </div>
      </div>

      {/* Header logo (top-left) */}
      <div style={{ position:'fixed', top:'var(--gap-5)', left:'var(--gap-5)', zIndex: 950 }}>
        <button className="px-2 py-1 border bg-white" onClick={() => window.location.assign('/')} aria-label="Home">
          ECHO
        </button>
      </div>

      {/* Star toggler (top-right) */}
      <div style={{ position:'fixed', top:'var(--gap-5)', right:'var(--gap-10)', zIndex:950 }}>
        <button className="header-star" onClick={togglePanel} aria-label="Toggle panel" title={panelOpen ? 'Close' : 'Open'}>
          <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M5 0v10M0 5h10M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="black" strokeWidth="1" /></svg>
        </button>
      </div>

      {/* Toast */}
      {showToast && lastPick && (
        <div className="echo-toast">
          <span className="label">{lastPick.kind === 'location' ? 'Location' : 'Data'}:</span>
          <span className="value" title={lastPick.label}>{lastPick.label}</span>
          <button className="px-2 py-1 border bg-white" onClick={() => { setShowSearchUI(true); setShowToast(false); setPanelOpen(false); }}>Edit</button>
          <button className="px-2 py-1 border bg-white" onClick={() => setShowToast(false)} title="Close" aria-label="Close">×</button>
        </div>
      )}

      {/* Center search modal */}
      {showSearchUI && (
        <div className="search-modal-wrap z-50">
          <div className="border bg-white/95 shadow-lg px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="echo-title text-lg font-semibold text-slate-600">
                <img
                  src="/icons/echologo5.png"
                  alt="Echo"
                  width={20}
                  height={20}
                  className={`echo-logo ${searchLoading ? 'spin' : ''}`}
                  style={{ width: 20, height: 20, display: 'block' }}
                  decoding="async"
                  loading="eager"
                />
                <span className="text-slate-900">ECHO</span>
                <span className="ml-2 text-sm font-normal text-slate-500">your digital twin</span>
              </div>
            </div>

            <div onFocusCapture={() => setPanelOpen(false)}>
              <SearchBar
                onSelectAddress={handlePick}
                onSelectAny={handlePick}
                onDone={() => { setShowSearchUI(false); setShowToast(true); }}
                onLoadingChange={setSearchLoading}
              />
            </div>
          </div>

          {/* Location (read-only) */}
          {location.mode !== 'idle' && (
            <div className="mt-3 p-3 border bg-white/95">
              <div className="text-sm font-medium mb-1">Location</div>
              <div className="text-sm">
                {location.mode === 'address' && <>Address: <span className="font-medium">{location.label}</span></>}
                {location.mode === 'area'    && <>Area: <span className="font-medium">{location.label}</span></>}
              </div>
            </div>
          )}

          {/* Data selections (optional readout) */}
          {sections.length > 0 && (
            <div className="mt-3 p-3 border bg-white/95">
              <div className="text-sm font-medium mb-2">Data</div>
              <div className="space-y-2">
                {sections.map(s => (
                  <div key={s.id} className="border rounded-lg p-2 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">{s.dataset ?? 'Choose dataset'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Side panel (single instance) */}
      <div className={`side-panel ${panelOpen ? 'open' : ''}`} aria-hidden={!panelOpen}>
        <div className="side-panel__header">
          <div className="font-semibold">ECHO</div>
        </div>

        <div className="side-panel__content">
          <div className="side-panel__list">
            <div className="side-panel__item" onClick={() => toggleOverlay('search')}>
              <span className={`chev-ico ${overlayTab==='search' ? 'open' : 'closed'}`} />
              <span>Search</span>
            </div>

            <div className="side-panel__item" onClick={() => toggleOverlay('layers')}>
              <span className={`chev-ico ${overlayTab==='layers' ? 'open' : 'closed'}`} />
              <span>Layers</span>
            </div>

            <div className="side-panel__item" onClick={() => toggleOverlay('input')}>
              <span className={`chev-ico ${overlayTab==='input' ? 'open' : 'closed'}`} />
              <span>Input</span>
            </div>

            <div className="side-panel__item" onClick={() => toggleOverlay('export')}>
              <span className={`chev-ico ${overlayTab==='export' ? 'open' : 'closed'}`} />
              <span>Export</span>
            </div>

            <div className="side-panel__item" onClick={() => setShowAccountModal(true)}>
              <span className="chev-ico closed" />
              <span>Account</span>
            </div>
            <div className="side-panel__item" onClick={() => setShowAboutModal(true)}>
              <span className="chev-ico closed" />
              <span>About</span>
            </div>

            {/* Overlays */}
            <div className={`side-panel__overlay ${overlayTab === 'search' ? 'is-open' : ''}`}>
              <div
                className="side-panel__overlay-header"
                onClick={() => setOverlayTab(null)}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOverlayTab(null); }}
              >
                <span className="chev-ico open" /> <strong>Search</strong>
              </div>
              <div className="side-panel__overlay-body">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button className="px-2 py-1 border" onClick={() => { setPanelOpen(false); setShowSearchUI(true); }}>Search Address</button>
                  <button className="px-2 py-1 border" onClick={() => setShowAboutModal(true)}>Multi-Focus</button>
                  <button className="px-2 py-1 border" onClick={() => { setPanelOpen(false); setShowSearchUI(true); }}>Data</button>
                </div>
                <div onFocusCapture={() => setPanelOpen(false)}>
                  <SearchBar
                    onSelectAddress={handlePick}
                    onSelectAny={handlePick}
                    onDone={() => { setShowSearchUI(false); setShowToast(true); }}
                    onLoadingChange={setSearchLoading}
                  />
                </div>
              </div>
            </div>

            <div className={`side-panel__overlay ${overlayTab === 'layers' ? 'is-open' : ''}`}>
              <div
                className="side-panel__overlay-header"
                onClick={() => setOverlayTab(null)}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOverlayTab(null); }}
              >
                <span className="chev-ico open" /> <strong>Layers</strong>
              </div>
              <div className="side-panel__overlay-body">
                <div className="mb-2 text-sm font-semibold">Group Header</div>
                <label className="flex items-center gap-2 mb-3">
                  <input type="checkbox" onChange={() => {/* TODO toggle layer 1 */}} />
                  <span>Layer 1</span>
                </label>

                <div className="mb-2 text-sm font-semibold">Group Header 2</div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" onChange={() => {/* TODO toggle layer 2 */}} />
                  <span>Layer 2</span>
                </label>
              </div>
            </div>

            <div className={`side-panel__overlay ${overlayTab === 'input' ? 'is-open' : ''}`}>
              <div
                className="side-panel__overlay-header"
                onClick={() => setOverlayTab(null)}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOverlayTab(null); }}
              >
                <span className="chev-ico open" /> <strong>Input</strong>
              </div>
              <div className="side-panel__overlay-body">
                <div className="space-y-2">
                  <button className="px-3 py-2 border w-full" onClick={() => setShowTablesModal(true)}>My Tables</button>
                  <button className="px-3 py-2 border w-full" onClick={() => setShowTablesModal(true)}>Import</button>
                  <button className="px-3 py-2 border w-full" onClick={() => setShowAddModal(true)}>Add to Map</button>
                </div>
              </div>
            </div>

            <div className={`side-panel__overlay ${overlayTab === 'export' ? 'is-open' : ''}`}>
              <div
                className="side-panel__overlay-header"
                onClick={() => setOverlayTab(null)}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOverlayTab(null); }}
              >
                <span className="chev-ico open" /> <strong>Export</strong>
              </div>
              <div className="side-panel__overlay-body">
                <div className="space-y-2">
                  <button className="px-3 py-2 border w-full" onClick={() => setShowExportModal(true)}>PDF / DXF / CSV</button>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Uses current view by default; choose layers & scale in the modal.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="side-panel__footer">Echo Map Victoria - 2025</div>
      </div>

      {/* ===== Intro overlay ===== */}
      {introVisible && (
        <div className={`intro-overlay ${introFading ? 'fade' : ''}`}>
          <div className={`intro-shell ${introAnimate ? 'intro-animate' : ''}`}>
            <div className="intro-title">
              <img src="/icons/welcomeGif.gif" alt="Welcome" className="intro-gif" />
              <span className="intro-word" data-i="0">ECHO</span>
              <span className="intro-word" data-i="1">—</span>
              <span className="intro-word" data-i="2">your</span>
              <span className="intro-word" data-i="3">digital</span>
              <span className="intro-word" data-i="4">twin</span>
            </div>
            {/* Right side spacer (keeps same justify-between layout as search title row) */}
            <div style={{ width: 80, height: 1 }} />
          </div>
        </div>
      )}

      {/* ===== Modals ===== */}
      {showAddModal && (
        <AddLocationModal map={mapRef.current} onClose={() => setShowAddModal(false)}
          onData={(pointsFC, buffersFC)=>{ /* hook to setUserPoints/setUserBuffers if needed */ }} />
      )}
      {showTablesModal && (
        <MyLocationsModal map={mapRef.current} onClose={() => setShowTablesModal(false)}
          onShow={(pointsFC, buffersFC)=>{ /* hook to setUserPoints/setUserBuffers if needed */ }} />
      )}
      {showExportModal && (
        <ExportModal map={mapRef.current} onClose={() => setShowExportModal(false)} />
      )}
      {showAccountModal && (
        <SimpleModal title="Account" onClose={()=>setShowAccountModal(false)}>
          Your account settings will appear here.
        </SimpleModal>
      )}
      {showAboutModal && (
        <SimpleModal title="About" onClose={()=>setShowAboutModal(false)}>
          Echo Map Victoria — 2025. About text / version info goes here.
        </SimpleModal>
      )}
    </div>
  );
}
