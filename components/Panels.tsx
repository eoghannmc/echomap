"use client";

type Panel = null | "layers" | "export" | "data" | "input";

export function LayersPanel({
  active,
  onClose,
}: {
  active: Panel;
  onClose: () => void;
}) {
  if (active !== "layers") return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-4 top-28 w-80 bg-panel text-textOnDark rounded-2xl shadow-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Layers</div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Groups (stubs) */}
        <div className="space-y-3">
          <div>
            <div className="opacity-70 mb-1">Planning</div>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="accent-brand" /> Zoning
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-brand" /> Overlays
            </label>
          </div>
          <div>
            <div className="opacity-70 mb-1">Social</div>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-brand" /> Schools
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-brand" /> Health
            </label>
          </div>
        </div>

        <button className="mt-4 w-full bg-accent text-white rounded-xl py-2" onClick={onClose}>
          Apply
        </button>
      </div>
    </div>
  );
}

export function DataDrawer({
  active,
  onClose,
}: {
  active: Panel;
  onClose: () => void;
}) {
  if (active !== "data") return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-50">
      <div className="rounded-2xl bg-panel text-textOnDark shadow-card p-4 max-h-[50dvh] overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Data</div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        {/* Chart placeholders */}
        <div className="space-y-3">
          <div className="h-24 bg-white/10 rounded-xl grid place-items-center">Chart placeholder</div>
          <div className="h-24 bg-white/10 rounded-xl grid place-items-center">Chart placeholder</div>
          <div className="h-24 bg-white/10 rounded-xl grid place-items-center">Chart placeholder</div>
        </div>
      </div>
    </div>
  );
}

export function ExportModal({
  active,
  onClose,
}: {
  active: Panel;
  onClose: () => void;
}) {
  if (active !== "export") return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center">
        <div className="w-[480px] bg-panel text-textOnDark rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Export (coming soon)</div>
            <button onClick={onClose} aria-label="Close">✕</button>
          </div>
          <p className="opacity-80 text-sm">
            This will enable image/PDF exports. For now it’s a placeholder modal.
          </p>
        </div>
      </div>
    </div>
  );
}

export function InputModal({
  active,
  onClose,
}: {
  active: Panel;
  onClose: () => void;
}) {
  if (active !== "input") return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center">
        <div className="w-[480px] bg-panel text-textOnDark rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Input (coming soon)</div>
            <button onClick={onClose} aria-label="Close">✕</button>
          </div>
          <p className="opacity-80 text-sm">
            this is to upload or input data
          </p>
        </div>
      </div>
    </div>
  );
}
