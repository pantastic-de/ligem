-- Data repair, no schema change. Editing a project used to write the chosen
-- coordinates only into the PostGIS `location` point, not into the plain
-- latitude/longitude columns the maps read. Copy them over wherever the two
-- disagree, so those projects (and, defensively, events) appear on the map.
UPDATE "Listing"
SET latitude = ST_Y(location), longitude = ST_X(location)
WHERE location IS NOT NULL
  AND (latitude IS DISTINCT FROM ST_Y(location) OR longitude IS DISTINCT FROM ST_X(location));

UPDATE "Event"
SET latitude = ST_Y(location), longitude = ST_X(location)
WHERE location IS NOT NULL
  AND (latitude IS DISTINCT FROM ST_Y(location) OR longitude IS DISTINCT FROM ST_X(location));
