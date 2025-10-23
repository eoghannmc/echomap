export type Operator = "AND" | "OR" | "<" | ">" | "=" | "BETWEEN" | "WITHIN" | "IN";

export interface Distance {
  distance_m?: number;
  distance_km?: number;
}

export type Intent = "address" | "multi" | "places" | "areas" | "data";

export interface Filter {
  field: string;
  op: Operator;
  value?: number | string | [number, number] | string[];
  combine?: "AND" | "OR";
}

export interface QueryObject {
  intent: Intent;
  address?: string;
  anchor?: { type: "place" | "area" | "point"; place_type?: string; area_type?: string; id?: string; name?: string; lon?: number; lat?: number; };
  buffer?: Distance;
  area_type?: "SA2" | "LGA" | "Postcode" | "Suburb";
  area_id?: string;
  area_name?: string;
  dataset?: string;
  time?: string | number | { from?: string | number; to?: string | number };
  filters?: Filter[];
  target?: "Property" | "Parcel" | "Area" | "Point" | string;
  style?: { default?: "choropleth" | "clusters" | "heatmap" | "graduated" | "categorical"; bins?: number; statistic?: "mean" | "median" | "sum" | "count"; };
}
