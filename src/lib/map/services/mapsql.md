-- Example for Nairobi bounds (lat/lng), res 7 ~ zoom 10-12
WITH nairobi_centroids AS (
SELECT
geom,
name, -- your props
h3_lat_lng_to_cell(ST_Y(ST_Centroid(geom)), ST_X(ST_Centroid(geom)), 7) AS h3_index
FROM your_h3_table
WHERE ST_Intersects(geom, ST_MakeEnvelope(36.7, -1.5, 37.1, 1.0, 4326)) -- Nairobi bbox
AND h3_indexes @> ARRAY[h3_lat_lng_to_cell(-1.286, 36.817, 7)::bigint] -- Use GIN idx
)
SELECT ST_AsBinary(geom) AS wkb_geom, name, h3_index::bigint
INTO OUTFILE '/data/nairobi_h3.parquet'
FROM nairobi_centroids;
