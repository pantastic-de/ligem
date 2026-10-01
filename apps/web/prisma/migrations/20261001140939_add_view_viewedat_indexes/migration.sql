-- CreateIndex
CREATE INDEX "EventView_viewedAt_idx" ON "EventView"("viewedAt");

-- CreateIndex
CREATE INDEX "EventView_eventId_viewedAt_idx" ON "EventView"("eventId", "viewedAt");

-- CreateIndex
CREATE INDEX "ListingView_viewedAt_idx" ON "ListingView"("viewedAt");

-- CreateIndex
CREATE INDEX "ListingView_listingId_viewedAt_idx" ON "ListingView"("listingId", "viewedAt");

-- CreateIndex
CREATE INDEX "PageView_viewedAt_idx" ON "PageView"("viewedAt");
