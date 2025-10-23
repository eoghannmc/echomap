(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/frontend/src/components/MapApp.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MapApp
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/maplibre-gl/dist/maplibre-gl.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
/* ===================== Small UI helpers ===================== */ const tagClass = {
    Data: "bg-[var(--pill-data)] text-white",
    Places: "bg-[var(--pill-places)] text-black",
    Areas: "bg-[var(--pill-areas)] text-white",
    Address: "bg-[var(--pill-gray)] text-black",
    Multi: "bg-[var(--pill-multi)] text-white"
};
function TagPill({ tag }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `text-xs px-2 py-0.5 rounded-full border border-black/10 ${tagClass[tag]}`,
        children: tag
    }, void 0, false, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 54,
        columnNumber: 10
    }, this);
}
_c = TagPill;
function Pill({ active, children, onClick, className = "" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        onClick: onClick,
        className: `text-xs px-2.5 py-1 rounded-full border transition ${active ? "bg-[var(--clr-bg-light)]" : "bg-white hover:bg-gray-50"} ${className}`,
        children: children
    }, void 0, false, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 68,
        columnNumber: 5
    }, this);
}
_c1 = Pill;
function DropdownPill({ label, value, items, onSelect, className = "" }) {
    _s();
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative inline-block",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                className: `text-xs px-2.5 py-1 rounded-full border bg-white hover:bg-gray-50 flex items-center gap-1 ${className}`,
                onClick: ()=>setOpen((o)=>!o),
                children: [
                    label ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "opacity-70",
                        children: [
                            label,
                            ":"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                        lineNumber: 96,
                        columnNumber: 18
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "font-medium",
                        children: value
                    }, void 0, false, {
                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                        lineNumber: 97,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        width: "10",
                        height: "10",
                        viewBox: "0 0 20 20",
                        className: "opacity-60",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M5 7l5 5 5-5",
                            fill: "currentColor"
                        }, void 0, false, {
                            fileName: "[project]/frontend/src/components/MapApp.tsx",
                            lineNumber: 99,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                        lineNumber: 98,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/frontend/src/components/MapApp.tsx",
                lineNumber: 92,
                columnNumber: 7
            }, this),
            open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute z-30 mt-2 bg-white border rounded-xl shadow-xl min-w-[200px] p-1",
                children: items.map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: `w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 ${opt === value ? "bg-gray-100" : ""}`,
                        onClick: ()=>{
                            onSelect(opt);
                            setOpen(false);
                        },
                        children: opt
                    }, opt, false, {
                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                        lineNumber: 105,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapApp.tsx",
                lineNumber: 103,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 91,
        columnNumber: 5
    }, this);
}
_s(DropdownPill, "xG1TONbKtDWtdOTrXaTAsNhPg/Q=");
_c2 = DropdownPill;
function StatusDot({ status }) {
    const color = status === "verified" ? "bg-green-500" : status === "searching" ? "bg-blue-500" : status === "error" ? "bg-red-500" : "bg-gray-400";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `inline-block w-2.5 h-2.5 rounded-full ${color}`,
        title: status
    }, void 0, false, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 123,
        columnNumber: 10
    }, this);
}
_c3 = StatusDot;
/* ===================== Utilities ===================== */ async function fetchSuggest(q) {
    const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const { suggestions } = await res.json();
    return suggestions ?? [];
}
async function fetchGeoJSON(query) {
    const res = await fetch(`/api/compile-run`, {
        method: "POST",
        headers: {
            "content-type": "application/json"
        },
        body: JSON.stringify(query)
    });
    if (!res.ok) throw new Error(`compile-run failed (${res.status})`);
    return await res.json();
}
function scoreSimilarity(input, target) {
    const a = input.toLowerCase().trim();
    const b = target.toLowerCase().trim();
    if (!a) return 0;
    if (a === b) return 100;
    let score = 0;
    if (b.startsWith(a)) score += 60;
    if (b.includes(a)) score += 30;
    const aw = a.split(/\s+/), bw = new Set(b.split(/\s+/));
    let overlap = 0;
    aw.forEach((w)=>{
        if (bw.has(w)) overlap++;
    });
    return score + overlap * 5;
}
function bboxOf(fc) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const visit = (c)=>Array.isArray(c[0]) ? c.forEach(visit) : ([minX, minY] = [
            Math.min(minX, c[0]),
            Math.min(minY, c[1])
        ], [maxX, maxY] = [
            Math.max(maxX, c[0]),
            Math.max(maxY, c[1])
        ]);
    try {
        for (const f of fc.features){
            const g = f.geometry;
            if (!g) continue;
            if (g.type === "Point") visit(g.coordinates);
            else if (g.type === "MultiPoint" || g.type === "LineString") visit(g.coordinates);
            else visit(g.coordinates);
        }
        if (minX === Infinity) return null;
        return [
            minX,
            minY,
            maxX,
            maxY
        ];
    } catch  {
        return null;
    }
}
function MapApp() {
    _s1();
    var _s = __turbopack_context__.k.signature();
    /* App start: welcome vs. active */ const [appStarted, setAppStarted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    /* Global Edit/Done for entire panel */ const [isEditing, setIsEditing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [panelOpen, setPanelOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    /* Global Location (separate from datasets) */ const [location, setLocation] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        mode: "area",
        status: "input"
    });
    /* Dataset sections (1–4) */ const [sections, setSections] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    /* Searchbar + suggestions */ const [text, setText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [suggestions, setSuggestions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const inputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    /* Derived flags */ const allDatasetsVerified = sections.length > 0 && sections.every((s)=>s.status === "verified");
    const locationVerified = location.status === "verified";
    const canShowData = appStarted && !isEditing && panelOpen && allDatasetsVerified && locationVerified;
    /* Map */ const mapRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const mapReady = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const mapContainer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    /* Suggest (debounced + ranked) */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MapApp.useEffect": ()=>{
            let alive = true;
            const t = setTimeout({
                "MapApp.useEffect.t": async ()=>{
                    try {
                        if (!text.trim()) {
                            setSuggestions([]);
                            setOpen(false);
                            return;
                        }
                        const raw = await fetchSuggest(text.trim());
                        const ranked = raw.map({
                            "MapApp.useEffect.t.ranked": (s)=>({
                                    ...s,
                                    _score: scoreSimilarity(text, s.label)
                                })
                        }["MapApp.useEffect.t.ranked"]).sort({
                            "MapApp.useEffect.t.ranked": (a, b)=>b._score - a._score
                        }["MapApp.useEffect.t.ranked"]).slice(0, 4).map({
                            "MapApp.useEffect.t.ranked": ({ _score, ...s })=>s
                        }["MapApp.useEffect.t.ranked"]);
                        if (alive) {
                            setSuggestions(ranked);
                            setOpen(true);
                        }
                    } catch  {
                        if (alive) {
                            setSuggestions([]);
                            setOpen(false);
                        }
                    }
                }
            }["MapApp.useEffect.t"], 120);
            return ({
                "MapApp.useEffect": ()=>{
                    alive = false;
                    clearTimeout(t);
                }
            })["MapApp.useEffect"];
        }
    }["MapApp.useEffect"], [
        text
    ]);
    /* Map init (Positron) */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MapApp.useEffect": ()=>{
            if (mapRef.current || !mapContainer.current) return;
            const map = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].Map({
                container: mapContainer.current,
                style: {
                    version: 8,
                    sources: {
                        positron: {
                            type: "raster",
                            tiles: [
                                "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
                            ],
                            tileSize: 256,
                            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> ' + '&copy; <a href="https://carto.com/attributions">CARTO</a>'
                        }
                    },
                    layers: [
                        {
                            id: "positron",
                            type: "raster",
                            source: "positron"
                        }
                    ]
                },
                center: [
                    144.9631,
                    -37.8136
                ],
                zoom: 10,
                attributionControl: true
            });
            map.addControl(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].NavigationControl({
                visualizePitch: true
            }), "top-right");
            map.on("load", {
                "MapApp.useEffect": ()=>{
                    mapReady.current = true;
                    map.resize();
                }
            }["MapApp.useEffect"]);
            const onResize = {
                "MapApp.useEffect.onResize": ()=>map.resize()
            }["MapApp.useEffect.onResize"];
            window.addEventListener("resize", onResize);
            mapRef.current = map;
            return ({
                "MapApp.useEffect": ()=>{
                    window.removeEventListener("resize", onResize);
                    map.remove();
                    mapRef.current = null;
                    mapReady.current = false;
                }
            })["MapApp.useEffect"];
        }
    }["MapApp.useEffect"], []);
    /* Draw / update layers per dataset */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MapApp.useEffect": ()=>{
            const map = mapRef.current;
            if (!map || !mapReady.current) return;
            const boxes = [];
            for (const s of sections){
                const fc = s._fc;
                if (!fc) continue;
                const src = `sec-${s.id}`;
                const existing = map.getSource(src);
                if (existing) existing.setData(fc);
                else map.addSource(src, {
                    type: "geojson",
                    data: fc
                });
                const fillId = `sec-${s.id}-fill`;
                const lineId = `sec-${s.id}-line`;
                const ptId = `sec-${s.id}-point`;
                const safeRemove = {
                    "MapApp.useEffect.safeRemove": (id)=>{
                        if (map.getLayer(id)) map.removeLayer(id);
                    }
                }["MapApp.useEffect.safeRemove"];
                if (s.dataset === "planning_zones" || s.dataset === "sa2" || s.dataset === "dwell_struct") {
                    safeRemove(ptId);
                    if (!map.getLayer(fillId)) {
                        map.addLayer({
                            id: fillId,
                            type: "fill",
                            source: src,
                            paint: {
                                "fill-color": "#3b82f6",
                                "fill-opacity": 0.35
                            }
                        }, "positron");
                    }
                    if (!map.getLayer(lineId)) {
                        map.addLayer({
                            id: lineId,
                            type: "line",
                            source: src,
                            paint: {
                                "line-color": "#1f2937",
                                "line-width": 1.2
                            }
                        });
                    }
                } else if (s.dataset === "pois") {
                    safeRemove(fillId);
                    safeRemove(lineId);
                    if (!map.getLayer(ptId)) {
                        map.addLayer({
                            id: ptId,
                            type: "circle",
                            source: src,
                            paint: {
                                "circle-radius": 5,
                                "circle-color": "#111827"
                            }
                        });
                    }
                }
                const box = bboxOf(fc);
                if (box) boxes.push(box);
            }
            if (boxes.length) {
                const union = boxes.reduce({
                    "MapApp.useEffect.union": (a, b)=>[
                            Math.min(a[0], b[0]),
                            Math.min(a[1], b[1]),
                            Math.max(a[2], b[2]),
                            Math.max(a[3], b[3])
                        ]
                }["MapApp.useEffect.union"], [
                    Infinity,
                    Infinity,
                    -Infinity,
                    -Infinity
                ]);
                map.fitBounds([
                    [
                        union[0],
                        union[1]
                    ],
                    [
                        union[2],
                        union[3]
                    ]
                ], {
                    padding: 40,
                    maxZoom: 12
                });
            }
        }
    }["MapApp.useEffect"], [
        sections
    ]);
    /* Add a new empty dataset section (limited to 4) */ function addDatasetSection() {
        if (sections.length >= 4) return;
        const id = Math.random().toString(36).slice(2, 9);
        const sec = {
            id,
            status: "input",
            filters: [],
            options: {}
        };
        setSections((prev)=>[
                sec,
                ...prev
            ]);
        setIsEditing(true);
        setAppStarted(true);
    }
    /* Choose suggestion → apply to latest input dataset (or create one) */ function onChoose(s) {
        // first selection starts the app
        if (!appStarted) {
            setAppStarted(true);
            setIsEditing(true);
        }
        // close dropdown immediately & clear input
        setOpen(false);
        setSuggestions([]);
        setText("");
        if (inputRef.current) inputRef.current.blur();
        if (sections.length === 0 || !sections[0] || sections[0].status !== "input") addDatasetSection();
        setSections((prev)=>{
            const [head, ...tail] = prev;
            const next = {
                ...head
            };
            if (s.key === "planning_zones") {
                next.dataset = "planning_zones";
                next.intent = "data";
                next.options = {
                    zoneCode: "All"
                };
            } else if (s.key === "pois") {
                next.dataset = "pois";
                next.intent = "places";
                next.options = {
                    poiType: "All"
                };
            } else if (s.key === "sa2") {
                next.dataset = "sa2";
                next.intent = "areas";
            } else if (s.key === "dwell_struct") {
                next.dataset = "dwell_struct";
                next.intent = "data";
                next.options = {
                    year: 2021,
                    category: "Separate_house"
                };
            }
            next.status = "input";
            return [
                next,
                ...tail
            ];
        });
    }
    /* Dataset option handlers */ function onZoneChange(idx, val) {
        setSections((prev)=>prev.map((s, i)=>{
                if (i !== idx) return s;
                const filters = s.filters.filter((f)=>f.field !== "ZONE_CODE");
                if (val && val !== "All") filters.push({
                    field: "ZONE_CODE",
                    op: "=",
                    value: val
                });
                return {
                    ...s,
                    filters,
                    options: {
                        ...s.options,
                        zoneCode: val
                    }
                };
            }));
    }
    function onPoiTypeChange(idx, val) {
        setSections((prev)=>prev.map((s, i)=>{
                if (i !== idx) return s;
                const filters = s.filters.filter((f)=>f.field !== "FTYPE");
                if (val && val !== "All") filters.push({
                    field: "FTYPE",
                    op: "=",
                    value: val
                });
                return {
                    ...s,
                    filters,
                    options: {
                        ...s.options,
                        poiType: val
                    }
                };
            }));
    }
    /* Switch dataset via pill dropdown */ function switchDataset(idx, key) {
        setSections((prev)=>prev.map((s, i)=>{
                if (i !== idx) return s;
                const base = {
                    ...s,
                    dataset: key,
                    filters: [],
                    _fc: undefined,
                    status: "input"
                };
                if (key === "planning_zones") base.options = {
                    zoneCode: "All"
                };
                else if (key === "pois") base.options = {
                    poiType: "All"
                };
                else if (key === "dwell_struct") base.options = {
                    year: 2021,
                    category: "Separate_house"
                };
                else base.options = {};
                return base;
            }));
        setIsEditing(true);
        setAppStarted(true);
    }
    /* Delete dataset tab */ function deleteSection(idx) {
        setSections((prev)=>prev.filter((_, i)=>i !== idx));
    }
    /* Global Done → verify location + all datasets with minimum requirements */ function onDone() {
        const locOk = location.mode === "address" || location.mode === "area" || location.mode === "within";
        setLocation((prev)=>({
                ...prev,
                status: locOk ? "verified" : "input"
            }));
        setSections((prev)=>prev.map((s)=>({
                    ...s,
                    status: s.dataset ? "verified" : "input"
                })));
        const willBeAllVerified = sections.length > 0 && sections.every((s)=>!!s.dataset);
        if (locOk && willBeAllVerified) setIsEditing(false);
    }
    function onEdit() {
        setIsEditing(true);
    }
    /* Show Data: fetch ALL verified datasets */ async function onShowData() {
        const ready = sections.filter((s)=>s.status === "verified" && s.dataset);
        if (ready.length === 0 || location.status !== "verified") return;
        setSections((prev)=>prev.map((s)=>({
                    ...s,
                    status: s.status === "verified" ? "searching" : s.status
                })));
        try {
            const results = {};
            for (const s of ready){
                const q = {
                    dataset: s.dataset,
                    filters: s.filters
                };
                if (s.dataset === "dwell_struct") {
                    q.time = s.options?.year ?? 2021;
                    q.category = s.options?.category ?? "Separate_house";
                }
                const fc = await fetchGeoJSON(q);
                results[s.id] = fc;
            }
            setSections((prev)=>prev.map((s)=>({
                        ...s,
                        _fc: results[s.id] ?? s._fc
                    })));
            setPanelOpen(false); // collapse to summary
        } finally{
            setSections((prev)=>prev.map((s)=>({
                        ...s,
                        status: s.status === "searching" ? "verified" : s.status
                    })));
        }
    }
    /* Suggest open/close */ const onBlurClose = ()=>setTimeout(()=>setOpen(false), 110);
    const onFocusOpen = ()=>{
        if (text.trim() && panelOpen) setOpen(true);
    };
    /* Dataset chooser pill (dropdown) */ function DatasetChooser({ idx, current }) {
        _s();
        const [show, setShow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
        const items = [
            {
                key: "planning_zones",
                label: "Planning Zones"
            },
            {
                key: "pois",
                label: "POIs"
            },
            {
                key: "sa2",
                label: "SA2 Boundaries"
            },
            {
                key: "dwell_struct",
                label: "Dwelling Structure"
            }
        ];
        const currentLabel = items.find((i)=>i.key === current)?.label || "Choose Dataset";
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "relative inline-block",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                    active: true,
                    className: "border-[var(--clr-primary)] text-[var(--clr-primary)]",
                    onClick: ()=>setShow((s)=>!s),
                    children: currentLabel
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 417,
                    columnNumber: 9
                }, this),
                show && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute z-30 mt-2 bg-white border rounded-xl shadow-xl min-w-[220px] p-1",
                    children: items.map((it)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: `w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 ${it.key === current ? "bg-gray-100" : ""}`,
                            onClick: ()=>{
                                switchDataset(idx, it.key);
                                setShow(false);
                            },
                            children: it.label
                        }, it.key, false, {
                            fileName: "[project]/frontend/src/components/MapApp.tsx",
                            lineNumber: 423,
                            columnNumber: 15
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 421,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/frontend/src/components/MapApp.tsx",
            lineNumber: 416,
            columnNumber: 7
        }, this);
    }
    _s(DatasetChooser, "NKb1ZOdhT+qUsWLXSgjSS2bk2C4=");
    /* Header title: “Search” while typing; otherwise “Showing” after first selection */ const headerTitle = appStarted && text.trim() === "" ? "Showing" : "Search";
    /* Search row (welcome + edit) */ const SearchRow = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                ref: inputRef,
                value: text,
                onChange: (e)=>setText(e.target.value),
                placeholder: "Search datasets, places, or areas…",
                className: "w-full border rounded-xl px-4 py-3 outline-none shadow-sm bg-white",
                onFocus: onFocusOpen,
                onBlur: onBlurClose
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapApp.tsx",
                lineNumber: 441,
                columnNumber: 7
            }, this),
            open && suggestions.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute z-20 left-0 right-0 top-full mt-2 bg-white border rounded-xl shadow-xl max-h-64 overflow-auto",
                children: suggestions.map((s, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-left",
                        onMouseDown: (e)=>e.preventDefault(),
                        onClick: ()=>onChoose(s),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(TagPill, {
                                tag: s.tag
                            }, void 0, false, {
                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                lineNumber: 458,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "truncate",
                                children: s.label
                            }, void 0, false, {
                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                lineNumber: 459,
                                columnNumber: 15
                            }, this)
                        ]
                    }, s.key + i, true, {
                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                        lineNumber: 453,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapApp.tsx",
                lineNumber: 451,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 440,
        columnNumber: 5
    }, this);
    /* Summary sentence when panel collapsed */ const SummaryBar = !panelOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "absolute left-1/2 -translate-x-1/2",
        style: {
            top: 20,
            width: "min(940px, 88vw)"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "px-4 py-2 bg-white/95 border rounded-full shadow flex items-center gap-2 justify-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "opacity-80",
                    children: "Showing:"
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 471,
                    columnNumber: 9
                }, this),
                sections.map((s)=>{
                    const parts = [];
                    if (s.dataset === "planning_zones") {
                        parts.push("Planning zones");
                        if (s.options?.zoneCode && s.options.zoneCode !== "All") parts.push(`zone ${s.options.zoneCode}`);
                    } else if (s.dataset === "pois") {
                        parts.push("POIs");
                        if (s.options?.poiType && s.options.poiType !== "All") parts.push(s.options.poiType);
                    } else if (s.dataset === "sa2") {
                        parts.push("SA2 boundaries");
                    } else if (s.dataset === "dwell_struct") {
                        parts.push("Dwelling structure");
                        if (s.options?.category) parts.push(s.options.category.replaceAll("_", " "));
                        if (s.options?.year) parts.push(String(s.options.year));
                    }
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                        active: true,
                        children: parts.join(", ") || "Dataset"
                    }, s.id, false, {
                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                        lineNumber: 487,
                        columnNumber: 18
                    }, this);
                }),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "opacity-80",
                    children: "for Location:"
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 489,
                    columnNumber: 9
                }, this),
                location.mode === "address" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                    active: true,
                    children: "Address"
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 490,
                    columnNumber: 39
                }, this),
                location.mode === "area" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                    active: true,
                    children: "Area"
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 491,
                    columnNumber: 36
                }, this),
                location.mode === "within" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                            active: true,
                            children: "within"
                        }, void 0, false, {
                            fileName: "[project]/frontend/src/components/MapApp.tsx",
                            lineNumber: 494,
                            columnNumber: 13
                        }, this),
                        location.within?.distance_m && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                            active: true,
                            children: [
                                location.within.distance_m,
                                " m"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/frontend/src/components/MapApp.tsx",
                            lineNumber: 495,
                            columnNumber: 45
                        }, this),
                        location.within?.place_type && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                            active: true,
                            children: location.within.place_type
                        }, void 0, false, {
                            fileName: "[project]/frontend/src/components/MapApp.tsx",
                            lineNumber: 496,
                            columnNumber: 45
                        }, this)
                    ]
                }, void 0, true),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                    className: "border-[var(--clr-primary)] text-[var(--clr-primary)]",
                    onClick: ()=>{
                        setPanelOpen(true);
                        setIsEditing(true);
                    },
                    children: "Edit Search"
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 499,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/frontend/src/components/MapApp.tsx",
            lineNumber: 470,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 469,
        columnNumber: 5
    }, this) : null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-full h-screen relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: mapContainer,
                className: "absolute inset-0",
                style: {
                    minHeight: "100vh"
                }
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapApp.tsx",
                lineNumber: 509,
                columnNumber: 7
            }, this),
            SummaryBar,
            panelOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute left-1/2 -translate-x-1/2",
                style: {
                    top: "15vh",
                    width: "min(940px, 88vw)"
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white/92 backdrop-blur-sm border rounded-2xl shadow-lg p-4",
                    children: [
                        !appStarted && SearchRow,
                        appStarted && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between mb-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-lg font-semibold",
                                            children: headerTitle
                                        }, void 0, false, {
                                            fileName: "[project]/frontend/src/components/MapApp.tsx",
                                            lineNumber: 525,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    className: `px-3 py-1.5 rounded-lg border ${isEditing ? "text-white" : ""}`,
                                                    style: {
                                                        background: isEditing ? "var(--clr-primary)" : "white"
                                                    },
                                                    onClick: ()=>isEditing ? onDone() : onEdit(),
                                                    children: isEditing ? "Done" : "Edit"
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                    lineNumber: 527,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    disabled: !canShowData,
                                                    onClick: onShowData,
                                                    className: `px-4 py-2 rounded-lg text-white ${canShowData ? "btn-accent hover:opacity-95" : "bg-gray-300"}`,
                                                    children: "Show Data"
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                    lineNumber: 534,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/frontend/src/components/MapApp.tsx",
                                            lineNumber: 526,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                                    lineNumber: 524,
                                    columnNumber: 17
                                }, this),
                                isEditing && SearchRow,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-3 space-y-3",
                                    children: sections.map((s, idx)=>{
                                        const zoneChoices = [
                                            "All",
                                            "GRZ",
                                            "NRZ",
                                            "RGZ",
                                            "MUZ"
                                        ];
                                        const poiChoices = [
                                            "All",
                                            "School",
                                            "Train Station",
                                            "Hospital",
                                            "Supermarket"
                                        ];
                                        const editingThis = isEditing;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: `p-3 border rounded-xl space-y-2 ${editingThis ? "" : "bg-gray-50"}`,
                                            style: editingThis ? {
                                                background: "rgba(232,96,23,0.25)"
                                            } : undefined,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-sm flex items-center gap-2 flex-wrap",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "opacity-80",
                                                                children: "Showing:"
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 562,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DatasetChooser, {
                                                                idx: idx,
                                                                current: s.dataset
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 565,
                                                                columnNumber: 29
                                                            }, this),
                                                            s.dataset === "planning_zones" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DropdownPill, {
                                                                label: "Zone",
                                                                value: s.options?.zoneCode ?? "All",
                                                                items: zoneChoices,
                                                                onSelect: (v)=>onZoneChange(idx, v)
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 569,
                                                                columnNumber: 31
                                                            }, this),
                                                            s.dataset === "pois" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DropdownPill, {
                                                                label: "Type",
                                                                value: s.options?.poiType ?? "All",
                                                                items: poiChoices,
                                                                onSelect: (v)=>onPoiTypeChange(idx, v)
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 577,
                                                                columnNumber: 31
                                                            }, this),
                                                            s.dataset === "sa2" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                                                                active: true,
                                                                children: "SA2 boundaries"
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 584,
                                                                columnNumber: 51
                                                            }, this),
                                                            s.dataset === "dwell_struct" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DropdownPill, {
                                                                        label: "Year",
                                                                        value: String(s.options?.year ?? 2021),
                                                                        items: [
                                                                            "2011",
                                                                            "2016",
                                                                            "2021"
                                                                        ],
                                                                        onSelect: (v)=>setSections((prev)=>prev.map((x, i)=>i !== idx ? x : {
                                                                                        ...x,
                                                                                        options: {
                                                                                            ...x.options,
                                                                                            year: Number(v)
                                                                                        }
                                                                                    }))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                        lineNumber: 587,
                                                                        columnNumber: 33
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DropdownPill, {
                                                                        label: "Category",
                                                                        value: s.options?.category ?? "Separate_house",
                                                                        items: [
                                                                            "Separate_house",
                                                                            "Semi_detached",
                                                                            "Flat_or_apartment",
                                                                            "Other_dwelling",
                                                                            "Not_stated"
                                                                        ],
                                                                        onSelect: (v)=>setSections((prev)=>prev.map((x, i)=>i !== idx ? x : {
                                                                                        ...x,
                                                                                        options: {
                                                                                            ...x.options,
                                                                                            category: v
                                                                                        }
                                                                                    }))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                        lineNumber: 593,
                                                                        columnNumber: 33
                                                                    }, this)
                                                                ]
                                                            }, void 0, true)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                        lineNumber: 561,
                                                        columnNumber: 27
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StatusDot, {
                                                                status: s.status
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 604,
                                                                columnNumber: 29
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                "aria-label": "Delete",
                                                                title: "Delete",
                                                                className: "w-6 h-6 rounded hover:bg-gray-100 text-gray-700 flex items-center justify-center",
                                                                onClick: ()=>deleteSection(idx),
                                                                disabled: !isEditing,
                                                                children: "×"
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 605,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                        lineNumber: 603,
                                                        columnNumber: 27
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                lineNumber: 560,
                                                columnNumber: 25
                                            }, this)
                                        }, s.id, false, {
                                            fileName: "[project]/frontend/src/components/MapApp.tsx",
                                            lineNumber: 555,
                                            columnNumber: 23
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                                    lineNumber: 548,
                                    columnNumber: 17
                                }, this),
                                isEditing && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-3",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        disabled: sections.length >= 4,
                                        className: `w-full py-3 border rounded-xl text-sm ${sections.length >= 4 ? "text-gray-400 bg-gray-100 cursor-not-allowed" : "text-gray-600 hover:bg-gray-50"}`,
                                        onClick: addDatasetSection,
                                        children: sections.length >= 4 ? "Limit Reached" : "+ Add dataset"
                                    }, void 0, false, {
                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                        lineNumber: 624,
                                        columnNumber: 21
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                                    lineNumber: 623,
                                    columnNumber: 19
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-3 p-3 border rounded-xl",
                                    style: {
                                        background: "rgba(14,26,117,0.30)"
                                    },
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-between gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-sm flex items-center gap-2 flex-wrap",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "opacity-90",
                                                        children: "For Location:"
                                                    }, void 0, false, {
                                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                        lineNumber: 641,
                                                        columnNumber: 23
                                                    }, this),
                                                    isEditing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                                                                active: location.mode === "address",
                                                                onClick: ()=>setLocation((l)=>({
                                                                            ...l,
                                                                            mode: "address",
                                                                            status: "input"
                                                                        })),
                                                                children: "Address"
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 644,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                                                                active: location.mode === "area",
                                                                onClick: ()=>setLocation((l)=>({
                                                                            ...l,
                                                                            mode: "area",
                                                                            status: "input"
                                                                        })),
                                                                children: "Area"
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 645,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                                                                active: location.mode === "within",
                                                                onClick: ()=>setLocation((l)=>({
                                                                            ...l,
                                                                            mode: "within",
                                                                            status: "input"
                                                                        })),
                                                                children: "within"
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 646,
                                                                columnNumber: 27
                                                            }, this),
                                                            location.mode === "address" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                className: "text-sm border rounded px-2 py-1 bg-white",
                                                                placeholder: "Type an address (stub)"
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 648,
                                                                columnNumber: 29
                                                            }, this),
                                                            location.mode === "area" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                className: "text-sm border rounded px-2 py-1 bg-white",
                                                                placeholder: "Type an area (SA2/LGA) (stub)"
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 651,
                                                                columnNumber: 29
                                                            }, this),
                                                            location.mode === "within" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex items-center gap-2",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DropdownPill, {
                                                                        label: "within",
                                                                        value: String(location.within?.distance_m ?? 500) + " m",
                                                                        items: [
                                                                            "250 m",
                                                                            "500 m",
                                                                            "1000 m",
                                                                            "2000 m"
                                                                        ],
                                                                        onSelect: (v)=>{
                                                                            const dist = Number(v.split(" ")[0]);
                                                                            setLocation((l)=>({
                                                                                    ...l,
                                                                                    within: {
                                                                                        distance_m: dist,
                                                                                        place_type: l.within?.place_type ?? "Any place"
                                                                                    },
                                                                                    status: "input"
                                                                                }));
                                                                        }
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                        lineNumber: 655,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DropdownPill, {
                                                                        value: location.within?.place_type ?? "Any place",
                                                                        items: [
                                                                            "Any place",
                                                                            "School",
                                                                            "Train Station",
                                                                            "Hospital",
                                                                            "Supermarket"
                                                                        ],
                                                                        onSelect: (v)=>{
                                                                            setLocation((l)=>({
                                                                                    ...l,
                                                                                    within: {
                                                                                        distance_m: l.within?.distance_m ?? 500,
                                                                                        place_type: v
                                                                                    },
                                                                                    status: "input"
                                                                                }));
                                                                        }
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                        lineNumber: 664,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 654,
                                                                columnNumber: 29
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                        lineNumber: 643,
                                                        columnNumber: 25
                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-2",
                                                        children: [
                                                            location.mode === "address" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                                                                active: true,
                                                                children: "Address"
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 676,
                                                                columnNumber: 57
                                                            }, this),
                                                            location.mode === "area" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                                                                active: true,
                                                                children: "Area"
                                                            }, void 0, false, {
                                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                lineNumber: 677,
                                                                columnNumber: 54
                                                            }, this),
                                                            location.mode === "within" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                                                                        active: true,
                                                                        children: "within"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                        lineNumber: 680,
                                                                        columnNumber: 31
                                                                    }, this),
                                                                    location.within?.distance_m && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                                                                        active: true,
                                                                        children: [
                                                                            location.within.distance_m,
                                                                            " m"
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                        lineNumber: 681,
                                                                        columnNumber: 63
                                                                    }, this),
                                                                    location.within?.place_type && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                                                                        active: true,
                                                                        children: location.within.place_type
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                                        lineNumber: 682,
                                                                        columnNumber: 63
                                                                    }, this)
                                                                ]
                                                            }, void 0, true)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                        lineNumber: 675,
                                                        columnNumber: 25
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                lineNumber: 640,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StatusDot, {
                                                    status: location.status
                                                }, void 0, false, {
                                                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                    lineNumber: 689,
                                                    columnNumber: 23
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                lineNumber: 688,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                        lineNumber: 639,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                                    lineNumber: 635,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true)
                    ]
                }, void 0, true, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 517,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapApp.tsx",
                lineNumber: 516,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 507,
        columnNumber: 5
    }, this);
}
_s1(MapApp, "pFeKbqyBsu664rp7OHU8qOV9+e8=");
_c4 = MapApp;
var _c, _c1, _c2, _c3, _c4;
__turbopack_context__.k.register(_c, "TagPill");
__turbopack_context__.k.register(_c1, "Pill");
__turbopack_context__.k.register(_c2, "DropdownPill");
__turbopack_context__.k.register(_c3, "StatusDot");
__turbopack_context__.k.register(_c4, "MapApp");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/frontend/src/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Page
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$components$2f$MapApp$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/src/components/MapApp.tsx [app-client] (ecmascript)");
'use client';
;
;
function Page() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$components$2f$MapApp$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
        fileName: "[project]/frontend/src/app/page.tsx",
        lineNumber: 6,
        columnNumber: 10
    }, this);
}
_c = Page;
var _c;
__turbopack_context__.k.register(_c, "Page");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=frontend_src_c8f9bd2d._.js.map