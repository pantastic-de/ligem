-- Data repair, no schema change. New events take address and coordinates
-- from their project; while editing a project didn't store its coordinates
-- in the latitude/longitude columns (see 20261008082517), such events were
-- created without any. Give them the project's point, but only when the
-- event sits at the project's own address (same street and postal code).
UPDATE "Event" e
SET latitude = ST_Y(l.location), longitude = ST_X(l.location), location = l.location
FROM "Listing" l
WHERE l.id = e."listingId"
  AND e.latitude IS NULL
  AND e.location IS NULL
  AND l.location IS NOT NULL
  AND (e.street IS NOT NULL OR e."postalCode" IS NOT NULL)
  AND lower(coalesce(e.street, '')) = lower(coalesce(l.street, ''))
  AND coalesce(e."postalCode", '') = coalesce(l."postalCode", '');
