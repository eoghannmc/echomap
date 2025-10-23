module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/frontend/src/lib/suggest.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fetchAddressOnly",
    ()=>fetchAddressOnly,
    "fetchMergedSuggestions",
    ()=>fetchMergedSuggestions
]);
const API = process.env.NEXT_PUBLIC_API_BASE || "";
// Keep one controller per call-site to cancel stale requests
let ctrlMain = null;
let ctrlLoc = null;
async function fetchMergedSuggestions(q) {
    if (ctrlMain) ctrlMain.abort();
    ctrlMain = new AbortController();
    const signal = ctrlMain.signal;
    const wantAddr = q.trim().length >= 3;
    const wantNonAddr = q.trim().length >= 2;
    const [addrRes, genericRes] = await Promise.all([
        wantAddr ? fetch(`${API}/api/address-suggest?q=${encodeURIComponent(q)}`, {
            signal
        }).then((r)=>r.ok ? r.json() : {
                suggestions: []
            }) : Promise.resolve({
            suggestions: []
        }),
        wantNonAddr ? fetch(`${API}/api/suggest?q=${encodeURIComponent(q)}`, {
            signal
        }).then((r)=>r.ok ? r.json() : {
                suggestions: []
            }) : Promise.resolve({
            suggestions: []
        })
    ]);
    const addresses = (addrRes?.suggestions ?? []).slice(0, 3);
    const rest = (genericRes?.suggestions ?? []).filter((s)=>s.tag !== "Address");
    const spaceLeft = Math.max(0, 4 - addresses.length);
    const nonAddrPicks = rest.slice(0, spaceLeft);
    return [
        ...addresses,
        ...nonAddrPicks
    ];
}
async function fetchAddressOnly(q) {
    if (ctrlLoc) ctrlLoc.abort();
    ctrlLoc = new AbortController();
    const signal = ctrlLoc.signal;
    if (q.trim().length < 3) return [];
    const r = await fetch(`${API}/api/address-suggest?q=${encodeURIComponent(q)}`, {
        signal
    });
    const data = r.ok ? await r.json() : {
        suggestions: []
    };
    return (data?.suggestions ?? []).slice(0, 3);
}
}),
"[project]/frontend/src/components/MapApp.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MapApp
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/maplibre-gl/dist/maplibre-gl.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$suggest$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/src/lib/suggest.ts [app-ssr] (ecmascript)");
'use client';
;
;
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `text-xs px-2 py-0.5 rounded-full border border-black/10 ${tagClass[tag]}`,
        children: tag
    }, void 0, false, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 54,
        columnNumber: 10
    }, this);
}
function Pill({ active, children, onClick, className = "" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        onClick: onClick,
        className: `text-xs px-2.5 py-1 rounded-full border transition ${active ? "bg-[var(--clr-bg-light)]" : "bg-white hover:bg-gray-50"} ${className}`,
        children: children
    }, void 0, false, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 69,
        columnNumber: 5
    }, this);
}
function DropdownPill({ label, value, items, onSelect, className = "" }) {
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative inline-block",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                className: `text-xs px-2.5 py-1 rounded-full border bg-white hover:bg-gray-50 flex items-center gap-1 ${className}`,
                onClick: ()=>setOpen((o)=>!o),
                children: [
                    label ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "opacity-70",
                        children: [
                            label,
                            ":"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                        lineNumber: 98,
                        columnNumber: 18
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "font-medium",
                        children: value
                    }, void 0, false, {
                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                        lineNumber: 99,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        width: "10",
                        height: "10",
                        viewBox: "0 0 20 20",
                        className: "opacity-60",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: "M5 7l5 5 5-5",
                            fill: "currentColor"
                        }, void 0, false, {
                            fileName: "[project]/frontend/src/components/MapApp.tsx",
                            lineNumber: 101,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                        lineNumber: 100,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/frontend/src/components/MapApp.tsx",
                lineNumber: 94,
                columnNumber: 7
            }, this),
            open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute z-30 mt-2 bg-white border rounded-xl shadow-xl min-w-[200px] p-1",
                children: items.map((opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: `w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 ${opt === value ? "bg-gray-100" : ""}`,
                        onClick: ()=>{
                            onSelect(opt);
                            setOpen(false);
                        },
                        children: opt
                    }, opt, false, {
                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                        lineNumber: 107,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapApp.tsx",
                lineNumber: 105,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 93,
        columnNumber: 5
    }, this);
}
function StatusDot({ status }) {
    const color = status === "verified" ? "bg-green-500" : status === "searching" ? "bg-blue-500" : status === "error" ? "bg-red-500" : "bg-gray-400";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: `inline-block w-2.5 h-2.5 rounded-full ${color}`,
        title: status
    }, void 0, false, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 126,
        columnNumber: 10
    }, this);
}
/* ===================== Utilities ===================== */ function bboxOf(fc) {
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
function MapApp() {
    /* App start: welcome vs. active */ const [appStarted, setAppStarted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    /* Hide/show panel (summary vs. editor) */ const [panelOpen, setPanelOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    /* Global Edit/Done for entire panel */ const [isEditing, setIsEditing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    /* Only show search bar during edit when actively adding a dataset */ const [addingDataset, setAddingDataset] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    /* Global Location (separate from datasets) */ const [location, setLocation] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        mode: "area",
        status: "input"
    });
    /* Dataset sections (1–4) */ const [sections, setSections] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    /* Searchbar + suggestions (main) */ const [text, setText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [suggestions, setSuggestions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const inputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    /* Location (Address mode) input + suggestions */ const [locAddrText, setLocAddrText] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [locAddrOpen, setLocAddrOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [locAddrSuggestions, setLocAddrSuggestions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const locAddrInputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    /* Derived flags */ const allDatasetsVerified = sections.length > 0 && sections.every((s)=>s.status === "verified");
    const locationVerified = location.status === "verified";
    const canShowData = appStarted && !isEditing && panelOpen && allDatasetsVerified && locationVerified;
    /* Map */ const mapRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const mapReady = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const mapContainer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    /* ===== Suggest (main) – keep open for >=2 chars, addresses join >=3; Abort handled in helper ===== */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let alive = true;
        const t = setTimeout(async ()=>{
            try {
                const q = text.trim();
                if (q.length >= 2 && panelOpen) setOpen(true);
                else {
                    setOpen(false);
                    setSuggestions([]);
                    return;
                }
                const raw = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$suggest$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchMergedSuggestions"])(q);
                if (alive) {
                    setSuggestions(raw);
                    setOpen(q.length >= 2 && raw.length > 0);
                }
            } catch  {
                if (alive) {
                    setSuggestions([]);
                    setOpen(false);
                }
            }
        }, 80);
        return ()=>{
            alive = false;
            clearTimeout(t);
        };
    }, [
        text,
        panelOpen
    ]);
    /* ===== Suggest (Location > Address only) ===== */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let alive = true;
        if (location.mode !== "address" || !isEditing) {
            setLocAddrSuggestions([]);
            setLocAddrOpen(false);
            return;
        }
        const t = setTimeout(async ()=>{
            try {
                const q = locAddrText.trim();
                if (q.length >= 3) setLocAddrOpen(true);
                else {
                    setLocAddrOpen(false);
                    setLocAddrSuggestions([]);
                    return;
                }
                const items = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$lib$2f$suggest$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchAddressOnly"])(q);
                if (alive) {
                    setLocAddrSuggestions(items);
                    setLocAddrOpen(q.length >= 3 && items.length > 0);
                }
            } catch  {
                if (alive) {
                    setLocAddrSuggestions([]);
                    setLocAddrOpen(false);
                }
            }
        }, 100);
        return ()=>{
            alive = false;
            clearTimeout(t);
        };
    }, [
        locAddrText,
        location.mode,
        isEditing
    ]);
    /* Map init (Positron) */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (mapRef.current || !mapContainer.current) return;
        const map = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].Map({
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
            attributionControl: false
        });
        map.addControl(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].NavigationControl({
            visualizePitch: true
        }), "top-right");
        map.addControl(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$maplibre$2d$gl$2f$dist$2f$maplibre$2d$gl$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].AttributionControl({
            compact: true
        }), "bottom-right");
        map.on("load", ()=>{
            mapReady.current = true;
            map.resize();
        });
        const onResize = ()=>map.resize();
        window.addEventListener("resize", onResize);
        mapRef.current = map;
        return ()=>{
            window.removeEventListener("resize", onResize);
            map.remove();
            mapRef.current = null;
            mapReady.current = false;
        };
    }, []);
    /* Draw / update layers per dataset */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
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
            const safeRemove = (id)=>{
                if (map.getLayer(id)) map.removeLayer(id);
            };
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
            const union = boxes.reduce((a, b)=>[
                    Math.min(a[0], b[0]),
                    Math.min(a[1], b[1]),
                    Math.max(a[2], b[2]),
                    Math.max(a[3], b[3])
                ], [
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
    }, [
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
        setAddingDataset(true); // show search bar during edit
    }
    const layerCatalog = [
        {
            id: "planning-fill",
            title: "Planning Zones (fill)",
            group: "Property",
            on: true,
            type: "fill",
            sourceId: "planning"
        },
        {
            id: "planning-line",
            title: "Planning Zones (line)",
            group: "Property",
            on: true,
            type: "line",
            sourceId: "planning"
        },
        {
            id: "pois",
            title: "POIs",
            group: "Infrastructure",
            on: false,
            type: "circle",
            sourceId: "pois"
        },
        {
            id: "sa2-fill",
            title: "SA2 (fill)",
            group: "Areas",
            on: false,
            type: "fill",
            sourceId: "sa2"
        },
        {
            id: "sa2-line",
            title: "SA2 (line)",
            group: "Areas",
            on: false,
            type: "line",
            sourceId: "sa2"
        }
    ];
    const [layerState, setLayerState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(Object.fromEntries(layerCatalog.map((l)=>[
            l.id,
            !!l.on
        ])));
    {
        showLayers && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "fixed top-16 left-4 z-30 w-80 max-h-[70vh] overflow-auto bg-white/95 border rounded-2xl shadow p-3",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-sm font-semibold mb-2",
                    children: "Layers"
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 353,
                    columnNumber: 5
                }, this),
                [
                    "Active",
                    "Property",
                    "Social",
                    "Infrastructure",
                    "Areas"
                ].map((g)=>{
                    const items = layerCatalog.filter((l)=>l.group === g);
                    if (!items.length) return null;
                    const active = g === "Active" ? Object.entries(layerState).filter(([id, on])=>on).map(([id])=>layerCatalog.find((l)=>l.id === id)).filter(Boolean) : items;
                    if (!active.length) return null;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-xs uppercase tracking-wide opacity-70 mb-1",
                                children: g
                            }, void 0, false, {
                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                lineNumber: 364,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-1",
                                children: active.map((l)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "flex items-center justify-between gap-2 text-sm bg-white border rounded-lg px-2 py-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: l.title
                                            }, void 0, false, {
                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                lineNumber: 368,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                checked: !!layerState[l.id],
                                                onChange: (e)=>{
                                                    const on = e.target.checked;
                                                    setLayerState((prev)=>({
                                                            ...prev,
                                                            [l.id]: on
                                                        }));
                                                    const map = mapRef.current;
                                                    if (!map) return;
                                                    if (map.getLayer(l.id)) {
                                                        map.setLayoutProperty(l.id, "visibility", on ? "visible" : "none");
                                                    }
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                lineNumber: 369,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, l.id, true, {
                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                        lineNumber: 367,
                                        columnNumber: 15
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                lineNumber: 365,
                                columnNumber: 11
                            }, this)
                        ]
                    }, g, true, {
                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                        lineNumber: 363,
                        columnNumber: 9
                    }, this);
                })
            ]
        }, void 0, true, {
            fileName: "[project]/frontend/src/components/MapApp.tsx",
            lineNumber: 352,
            columnNumber: 3
        }, this);
    }
    /* Choose suggestion → address fills Location; datasets populate first input section */ function onChoose(s) {
        // Address
        if (s.tag === "Address") {
            setAppStarted(true);
            setIsEditing(true);
            setAddingDataset(false); // ← ensure search bar hides
            setLocation({
                mode: "address",
                address: s.label,
                status: "input"
            });
            setLocAddrText(s.label);
            setLocAddrSuggestions([]);
            setOpen(false);
            setSuggestions([]);
            setText("");
            if (inputRef.current) inputRef.current.blur();
            return;
        }
        if (!appStarted) {
            setAppStarted(true);
            setIsEditing(true);
        }
        setAddingDataset(false); // ← ensure search bar hides after dataset pick
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
    /* Done / Edit toggles */ function onDone() {
        // Verify location + datasets minimal requirements
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
        if (locOk && willBeAllVerified) {
            setIsEditing(false);
            setAddingDataset(false); // hide search bar
        }
    }
    function onEdit() {
        setIsEditing(true);
    }
    async function exportPDF() {
        const map = mapRef.current;
        if (!map) return;
        const canvas = map.getCanvas();
        const dataUrl = canvas.toDataURL("image/png");
        const { jsPDF } = await (()=>{
            const e = new Error("Cannot find module 'jspdf'");
            e.code = 'MODULE_NOT_FOUND';
            throw e;
        })();
        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "pt",
            format: "a4"
        });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW - 40, imgH = pageH - 40;
        pdf.addImage(dataUrl, "PNG", 20, 20, imgW, imgH);
        pdf.save("map.pdf");
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
    /* Suggest open/close (main bar) */ const onBlurClose = ()=>setTimeout(()=>setOpen(false), 110);
    const onFocusOpen = ()=>{
        if (text.trim().length >= 2 && panelOpen) setOpen(true);
    };
    const [showLayers, setShowLayers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showInput, setShowInput] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showExport, setShowExport] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showMyData, setShowMyData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showAccount, setShowAccount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const q = (id)=>document.getElementById(id);
        q("btn-layers")?.addEventListener("click", ()=>setShowLayers((v)=>!v));
        q("btn-input")?.addEventListener("click", ()=>setShowInput((v)=>!v));
        q("btn-export")?.addEventListener("click", ()=>setShowExport((v)=>!v));
        q("btn-mydata")?.addEventListener("click", ()=>setShowMyData((v)=>!v));
        q("btn-account")?.addEventListener("click", ()=>setShowAccount((v)=>!v));
        return ()=>{};
    }, []);
    /* Dataset chooser pill (dropdown) */ function DatasetChooser({ idx, current }) {
        const [show, setShow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
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
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "relative inline-block",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                    active: true,
                    className: "border-[var(--clr-primary)] text-[var(--clr-primary)]",
                    onClick: ()=>setShow((s)=>!s),
                    children: currentLabel
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 552,
                    columnNumber: 9
                }, this),
                show && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute z-30 mt-2 bg-white border rounded-xl shadow-xl min-w-[220px] p-1",
                    children: items.map((it)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: `w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 ${it.key === current ? "bg-gray-100" : ""}`,
                            onClick: ()=>{
                                switchDataset(idx, it.key);
                                setShow(false);
                            },
                            children: it.label
                        }, it.key, false, {
                            fileName: "[project]/frontend/src/components/MapApp.tsx",
                            lineNumber: 558,
                            columnNumber: 15
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 556,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/frontend/src/components/MapApp.tsx",
            lineNumber: 551,
            columnNumber: 7
        }, this);
    }
    /* Header title: “Search” while typing; otherwise “Showing” after first selection */ const headerTitle = appStarted && text.trim() === "" ? "Showing" : "Search";
    /* Search row (welcome + when addingDataset) */ const SearchRow = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                ref: inputRef,
                value: text,
                onChange: (e)=>setText(e.target.value),
                placeholder: "Search datasets, places, or areas…",
                className: "w-full border rounded-xl px-4 py-3 outline-none shadow-sm bg-white",
                onFocus: onFocusOpen,
                onBlur: onBlurClose
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapApp.tsx",
                lineNumber: 576,
                columnNumber: 7
            }, this),
            open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute z-40 left-0 right-0 top-full mt-2 bg-white border rounded-xl shadow-xl max-h-64 overflow-auto",
                children: suggestions.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "px-3 py-2 text-sm text-gray-500",
                    children: "Searching…"
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 588,
                    columnNumber: 13
                }, this) : suggestions.map((s, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: "w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-left",
                        onMouseDown: (e)=>e.preventDefault(),
                        onClick: ()=>onChoose(s),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(TagPill, {
                                tag: s.tag
                            }, void 0, false, {
                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                lineNumber: 595,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "truncate",
                                children: s.label
                            }, void 0, false, {
                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                lineNumber: 596,
                                columnNumber: 15
                            }, this)
                        ]
                    }, s.key + i, true, {
                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                        lineNumber: 590,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapApp.tsx",
                lineNumber: 586,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 575,
        columnNumber: 5
    }, this);
    /* Summary sentence when panel collapsed */ const SummaryBar = !panelOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "absolute left-1/2 -translate-x-1/2",
        style: {
            top: 20,
            width: "min(940px, 88vw)"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "px-4 py-2 bg-white/95 border rounded-full shadow flex items-center gap-2 justify-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "opacity-80",
                    children: "Showing:"
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 608,
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
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                        active: true,
                        children: parts.join(", ") || "Dataset"
                    }, s.id, false, {
                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                        lineNumber: 624,
                        columnNumber: 18
                    }, this);
                }),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "opacity-80",
                    children: "for Location:"
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 626,
                    columnNumber: 9
                }, this),
                location.mode === "address" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                    active: true,
                    children: "Address"
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 627,
                    columnNumber: 39
                }, this),
                location.mode === "area" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                    active: true,
                    children: "Area"
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 628,
                    columnNumber: 36
                }, this),
                location.mode === "within" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                            active: true,
                            children: "within"
                        }, void 0, false, {
                            fileName: "[project]/frontend/src/components/MapApp.tsx",
                            lineNumber: 631,
                            columnNumber: 13
                        }, this),
                        location.within?.distance_m && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                            active: true,
                            children: [
                                location.within.distance_m,
                                " m"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/frontend/src/components/MapApp.tsx",
                            lineNumber: 632,
                            columnNumber: 45
                        }, this),
                        location.within?.place_type && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                            active: true,
                            children: location.within.place_type
                        }, void 0, false, {
                            fileName: "[project]/frontend/src/components/MapApp.tsx",
                            lineNumber: 633,
                            columnNumber: 45
                        }, this)
                    ]
                }, void 0, true),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Pill, {
                    className: "border-[var(--clr-primary)] text-[var(--clr-primary)]",
                    onClick: ()=>{
                        setPanelOpen(true);
                        setIsEditing(true);
                    },
                    children: "Edit Search"
                }, void 0, false, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 636,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/frontend/src/components/MapApp.tsx",
            lineNumber: 607,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 606,
        columnNumber: 5
    }, this) : null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-full h-screen relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: mapContainer,
                className: "absolute inset-0",
                style: {
                    minHeight: "100vh"
                }
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapApp.tsx",
                lineNumber: 646,
                columnNumber: 7
            }, this),
            SummaryBar,
            panelOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute left-1/2 -translate-x-1/2",
                style: {
                    top: "15vh",
                    width: "min(940px, 88vw)"
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white/92 backdrop-blur-sm border rounded-2xl shadow-lg p-4",
                    children: [
                        !appStarted && SearchRow,
                        appStarted && isEditing && addingDataset && SearchRow,
                        appStarted && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between mb-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-lg font-semibold",
                                        children: headerTitle
                                    }, void 0, false, {
                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                        lineNumber: 665,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: `px-3 py-1.5 rounded-lg border ${isEditing ? "text-white" : ""}`,
                                                style: {
                                                    background: isEditing ? "var(--clr-primary)" : "white"
                                                },
                                                onClick: ()=>isEditing ? onDone() : onEdit(),
                                                children: isEditing ? "Done" : "Edit"
                                            }, void 0, false, {
                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                lineNumber: 667,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                disabled: !canShowData,
                                                onClick: onShowData,
                                                className: `px-4 py-2 rounded-lg text-white ${canShowData ? "btn-accent hover:opacity-95" : "bg-gray-300"}`,
                                                children: "Show Data"
                                            }, void 0, false, {
                                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                                lineNumber: 674,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/frontend/src/components/MapApp.tsx",
                                        lineNumber: 666,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/frontend/src/components/MapApp.tsx",
                                lineNumber: 664,
                                columnNumber: 11
                            }, this)
                        }, void 0, false)
                    ]
                }, void 0, true, {
                    fileName: "[project]/frontend/src/components/MapApp.tsx",
                    lineNumber: 654,
                    columnNumber: 5
                }, this)
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapApp.tsx",
                lineNumber: 653,
                columnNumber: 3
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/frontend/src/components/MapApp.tsx",
        lineNumber: 644,
        columnNumber: 5
    }, this);
}
}),
"[project]/frontend/src/app/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Page
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$components$2f$MapApp$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/frontend/src/components/MapApp.tsx [app-ssr] (ecmascript)");
'use client';
;
;
function Page() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$frontend$2f$src$2f$components$2f$MapApp$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
        fileName: "[project]/frontend/src/app/page.tsx",
        lineNumber: 6,
        columnNumber: 10
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__63e7539e._.js.map