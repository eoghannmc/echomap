"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchGenericOnly,
  fetchStreet,
  fetchAddressLocal,
  type SuggestItem,
} from "../lib/suggest";
import { nominatimSearchVic, type NomPlace } from "../lib/geocode";

type Props = {
  onSelectAddress?: (item: SuggestItem) => void;
  onSelectAny?: (item: SuggestItem) => void;
  onDone?: () => void; // informs parent when user clicks Done
  onLoadingChange?: (loading: boolean) => void; // informs parent when suggestions are fetching
  onClose?: () => void;
};

function parseInput(raw: string) {
  const s = (raw || "").trim();
  const m = /^(\d+[a-z0-9/.-]*)\s*([a-z].*)?$/i.exec(s);
  if (m) {
    const house = (m[1] || "").toLowerCase();
    const rest = (m[2] || "").trim();
    const streetFrag = (rest.match(/[a-z][a-z]+/i)?.[0] ?? "").toLowerCase();
    return { house, streetFrag, text: s };
  }
  const letters = (s.match(/[a-z]+/gi)?.join("") ?? "").toLowerCase();
  return { house: "", streetFrag: letters, text: s };
}

function nomToSuggest(p: NomPlace): SuggestItem {
  return {
    tag: "Address",
    key: `nom:${p.display_name}`,
    label: p.display_name,
    lon: Number(p.lon),
    lat: Number(p.lat),
    localityRaw: p.address?.state || p.address?.country || "",
  } as unknown as SuggestItem;
}

export default function SearchBar({
  onSelectAddress,
  onSelectAny,
  onDone,
  onLoadingChange,
  onClose,
}: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasPicked, setHasPicked] = useState(false);

  const [nomItems, setNomItems] = useState<SuggestItem[]>([]);
  const [echoItems, setEchoItems] = useState<SuggestItem[]>([]);

  const ctrlRef = useRef<AbortController | null>(null);
  const debounced = useDebounced(q, 250);
  const suppressRef = useRef(false); // keep dropdown closed after pick until typing

  useEffect(() => {
    const { house, streetFrag } = parseInput(debounced);
    const letters = streetFrag.replace(/[^a-z]/g, "").length;

    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    let alive = true;
    setLoading(true);
    onLoadingChange?.(true);

    (async () => {
      // Nominatim (top)
      let nom: SuggestItem[] = [];
      if (debounced.trim().length >= 2) {
        try {
          const raw = await nominatimSearchVic(debounced, 5);
          nom = raw.map(nomToSuggest);
        } catch {}
      }

      // Echo/internal (hard cap to 1 total)
      let out: SuggestItem[] = [];
      if (debounced.trim().length >= 2) {
        const gen = await fetchGenericOnly(debounced, 1, ctrl.signal).catch(
          () => []
        );
        out = out.concat(gen);
      }
      if (letters >= 2) {
        const streets = await fetchStreet(streetFrag, 1, ctrl.signal).catch(
          () => []
        );
        out = streets.concat(out);
        const strong = streets.find((s) =>
          (s.street_key || "").startsWith(streetFrag)
        );
        if (out.length < 1 && strong) {
          const topLoc = strong.localities?.[0]?.locality_key || "";
          if (house || streets.length <= 1) {
            const addr = await fetchAddressLocal(
              strong.street_key!,
              topLoc || undefined,
              house || undefined,
              1,
              ctrl.signal
            ).catch(() => []);
            if (addr.length) out = addr.concat(streets, out);
          }
        }
      }

      if (!alive) return;
      setNomItems(nom.slice(0, 5));
      setEchoItems(out.slice(0, 1));
      // Open dropdown if we have results and not suppressed
      const hasResults = nom.length + out.length > 0;
      if (hasResults && !suppressRef.current) {
        setOpen(true);
      } else if (!hasResults) {
        setOpen(false);
      }
    })().finally(() => {
      if (alive) {
        setLoading(false);
        onLoadingChange?.(false);
      }
    });

    return () => {
      alive = false;
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  function pick(it: SuggestItem) {
    setQ(it.label);
    setOpen(false);
    setHasPicked(true);
    suppressRef.current = true;

    onSelectAny?.(it);
    if (it.tag === "Address" && onSelectAddress) onSelectAddress(it);
  }

  function handleDone() {
    onDone?.();
  }

  function handleClose() {
    setQ("");
    setOpen(false);
    setHasPicked(false);
    suppressRef.current = false;
    onClose?.();
  }

  return (
    <div className="searchbar-wrapper relative w-full">
      <div className="flex items-stretch gap-1 sm:gap-2">
        <input
          key="search-input"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            suppressRef.current = false;
            if (!e.target.value.trim()) {
              setOpen(false);
              setHasPicked(false);
            }
          }}
          placeholder="Search: Address, Place, or Dataset"
          className="w-full border px-2 py-1 sm:px-3 sm:py-2 shadow-sm text-sm sm:text-md" /* square corners via global override */
          onFocus={() => {
            suppressRef.current = false;
            if (nomItems.length + echoItems.length > 0) {
              setOpen(true);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          autoComplete="off"
          suppressHydrationWarning
        />

        {!hasPicked && onClose && (
          <button
            type="button"
            className="px-2 py-1 sm:px-3 sm:py-2 border bg-white hover:bg-gray-50 text-sm sm:text-base whitespace-nowrap"
            onClick={handleClose}
            title="Close search"
          >
            Close
          </button>
        )}

        {hasPicked && (
          <button
            type="button"
            className="px-2 py-1 sm:px-3 sm:py-2 border bg-white hover:bg-gray-50 text-sm sm:text-base whitespace-nowrap"
            onClick={handleDone}
            title="Close search"
          >
            Done
          </button>
        )}
      </div>

      {open && (
        <div className="searchbar-dropdown absolute z-50 left-0 right-0 mt-2 max-h-[60vh] sm:max-h-96 overflow-auto bg-white p-1 shadow-lg border">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
          )}
          {!loading && nomItems.length === 0 && echoItems.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-500">No results</div>
          )}

          {/* Nominatim */}
          {nomItems.length > 0 && (
            <>
              <div className="px-2 sm:px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-gray-500">
                Places
              </div>
              <ul className="mb-2">
                {nomItems.map((it) => (
                  <li key={it.key}>
                    <button
                      className="w-full px-2 sm:px-3 py-2 text-left hover:bg-gray-50 active:bg-gray-100 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(it)}
                    >
                      <span className="inline-flex items-center border px-1 sm:px-2 text-[10px] sm:text-[11px] whitespace-nowrap">
                        Address
                      </span>
                      <span className="truncate flex-1 text-xs sm:text-sm">{it.label}</span>
                      <span className="locality-pill text-[10px] sm:text-xs hidden sm:inline">
                        {(it as any).localityRaw || "—"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="px-2 sm:px-3 pb-2 text-[9px] sm:text-[10px] text-gray-500">
                Search powered by OpenStreetMap Nominatim
              </div>
            </>
          )}

          {/* Echo (max 1) */}
          {echoItems.length > 0 && (
            <>
              <div className="px-2 sm:px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-gray-500">
                Echo datasets & streets
              </div>
              <ul>
                {echoItems.map((it, i) => (
                  <li key={it.key ?? `${it.tag}-${i}-${it.label}`}>
                    <button
                      className="w-full px-2 sm:px-3 py-2 text-left hover:bg-gray-50 active:bg-gray-100 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(it)}
                    >
                      <span className="inline-flex items-center border px-1 sm:px-2 text-[10px] sm:text-[11px] whitespace-nowrap">
                        {it.tag === "Areas" && (it as any).street_key
                          ? "Street"
                          : it.tag}
                      </span>
                      <span className="truncate flex-1 text-xs sm:text-sm">{it.label}</span>
                      <span className="locality-pill text-[10px] sm:text-xs hidden sm:inline">
                        {(it as any).localityRaw || (it as any).locality || "—"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
