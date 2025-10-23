-- postgis_compiler.sql (pseudo-templates)
-- These are NOT final SQL; they're string templates your server would fill from QueryObject.

-- 1) Within distance of place type
-- Params: :place_type, :distance_m
-- Example target: Property parcels
WITH anchors AS (
  SELECT geom FROM places WHERE type = :place_type
),
buffered AS (
  SELECT ST_Union(ST_Buffer(geom::geography, :distance_m)::geometry) AS geom FROM anchors
)
SELECT p.*
FROM parcels p
JOIN buffered b ON ST_Intersects(p.geom, b.geom);

-- 2) Areas filtered by attribute (e.g., zoning = 'GRZ')
-- Params: :area_type, :area_name, :field, :value
SELECT a.*
FROM areas a
JOIN area_dictionary d ON a.area_id = d.area_id
WHERE d.area_type = :area_type AND d.name = :area_name
AND a.:field = :value;

-- 3) Data metric with threshold and time
-- Params: :dataset_table, :metric_field, :op, :threshold, :time
SELECT g.geom, m.:metric_field, m.period
FROM :dataset_table m
JOIN geography g ON m.geo_id = g.geo_id
WHERE m.period = :time AND (CASE WHEN :op = '>' THEN m.:metric_field > :threshold
                                WHEN :op = '<' THEN m.:metric_field < :threshold
                                WHEN :op = '=' THEN m.:metric_field = :threshold END);
