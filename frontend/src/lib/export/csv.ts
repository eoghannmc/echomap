export function exportCSV(fc: GeoJSON.FeatureCollection): Blob {
  const rows = fc.features.map(f => {
    const p = f.properties || {};
    return {
      ID: p.ID ?? "", name: p.name ?? "",
      lon: (f.geometry.type === "Point" ? (f.geometry.coordinates[0] ?? "") : ""),
      lat: (f.geometry.type === "Point" ? (f.geometry.coordinates[1] ?? "") : ""),
      buffer: p.bufferOn ? (p.bufferRadius ?? "") : "",
      ...p
    };
  });
  const headers = Array.from(
    rows.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set<string>())
  );
  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))
  ];
  return new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
}
