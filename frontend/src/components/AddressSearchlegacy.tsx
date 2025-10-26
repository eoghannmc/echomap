"use client";
import React from "react";

export type SuggestItem = {
  key: string;
  tag: "Address";
  label: string;
  lon: number | null;
  lat: number | null;
};

export default function AddressSearch({
  onPick,
  placeholder = "Search address…",
  limit = 8,
}: {
  onPick?: (s: SuggestItem) => void;
  placeholder?: string;
  limit?: number;
}) {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<SuggestItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  // debounce fetch
  React.useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        // Prefer con figured API base (Render), fallback to same-origin dev proxy
        const base = process.env.NEXT_PUBLIC_API_BASE || "";
        const resp = await fetch(`${base}/api/address`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q, lim: limit }),
        });
        const data = await resp.json();
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, limit]);

  return (
    <div className="address-search">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label="Search address"
      />
      {loading && <div className="muted">Searching…</div>}
      {items.length > 0 && (
        <ul className="suggestions">
          {items.map((it) => (
            <li key={it.key} onClick={() => onPick?.(it)} title={it.label}>
              {it.label}
            </li>
          ))}
        </ul>
      )}
      <style jsx>{`
        .address-search { position: relative; max-width: 520px; }
        input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; }
        .suggestions { position: absolute; z-index: 10; background: #fff; border: 1px solid #eee; border-radius: 8px; margin-top: 6px; padding: 6px; width: 100%; max-height: 280px; overflow: auto; }
        .suggestions li { padding: 8px 10px; cursor: pointer; }
        .suggestions li:hover { background: #f6f6f6; }
        .muted { font-size: 12px; color: #777; margin-top: 6px; }
      `}</style>
    </div>
  );
}
