'use client';

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, GeoJSONSource } from "maplibre-gl";
import { fetchMergedSuggestions, fetchAddressOnly, SuggestItem } from "../lib/suggest";

/* ===================== Types ===================== */
type Operator = "AND" | "OR" | "<" | ">" | "=" | "BETWEEN" | "WITHIN" | "IN";
type Intent = "address" | "multi" | "places" | "areas" | "data";
type Tag = "Data" | "Places" | "Areas" | "Address" | "Multi";

type SectionStatus = "input" | "searching" | "verified" | "error";
type DatasetKey = "planning_zones" | "pois" | "sa2" | "dwell_struct";

interface Filter {
  field: string;
  op: Operator;
  value?: number | string | [number, number] | string[];
}

interface ForLocation {
  mode: "address" | "area" | "within";
  address?: string;
  area?: string;
  within?: { distance_m: number; place_type?: string; text?: string };
  status: SectionStatus;
}

interface DatasetSection {
  id: string;
  status: SectionStatus;
  dataset?: DatasetKey;
  intent?: Intent;
  filters: Filter[];
  options?: {
    zoneCode?: string;
    poiType?: string;
    year?: number;
    category?: string;
  };
  _fc?: GeoJSON.FeatureCollection;
}

/* ===================== Small UI helpers ===================== */
const tagClass: Record<Tag, string> = {
  Data: "bg-[var(--pill-data)] text-white",
  Places: "bg-[var(--pill-places)] text-black",
  Areas: "bg-[var(--pill-areas)] text-white",
  Address: "bg-[var(--pill-gray)] text-black",
  Multi: "bg-[var(--pill-multi)] text-white",
};

function TagPill({tag}:{tag:Tag}) {
  return <span className={`text-xs px-2 py-0.5 rounded-full border border-black/10 ${tagClass[tag]}`}>{tag}</span>;
}

function Pill({
  active,
  children,
  onClick,
  className = "",
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border transition ${active ? "bg-[var(--clr-bg-light)]" : "bg-white hover:bg-gray-50"} ${className}`}
    >
      {children}
    </button>
  );
}

function DropdownPill({
  label,
  value,
  items,
  onSelect,
  className = "",
}: {
  label?: string;
  value: string;
  items: string[];
  onSelect: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        className={`text-xs px-2.5 py-1 rounded-full border bg-white hover:bg-gray-50 flex items-center gap-1 ${className}`}
        onClick={() => setOpen((o) => !o)}
      >
        {label ? <span className="opacity-70">{label}:</span> : null}
        <span className="font-medium">{value}</span>
        <svg width="10" height="10" viewBox="0 0 20 20" className="opacity-60">
          <path d="M5 7l5 5 5-5" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-30 mt-2 bg-white border rounded-xl shadow-xl min-w-[200px] p-1">
          {items.map((opt) => (
            <button
              key={opt}
              className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 ${opt===value ? "bg-gray-100" : ""}`}
              onClick={() => { onSelect(opt); setOpen(false); }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusDot({status}:{status:SectionStatus}) {
  const color = status==="verified" ? "bg-green-500"
              : status==="searching" ? "bg-blue-500"
              : status==="error" ? "bg-red-500"
              : "bg-gray-400";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} title={status} />;
}

/* ===================== Utilities ===================== */
function bboxOf(fc: GeoJSON.FeatureCollection): [number, number, number, number] | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (c: any) => Array.isArray(c[0]) ? c.forEach(visit)
    : ([minX, minY] = [Math.min(minX, c[0]), Math.min(minY, c[1])],
       [maxX, maxY] = [Math.max(maxX, c[0]), Math.max(maxY, c[1])]);
  try {
    for (const f of fc.features) {
      const g = f.geometry; if (!g) continue;
      if (g.type === "Point") visit(g.coordinates);
      else if (g.type === "MultiPoint" || g.type === "LineString") visit((g as any).coordinates);
      else visit((g as any).coordinates);
    }
    if (minX === Infinity) return null;
    return [minX, minY, maxX, maxY];
  } catch { return null; }
}

async function fetchGeoJSON(query: any): Promise<GeoJSON.FeatureCollection> {
  const res = await fetch(`/api/compile-run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!res.ok) throw new Error(`compile-run failed (${res.status})`);
  return await res.json();
}

/* ===================== Layers catalog (static) ===================== */
type LayerGroup = "Active" | "Property" | "Social" | "Infrastructure" | "Areas";
type LayerType = "fill" | "line" | "circle";

type LayerCfg = {
  id: string;         // maplibre layer id
  title: string;
  group: LayerGroup;
  on?: boolean;       // default visibility
  type: LayerType;
  sourceId: string;   // which source this layer uses
};

const layerCatalog: LayerCfg[] = [
  { id: "planning-fill", title: "Planning Zones (fill)", group:"Property", on:true,  type:"fill",   sourceId:"planning" },
  { id: "planning-line", title: "Planning Zones (line)", group:"Property", on:true,  type:"line",   sourceId:"planning" },
  { id: "pois",          title: "POIs",                   group:"Infrastructure",     on:false,      type:"circle", sourceId:"pois" },
  { id: "sa2-fill",      title: "SA2 (fill)",             group:"Areas",              on:false,      type:"fill",   sourceId:"sa2" },
  { id: "sa2-line",      title: "SA2 (line)",             group:"Areas",              on:false,      type:"line",   sourceId:"sa2" },
];

/* ===================== Main Component ===================== */
export default function MapApp() {
  /* App start: welcome vs. active */
  const [appStarted, setAppStarted] = useState(false);

  /* Hide/show panel (summary vs. editor) */
  const [panelOpen, setPanelOpen] = useState(true);

  /* Global Edit/Done for entire panel */
  const [isEditing, setIsEditing] = useState(true);

  /* Only show search bar during edit when actively adding a dataset */
  const [addingDataset, setAddingDataset] = useState(false);

  /* Layers UI state */
  const [showLayers, setShowLayers] = useState(false);
  const [layerState, setLayerState] = useState<Record<string, boolean>>(
    () => Object.fromEntries(layerCatalog.map(l => [l.id, !!l.on]))
  );

  /* Global Location (separate from datasets) */
  const [location, setLocation] = useState<ForLocation>({
    mode: "area", status: "input"
  });

  /* Dataset sections (1–4) */
  const [sections, setSections] = useState<DatasetSection[]>([]);

  /* Searchbar + suggestions (main) */
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* Location (Address mode) input + suggestions */
  const [locAddrText, setLocAddrText] = useState("");
  const [locAddrOpen, setLocAddrOpen] = useState(false);
  const [locAddrSuggestions, setLocAddrSuggestions] = useState<SuggestItem[]>([]);
  const locAddrInputRef = useRef<HTMLInputElement | null>(null);

  /* Derived flags */
  const allDatasetsVerified = sections.length>0 && sections.every(s => s.status==="verified");
  const locationVerified = location.status==="verified";
  const canShowData = appStarted && !isEditing && panelOpen && allDatasetsVerified && locationVerified;

  /* Map */
  const mapRef = useRef<MLMap | null>(null);
  const mapReady = useRef(false);
  const mapContainer = useRef<HTMLDivElement | null>(null);

  /* ===== Suggest (main) – keep open for >=2 chars, addresses join >=3 ===== */
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const q = text.trim();
        if (q.length >= 2 && panelOpen) setOpen(true);
        else { setOpen(false); setSuggestions([]); return; }

        const raw = await fetchMergedSuggestions(q);
        if (alive) {
          setSuggestions(raw);
          setOpen(q.length >= 2 && raw.length > 0);
        }
      } catch {
        if (alive) { setSuggestions([]); setOpen(false); }
      }
    }, 80);
    return () => { alive = false; clearTimeout(t); };
  }, [text, panelOpen]);

  /* ===== Suggest (Location > Address only) ===== */
  useEffect(() => {
    let alive = true;
    if (location.mode !== "address" || !isEditing) { setLocAddrSuggestions([]); setLocAddrOpen(false); return; }
    const t = setTimeout(async () => {
      try {
        const q = locAddrText.trim();
        if (q.length >= 3) setLocAddrOpen(true); else { setLocAddrOpen(false); setLocAddrSuggestions([]); return; }
        const items = await fetchAddressOnly(q);
        if (alive) {
          setLocAddrSuggestions(items);
          setLocAddrOpen(q.length >= 3 && items.length > 0);
        }
      } catch {
        if (alive) { setLocAddrSuggestions([]); setLocAddrOpen(false); }
      }
    }, 100);
    return () => { alive = false; clearTimeout(t); };
  }, [locAddrText, location.mode, isEditing]);

  /* Map init (Positron) */
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style: {
        version: 8,
        sources: {
          positron: {
            type: "raster",
            tiles: ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> ' +
              '&copy; <a href="https://carto.com/attributions">CARTO</a>'
          } as any,
        },
        layers: [{ id: "positron", type: "raster", source: "positron" }],
      } as any,
      center: [144.9631, -37.8136],
      zoom: 10,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.on("load", () => { mapReady.current = true; map.resize(); });
    const onResize = () => map.resize();
    window.addEventListener("resize", onResize);
    mapRef.current = map;
    return () => { window.removeEventListener("resize", onResize); map.remove(); mapRef.current=null; mapReady.current=false; };
  }, []);

  /* Draw / update layers per dataset */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady.current) return;

    const boxes: [number,number,number,number][] = [];
    for (const s of sections) {
      const fc = s._fc;
      if (!fc) continue;
      const src = `sec-${s.id}`;

      const existing = map.getSource(src) as GeoJSONSource | undefined;
      if (existing) existing.setData(fc as any);
      else map.addSource(src, { type: "geojson", data: fc } as any);

      const fillId = `sec-${s.id}-fill`;
      const lineId = `sec-${s.id}-line`;
      const ptId   = `sec-${s.id}-point`;

      const safeRemove = (id:string) => { if (map.getLayer(id)) map.removeLayer(id); };

      if (s.dataset==="planning_zones" || s.dataset==="sa2" || s.dataset==="dwell_struct") {
        safeRemove(ptId);
        if (!map.getLayer(fillId)) {
          map.addLayer({ id:fillId, type:"fill", source:src, paint:{ "fill-color":"#3b82f6", "fill-opacity":0.35 } }, "positron");
        }
        if (!map.getLayer(lineId)) {
          map.addLayer({ id:lineId, type:"line", source:src, paint:{ "line-color":"#1f2937","line-width":1.2 } });
        }
      } else if (s.dataset==="pois") {
        safeRemove(fillId); safeRemove(lineId);
        if (!map.getLayer(ptId)) {
          map.addLayer({ id:ptId, type:"circle", source:src, paint:{ "circle-radius":5, "circle-color":"#111827" } });
        }
      }

      const box = bboxOf(fc); if (box) boxes.push(box);
    }

    if (boxes.length) {
      const union = boxes.reduce((a,b)=>[Math.min(a[0],b[0]), Math.min(a[1],b[1]), Math.max(a[2],b[2]), Math.max(a[3],b[3]) ] as any, [Infinity,Infinity,-Infinity,-Infinity]);
      map.fitBounds([[union[0],union[1]],[union[2],union[3]]], { padding: 40, maxZoom: 12 });
    }
  }, [sections]);

  /* Layers panel helper */
  function LayersPanel() {
    if (!showLayers) return null;

    const groups: LayerGroup[] = ["Active","Property","Social","Infrastructure","Areas"];
    const activeFromState = Object.entries(layerState)
      .filter(([, on]) => on)
      .map(([id]) => layerCatalog.find(l => l.id === id))
      .filter(Boolean) as LayerCfg[];

    return (
      <div className="fixed top-16 left-4 z-30 w-80 max-h-[70vh] overflow-auto bg-white/95 border rounded-2xl shadow p-3">
        <div className="text-sm font-semibold mb-2">Layers</div>
        {groups.map((g) => {
          const items = g === "Active" ? activeFromState : layerCatalog.filter(l => l.group === g);
          if (!items.length) return null;
          return (
            <div key={g} className="mb-3">
              <div className="text-xs uppercase tracking-wide opacity-70 mb-1">{g}</div>
              <div className="space-y-1">
                {items.map(l => (
                  <label key={l.id} className="flex items-center justify-between gap-2 text-sm bg-white border rounded-lg px-2 py-1">
                    <span>{l.title}</span>
                    <input
                      type="checkbox"
                      checked={!!layerState[l.id]}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setLayerState(prev => ({ ...prev, [l.id]: on }));
                        const map = mapRef.current;
                        if (!map) return;
                        if (map.getLayer(l.id)) {
                          map.setLayoutProperty(l.id, "visibility", on ? "visible" : "none");
                        }
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* Add a new empty dataset section (limited to 4) */
  function addDatasetSection() {
    if (sections.length >= 4) return;
    const id = Math.random().toString(36).slice(2,9);
    const sec: DatasetSection = { id, status:"input", filters:[], options:{} };
    setSections(prev => [sec, ...prev]);
    setIsEditing(true);
    setAppStarted(true);
    setAddingDataset(true); // show search bar during edit
  }

  /* Choose suggestion → address fills Location; datasets populate first input section */
  function onChoose(s: SuggestItem){
    // Address
    if (s.tag === "Address") {
      setAppStarted(true);
      setIsEditing(true);
      setAddingDataset(false);          // hide search bar
      setLocation({ mode: "address", address: s.label, status: "input" });
      setLocAddrText(s.label);
      setLocAddrSuggestions([]);
      setOpen(false); setSuggestions([]);
      setText("");
      if (inputRef.current) inputRef.current.blur();
      return;
    }

    if (!appStarted) { setAppStarted(true); setIsEditing(true); }
    setAddingDataset(false);            // hide search bar after dataset pick
    setOpen(false); setSuggestions([]); setText("");
    if (inputRef.current) inputRef.current.blur();

    if (sections.length===0 || !sections[0] || sections[0].status!=="input") addDatasetSection();

    setSections(prev => {
      const [head, ...tail] = prev;
      const next = { ...head };
      if (s.key==="planning_zones"){ next.dataset="planning_zones"; next.intent="data"; next.options={ zoneCode:"All" }; }
      else if (s.key==="pois"){      next.dataset="pois"; next.intent="places"; next.options={ poiType:"All" }; }
      else if (s.key==="sa2"){       next.dataset="sa2"; next.intent="areas"; }
      else if (s.key==="dwell_struct"){ next.dataset="dwell_struct"; next.intent="data"; next.options={ year:2021, category:"Separate_house" }; }
      next.status = "input";
      return [next, ...tail];
    });
  }

  /* Dataset option handlers */
  function onZoneChange(idx:number, val:string){
    setSections(prev => prev.map((s,i)=>{
      if(i!==idx) return s;
      const filters = s.filters.filter(f=>f.field!=="ZONE_CODE");
      if (val && val!=="All") filters.push({ field:"ZONE_CODE", op:"=", value:val });
      return {...s, filters, options:{...s.options, zoneCode:val}};
    }));
  }
  function onPoiTypeChange(idx:number, val:string){
    setSections(prev => prev.map((s,i)=>{
      if(i!==idx) return s;
      const filters = s.filters.filter(f=>f.field!=="FTYPE");
      if (val && val!=="All") filters.push({ field:"FTYPE", op:"=", value:val });
      return {...s, filters, options:{...s.options, poiType:val}};
    }));
  }

  /* Switch dataset via pill dropdown */
  function switchDataset(idx:number, key:DatasetKey){
    setSections(prev => prev.map((s,i)=>{
      if(i!==idx) return s;
      const base: DatasetSection = { ...s, dataset:key, filters:[], _fc: undefined, status:"input" };
      if (key==="planning_zones") base.options = { zoneCode:"All" };
      else if (key==="pois")      base.options = { poiType:"All" };
      else if (key==="dwell_struct") base.options = { year:2021, category:"Separate_house" };
      else base.options = {};
      return base;
    }));
    setIsEditing(true);
    setAppStarted(true);
  }

  /* Delete dataset tab */
  function deleteSection(idx:number){
    setSections(prev => prev.filter((_,i)=>i!==idx));
  }

  /* Done / Edit toggles */
  function onDone() {
    // Verify location + datasets minimal requirements
    const locOk = location.mode === "address"
               || location.mode === "area"
               || location.mode === "within";
    setLocation(prev => ({ ...prev, status: locOk ? "verified" : "input" }));
    setSections(prev => prev.map(s => ({ ...s, status: s.dataset ? "verified" : "input" })));
    const willBeAllVerified = sections.length>0 && sections.every(s => !!s.dataset);
    if (locOk && willBeAllVerified) {
      setIsEditing(false);
      setAddingDataset(false); // hide search bar
    }
  }
  function onEdit() {
    setIsEditing(true);
  }

  /* Show Data: fetch ALL verified datasets */
  async function onShowData(){
    const ready = sections.filter(s => s.status==="verified" && s.dataset);
    if (ready.length===0 || location.status!=="verified") return;
    setSections(prev => prev.map(s => ({ ...s, status: s.status==="verified" ? "searching" : s.status })));
    try {
      const results: Record<string, GeoJSON.FeatureCollection> = {};
      for (const s of ready) {
        const q:any = { dataset: s.dataset, filters: s.filters };
        if (s.dataset==="dwell_struct") { q.time = s.options?.year ?? 2021; q.category = s.options?.category ?? "Separate_house"; }
        const fc = await fetchGeoJSON(q);
        results[s.id] = fc;
      }
      setSections(prev => prev.map(s => ({ ...s, _fc: results[s.id] ?? s._fc })));
      setPanelOpen(false); // collapse to summary
    } finally {
      setSections(prev => prev.map(s => ({ ...s, status: s.status==="searching" ? "verified" : s.status })));
    }
  }

  /* Suggest open/close (main bar) */
  const onBlurClose = () => setTimeout(()=>setOpen(false),110);
  const onFocusOpen = () => { if (text.trim().length>=2 && panelOpen) setOpen(true); };

  /* Toolbar mini state (no-op placeholders for now) */
  const [showInput,  setShowInput]  = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showMyData, setShowMyData] = useState(false);
  const [showAccount,setShowAccount]= useState(false);

  useEffect(() => {
    const q = (id:string) => document.getElementById(id);
    q("btn-layers")?.addEventListener("click", ()=>setShowLayers(v=>!v));
    q("btn-input") ?.addEventListener("click", ()=>setShowInput(v=>!v));
    q("btn-export")?.addEventListener("click", ()=>setShowExport(v=>!v));
    q("btn-mydata")?.addEventListener("click", ()=>setShowMyData(v=>!v));
    q("btn-account")?.addEventListener("click", ()=>setShowAccount(v=>!v));
    return () => {};
  }, []);

  /* Dataset chooser pill (dropdown) */
  function DatasetChooser({idx, current}:{idx:number; current?:DatasetKey}) {
    const [show, setShow] = useState(false);
    const items: {key:DatasetKey; label:string}[] = [
      { key:"planning_zones", label:"Planning Zones" },
      { key:"pois", label:"POIs" },
      { key:"sa2", label:"SA2 Boundaries" },
      { key:"dwell_struct", label:"Dwelling Structure" },
    ];
    const currentLabel = items.find(i=>i.key===current)?.label || "Choose Dataset";
    return (
      <div className="relative inline-block">
        <Pill active className="border-[var(--clr-primary)] text-[var(--clr-primary)]" onClick={()=>setShow(s=>!s)}>
          {currentLabel}
        </Pill>
        {show && (
          <div className="absolute z-30 mt-2 bg-white border rounded-xl shadow-xl min-w-[220px] p-1">
            {items.map(it => (
              <button key={it.key}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 ${it.key===current ? "bg-gray-100" : ""}`}
                onClick={()=>{ switchDataset(idx, it.key); setShow(false); }}>
                {it.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* Header title: “Search” while typing; otherwise “Showing” after first selection */
  const headerTitle = (appStarted && text.trim()==="") ? "Showing" : "Search";

  /* Search row (welcome + when addingDataset) */
  const SearchRow = (
    <div className="relative">
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search datasets, places, or areas…"
        className="w-full border rounded-xl px-4 py-3 outline-none shadow-sm bg-white"
        onFocus={onFocusOpen}
        onBlur={onBlurClose}
      />
      {open && (
        <div className="absolute z-40 left-0 right-0 top-full mt-2 bg-white border rounded-xl shadow-xl max-h-64 overflow-auto">
          {suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
          ) : suggestions.map((s, i) => (
            <button key={s.key + i}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-left"
              onMouseDown={(e)=>e.preventDefault()}
              onClick={()=>onChoose(s)}
            >
              <TagPill tag={s.tag} />
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  /* Summary sentence when panel collapsed */
  const SummaryBar = !panelOpen ? (
    <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 20, width: "min(940px, 88vw)" }}>
      <div className="px-4 py-2 bg-white/95 border rounded-full shadow flex items-center gap-2 justify-center">
        <span className="opacity-80">Showing:</span>
        {sections.map((s) => {
          const parts: string[] = [];
          if (s.dataset==="planning_zones") {
            parts.push("Planning zones");
            if (s.options?.zoneCode && s.options.zoneCode!=="All") parts.push(`zone ${s.options.zoneCode}`);
          } else if (s.dataset==="pois") {
            parts.push("POIs");
            if (s.options?.poiType && s.options.poiType!=="All") parts.push(s.options.poiType);
          } else if (s.dataset==="sa2") {
            parts.push("SA2 boundaries");
          } else if (s.dataset==="dwell_struct") {
            parts.push("Dwelling structure");
            if (s.options?.category) parts.push(s.options.category.replaceAll("_"," "));
            if (s.options?.year) parts.push(String(s.options.year));
          }
          return <Pill key={s.id} active>{parts.join(", ") || "Dataset"}</Pill>;
        })}
        <span className="opacity-80">for Location:</span>
        {location.mode==="address" && <Pill active>Address</Pill>}
        {location.mode==="area" && <Pill active>Area</Pill>}
        {location.mode==="within" && (
          <>
            <Pill active>within</Pill>
            {location.within?.distance_m && <Pill active>{location.within.distance_m} m</Pill>}
            {location.within?.place_type && <Pill active>{location.within.place_type}</Pill>}
          </>
        )}
        <Pill className="border-[var(--clr-primary)] text-[var(--clr-primary)]" onClick={()=>{ setPanelOpen(true); setIsEditing(true); }}>
          Edit Search
        </Pill>
      </div>
    </div>
  ) : null;

  return (
    <div className="w-full h-screen relative">
      {/* Map */}
      <div ref={mapContainer} className="absolute inset-0" style={{ minHeight:"100vh" }} />

      {/* Layers toggle button (top-left) */}
      <div className="absolute top-4 left-4 z-30">
        <button
          id="btn-layers"
          className="px-3 py-1.5 rounded-lg border bg-white shadow"
          onClick={() => setShowLayers(v => !v)}
        >
          {showLayers ? "Hide Layers" : "Layers"}
        </button>
      </div>

      {/* Layers panel */}
      <LayersPanel />

      {/* Summary when collapsed */}
      {SummaryBar}

      {/* Center panel */}
      {panelOpen && (
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top:"15vh", width:"min(940px, 88vw)" }}>
          <div className="bg-white/92 backdrop-blur-sm border rounded-2xl shadow-lg p-4">
            {/* Welcome state: just the input */}
            {!appStarted && SearchRow}

            {/* Editing (after startup) – only when adding */}
            {appStarted && isEditing && addingDataset && SearchRow}

            {appStarted && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">{headerTitle}</div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-3 py-1.5 rounded-lg border ${isEditing ? "text-white" : ""}`}
                      style={{ background: isEditing ? "var(--clr-primary)" : "white" }}
                      onClick={()=> isEditing ? onDone() : onEdit()}
                    >
                      {isEditing ? "Done" : "Edit"}
                    </button>
                    <button
                      disabled={!canShowData}
                      onClick={onShowData}
                      className={`px-4 py-2 rounded-lg text-white ${canShowData ? "btn-accent hover:opacity-95" : "bg-gray-300"}`}
                    >
                      Show Data
                    </button>
                  </div>
                </div>

                {/* === DATASET TABS === */}
                <div className="mt-3 space-y-3">
                  {sections.map((s, idx) => {
                    const zoneChoices = ["All","GRZ","NRZ","RGZ","MUZ"];
                    const poiChoices = ["All","School","Train Station","Hospital","Supermarket"];
                    const editingThis = isEditing;

                    return (
                      <div
                        key={s.id}
                        className={`p-3 border rounded-xl space-y-2 ${editingThis ? "" : "bg-gray-50"}`}
                        style={ editingThis ? { background: "rgba(232,96,23,0.25)" } : undefined }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm flex items-center gap-2 flex-wrap">
                            <span className="opacity-80">Showing:</span>

                            {/* Dataset chooser */}
                            <DatasetChooser idx={idx} current={s.dataset} />

                            {/* Dataset-specific controls */}
                            {s.dataset==="planning_zones" && (
                              <DropdownPill
                                label="Zone"
                                value={s.options?.zoneCode ?? "All"}
                                items={zoneChoices}
                                onSelect={(v)=>onZoneChange(idx,v)}
                              />
                            )}
                            {s.dataset==="pois" && (
                              <DropdownPill
                                label="Type"
                                value={s.options?.poiType ?? "All"}
                                items={poiChoices}
                                onSelect={(v)=>onPoiTypeChange(idx,v)}
                              />
                            )}
                            {s.dataset==="sa2" && <Pill active>SA2 boundaries</Pill>}
                            {s.dataset==="dwell_struct" && (
                              <>
                                <DropdownPill
                                  label="Year"
                                  value={String(s.options?.year ?? 2021)}
                                  items={["2011","2016","2021"]}
                                  onSelect={(v)=>setSections(prev=>prev.map((x,i)=> i!==idx ? x : ({...x, options:{...x.options, year:Number(v)}})))}
                                />
                                <DropdownPill
                                  label="Category"
                                  value={s.options?.category ?? "Separate_house"}
                                  items={["Separate_house","Semi_detached","Flat_or_apartment","Other_dwelling","Not_stated"]}
                                  onSelect={(v)=>setSections(prev=>prev.map((x,i)=> i!==idx ? x : ({...x, options:{...x.options, category:v}})))}
                                />
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <StatusDot status={s.status} />
                            <button
                              aria-label="Delete"
                              title="Delete"
                              className="w-6 h-6 rounded hover:bg-gray-100 text-gray-700 flex items-center justify-center"
                              onClick={()=>deleteSection(idx)}
                              disabled={!isEditing}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add dataset (beneath tabs; hidden when not editing) */}
                {isEditing && (
                  <div className="mt-3">
                    <button
                      disabled={sections.length>=4}
                      className={`w-full py-3 border rounded-xl text-sm ${sections.length>=4 ? "text-gray-400 bg-gray-100 cursor-not-allowed" : "text-gray-600 hover:bg-gray-50"}`}
                      onClick={addDatasetSection}
                    >
                      {sections.length>=4 ? "Limit Reached" : "+ Add dataset"}
                    </button>
                  </div>
                )}

                {/* === LOCATION ROW (tinted feature blue 30%) === */}
                <div
                  className="mt-3 p-3 border rounded-xl"
                  style={{ background: "rgba(14,26,117,0.30)" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm flex items-center gap-2 flex-wrap">
                      <span className="opacity-90">For Location:</span>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Pill active={location.mode==="address"} onClick={()=>setLocation(l=>({...l, mode:"address", status:"input"}))}>Address</Pill>
                          <Pill active={location.mode==="area"} onClick={()=>setLocation(l=>({...l, mode:"area", status:"input"}))}>Area</Pill>
                          <Pill active={location.mode==="within"} onClick={()=>setLocation(l=>({...l, mode:"within", status:"input"}))}>within</Pill>

                          {location.mode==="address" && (
                            <div className="relative">
                              <input
                                ref={locAddrInputRef}
                                className="text-sm border rounded px-2 py-1 bg-white"
                                placeholder="Type an address"
                                value={locAddrText}
                                onChange={(e)=>setLocAddrText(e.target.value)}
                                onFocus={()=>{ if (locAddrText.trim().length >= 3 && locAddrSuggestions.length>0) setLocAddrOpen(true); }}
                                onBlur={()=>setTimeout(()=>setLocAddrOpen(false),110)}
                              />
                              {locAddrOpen && locAddrSuggestions.length>0 && (
                                <div className="absolute z-40 left-0 mt-1 bg-white border rounded-xl shadow-xl min-w-[320px] max-h-60 overflow-auto">
                                  {locAddrSuggestions.map((s, i) => (
                                    <button
                                      key={s.key + i}
                                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                      onMouseDown={(e)=>e.preventDefault()}
                                      onClick={()=>{
                                        setLocation(prev => ({ ...prev, address: s.label, status: "input" }));
                                        setLocAddrText(s.label);
                                        setLocAddrOpen(false);
                                        if (locAddrInputRef.current) locAddrInputRef.current.blur();
                                      }}
                                    >
                                      {s.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {location.mode==="area" && (
                            <input className="text-sm border rounded px-2 py-1 bg-white" placeholder="Type an area (SA2/LGA) (stub)" />
                          )}
                          {location.mode==="within" && (
                            <div className="flex items-center gap-2">
                              <DropdownPill
                                label="within"
                                value={String(location.within?.distance_m ?? 500) + " m"}
                                items={["250 m","500 m","1000 m","2000 m"]}
                                onSelect={(v)=>{
                                  const dist = Number(v.split(" ")[0]);
                                  setLocation(l=>({...l, within:{ distance_m:dist, place_type:l.within?.place_type ?? "Any place" }, status:"input"}));
                                }}
                              />
                              <DropdownPill
                                value={location.within?.place_type ?? "Any place"}
                                items={["Any place","School","Train Station","Hospital","Supermarket"]}
                                onSelect={(v)=>{
                                  setLocation(l=>({...l, within:{ distance_m:l.within?.distance_m ?? 500, place_type:v }, status:"input"}));
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {location.mode==="address" && <Pill active>Address</Pill>}
                          {location.mode==="area" && <Pill active>Area</Pill>}
                          {location.mode==="within" && (
                            <>
                              <Pill active>within</Pill>
                              {location.within?.distance_m && <Pill active>{location.within.distance_m} m</Pill>}
                              {location.within?.place_type && <Pill active>{location.within.place_type}</Pill>}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusDot status={location.status} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
