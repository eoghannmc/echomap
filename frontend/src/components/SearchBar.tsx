"use client";

import { useEffect, useRef, useState } from "react";
import type { SuggestItem } from "../lib/suggest"; // assumes { key?:string; tag:string; label:string; lon?:number; lat?:number }

type Props = {
  onSelectAddress?: (item: SuggestItem) => void;
  onSelectAny?: (item: SuggestItem) => void;
  limit?: number; // UI cap; backend already caps 5
};

export default function SearchBar({ onSelectAddress, onSelectAny, limit = 10 }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SuggestItem[]>([]);
  const ctrlRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const justPickedRef = useRef(false); // prevents immediate reopen on blur/focus race

  const debounced = useDebounced(q, 250);

  useEffect(() => {
    // don’t fetch when input empty
    if (!debounced || debounced.trim().length < 2) {
      ctrlRef.current?.abort();
      setItems([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setLoading(true);

    (async () => {
      try {
        const url = `/api/suggest?q=${encodeURIComponent(debounced)}&limit=6`;
        const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
        if (!res.ok) throw new Error("suggest fetch failed");
        const data = await res.json();
        const list: SuggestItem[] = Array.isArray(data?.suggestions) ? data.suggestions : [];

        // use backend’s capping; additionally cap locally if desired
        setItems(list.slice(0, limit));
        setOpen(list.length > 0);
      } catch (e) {
        if ((e as any)?.name !== "AbortError") {
          // fail quietly; hide dropdown
          setItems([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      ctrl.abort();
    };
  }, [debounced, limit]);

  function pick(it: SuggestItem) {
    // prevent races with blur/focus
    justPickedRef.current = true;

    // Pass up to parent first
    onSelectAny?.(it);
    if (it.tag === "Address") onSelectAddress?.(it);

    // Set input text to selected label (or clear if you prefer)
    setQ(it.label);

    // Hard close dropdown + clear items + abort any inflight
    ctrlRef.current?.abort();
    setItems([]);
    setOpen(false);

    // blur input to close mobile keyboards / focus states
    inputRef.current?.blur();

    // release the guard shortly after
    setTimeout(() => { justPickedRef.current = false; }, 150);
  }

  // Small tag badge
  function TagPill({ tag }: { tag: string }) {
    const base = "inline-flex items-center rounded-full border px-2 text-[11px]";
    let cls = base;
    if (tag === "Street") cls += " bg-gray-100";
    else if (tag === "Address") cls += " bg-blue-50";
    return <span className={cls}>{tag}</span>;
  }

  return (
    <div className="searchbar-wrapper relative">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search: Address, Place, or Dataset"
        className="w-width w-full rounded-xl border px-4 py-3 shadow-sm"
        onFocus={() => {
          if (!justPickedRef.current && items.length) setOpen(true);
        }}
        onBlur={() => {
          // close shortly after to allow click on item
          setTimeout(() => setOpen(false), 120);
        }}
        autoComplete="on"
      />

      {open && (
        <div className="searchbar-dropdown absolute z-50 left-0 right-0 mt-2 max-h-80 overflow-auto bg-white p-1 shadow-md rounded-lg border">
          {loading && <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>}
          {!loading && items.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">No results</div>}
          <ul>
            {items.map((it, i) => (
              <li key={it.key ?? `${it.tag}:${i}:${it.label}`}>
                <button
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 rounded-md"
                  onMouseDown={(e) => e.preventDefault()} // keep focus so click fires before blur
                  onClick={() => pick(it)}
                >
                  <TagPill tag={it.tag} />
                  <span className="truncate">{it.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
