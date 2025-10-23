"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Mode = "PROPERTY" | "AREA" | "MULTI";

const MODE_HELP: Record<Mode, string> = {
  PROPERTY: "Search an address or property (geocode).",
  AREA: "Search by SA2 / LGA or custom area.",
  MULTI: "Search multiple places at once.",
};

const LAYER_GROUPS = [
  {
    name: "Planning",
    items: [
      { id: "zoning", label: "Zoning", defaultOn: true, desc: "Land-use categories" },
      { id: "overlays", label: "Overlays", defaultOn: false, desc: "Heritage, flood, etc." },
    ],
  },
  {
    name: "SCOAIL",
    items: [
      { id: "schools", label: "Schools", defaultOn: false, desc: "Education facilities" },
      { id: "health", label: "General Health", defaultOn: false, desc: "Clinics & hospitals" },
    ],
  },
];

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>("PROPERTY");
  const [layers, setLayers] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    LAYER_GROUPS.forEach(g => g.items.forEach(i => (init[i.id] = !!i.defaultOn)));
    return init;
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => setExpanded(true);
  const close = () => setExpanded(false);

  // Collapse on click outside (only if empty)
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      const target = e.target as Node;
      if (!rootRef.current.contains(target) && q.trim() === "") close();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [q]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && q.trim() === "") {
      close();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Enter") handleSearch();
  }

  function toggleLayer(id: string) {
    setLayers(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSearch() {
    if (!q.trim()) return;
    alert(
      `Searching: "${q}"\nMode: ${mode}\nLayers: ${
        Object.entries(layers)
          .filter(([, on]) => on)
          .map(([k]) => k)
          .join(", ") || "none"
      }`
    );
  }

  return (
    <div ref={rootRef} className="w-full max-w-2xl mx-auto" aria-expanded={expanded}>
      {/* Input row */}
      <div className="flex items-center gap-2 rounded-2xl shadow-card px-3 py-2 bg-white/90 dark:bg-panel/90 welcome-search">
        <input
          ref={inputRef}
          id="welcomeInput"
          type="text"
          placeholder="Start typing"
          className="flex-1 bg-transparent outline-none text-neutral-800 dark:text-[--color-textOnDark] placeholder:text-neutral-500 px-2"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.trim() !== "") open();
          }}
          onFocus={open}
          onKeyDown={onKeyDown}
          aria-label="Search"
          autoComplete="off"
        />

        {/* PNG icon button */}
        <button
          id="welcomeGo"
          className="icon-btn px-3 py-2 rounded-xl bg-brand text-white hover:opacity-90 transition-all flex items-center justify-center"
          onClick={handleSearch}
          disabled={!q.trim()}
          aria-disabled={!q.trim()}
          title={!q.trim() ? "Type something to search" : "Run search"}
        >
          <Image
            src="/icons/EchoLogoWhite.png"  // file in /public/icons/
            alt="Search"
            width={18}
            height={18}
            className="icon-img"
            priority
          />
        </button>
      </div>

      {/* Expanded area */}
      {(expanded || q.trim() !== "") && (
        <div className="mt-2 space-y-2">
          {/* Mode tabs */}
          <div className="rounded-2xl shadow-card bg-white/90 dark:bg-panel/90 px-2 py-2">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 text-sm">
                {(["PROPERTY", "REGION", "MULTI"] as Mode[]).map((m) => {
                  const active = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={[
                        "px-3 py-1 rounded-xl transition-all",
                        active
                          ? "bg-brand text-white"
                          : "bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 hover:opacity-90",
                      ].join(" ")}
                      title={MODE_HELP[m]}
                      aria-pressed={active}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
              <div className="text-xs opacity-70 px-2" aria-live="polite">
                {MODE_HELP[mode]}
              </div>
            </div>
          </div>

          {/* Layer checklist */}
          <div className="rounded-2xl shadow-card bg-white/90 dark:bg-panel/90 p-3">
            <div className="text-xs uppercase tracking-wide opacity-70 mb-2">Layers</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6">
              {LAYER_GROUPS.map((g) => (
                <div key={g.name}>
                  <div className="text-[13px] font-semibold opacity-80 mb-1">{g.name}</div>
                  <div className="space-y-1">
                    {g.items.map((i) => {
                      const on = layers[i.id];
                      return (
                        <label
                          key={i.id}
                          className={[
                            "flex items-center gap-2 rounded-xl px-2 py-1 cursor-pointer transition",
                            on ? "text-foreground" : "opacity-60",
                            "hover:bg-black/5 dark:hover:bg-white/10",
                          ].join(" ")}
                          title={i.desc}
                        >
                          <input
                            type="checkbox"
                            checked={!!on}
                            onChange={() => toggleLayer(i.id)}
                            className="accent-brand"
                            aria-checked={!!on}
                          />
                          <span>{i.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Apply / Cancel row */}
            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                className="px-3 py-1 rounded-xl bg-black/5 dark:bg-white/10 hover:opacity-90 transition"
                onClick={() => {
                  if (q.trim() === "") close();
                }}
                title={q.trim() ? "Keep open (query filled)" : "Close panel"}
              >
                Close
              </button>
              <button
                className="px-3 py-1 rounded-xl bg-accent text-white hover:bg-accent/85 transition"
                onClick={handleSearch}
              >
                Apply & Search
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
