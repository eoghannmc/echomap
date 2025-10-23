"use client";

type Panel = null | "layers" | "export" | "data";

export default function Toolbar({
  onOpen,
}: {
  onOpen: (p: Exclude<Panel, null>) => void;
}) {
  const btn =
    "w-11 h-11 grid place-items-center rounded-2xl bg-panel/90 text-textOnDark shadow-card hover:opacity-90";
  return (
    <div className="fixed right-4 top-28 z-40 flex flex-col gap-3">
      <button className={btn} onClick={() => onOpen("layers")} title="Layers">
        ≡
      </button>
      <button className={btn} onClick={() => onOpen("export")} title="Export">
        ⇩
      </button>
      <button className={btn} onClick={() => onOpen("data")} title="Data">
        ≣
      </button>
    </div>
  );
}
