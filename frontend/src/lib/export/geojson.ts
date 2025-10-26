export function exportGeoJSON(fc: GeoJSON.FeatureCollection): Blob {
  return new Blob([JSON.stringify(fc)], { type: "application/geo+json" });
}
