-- Spatial (GiST) index for Umkreissuche radius search (ST_DWithin against
-- location::geography in /projekte and /termine, and setListingLocation/
-- setEventLocation's writes) — location is a PostGIS geometry column
-- (Unsupported in Prisma's type system), so this can't be expressed via
-- an @@index in schema.prisma and is added here as raw SQL instead.
-- Without this, every radius search does a sequential scan computing
-- ST_DWithin for every row instead of pruning candidates via the index.
CREATE INDEX "Listing_location_idx" ON "Listing" USING GIST ("location");
CREATE INDEX "Event_location_idx" ON "Event" USING GIST ("location");
