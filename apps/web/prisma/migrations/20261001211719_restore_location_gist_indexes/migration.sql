-- CreateIndex
CREATE INDEX "Event_location_idx" ON "Event" USING GIST ("location");

-- CreateIndex
CREATE INDEX "Listing_location_idx" ON "Listing" USING GIST ("location");
