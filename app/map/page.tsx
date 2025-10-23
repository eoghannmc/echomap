"use client";
// app/map/page.tsx

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import Toolbar from "@/components/Toolbar";
import { DataDrawer, ExportModal, InputModal, LayersPanel } from "@/components/Panels";

type Panel = null | "layers" | "export" | "data" | "input";

export  function MapPage() {
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [loading, setLoading] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);

  // dim map when any panel is open
  const dimClass = useMemo(
    () => (activePanel ? "brightness-75 pointer-events-none" : ""),
    [activePanel]
  );

  // simulate a short "loading" when page first mounts (for testing overlay)
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="min-h-dvh">
      {/* Auto-hiding header on the map page */}
      <Header autohide onVisibleChange={setHeaderVisible} />

      <div
       className={`fixed left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
        headerVisible
        ? "opacity-100 translate-y-[72px]" // visible and offset below header
        : "opacity-0 -translate-y-10 pointer-events-none" // hide with header
        // 
        }`}
>
  <SearchBar />
</div>

      {/* Right toolbar */}
      <Toolbar onOpen={(p) => setActivePanel(p)} />

      {/* Panels/Modals */}
      <LayersPanel active={activePanel} onClose={() => setActivePanel(null)} />
      <DataDrawer active={activePanel} onClose={() => setActivePanel(null)} />
      <ExportModal active={activePanel} onClose={() => setActivePanel(null)} />
      <InputModal active={activePanel} onClose={() =>setActivePanel(null)}/>

      {/* Map placeholder area */}
      <section className={`w-full h-[100dvh] ${dimClass}`}>
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(45deg, rgba(0,0,0,.05) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,.05) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,.05) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.05) 75%)",
            backgroundSize: "40px 40px",
            backgroundPosition: "0 0, 0 20px, 20px -20px, -20px 0px",
          }}
        >
          <div className="absolute inset-0 grid place-items-center pointer-events-none select-none">
            <div className="rounded-2xl bg-white/70 dark:bg-panel/70 px-4 py-2 shadow-card text-sm">
              Map area (placeholder)
            </div>
          </div>
        </div>
      </section>

      {/* Bottom-right map controls */}
      <div className="fixed bottom-4 right-4 z-40 grid grid-cols-2 gap-2">
        <button className="w-12 h-12 rounded-2xl bg-panel text-textOnDark shadow-card">−</button>
        <button className="w-12 h-12 rounded-2xl bg-panel text-textOnDark shadow-card">+</button>
        <button className="col-span-2 rounded-2xl bg-panel text-textOnDark shadow-card px-3 py-2 text-sm">
          Scale 1:17,500
        </button>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm">
          <div className="rounded-2xl bg-panel text-textOnDark shadow-card px-4 py-3 text-sm">
            Loading…
          </div>
        </div>
      )}
    </main>
  );
}
