-- CreateIndex
CREATE INDEX "ContactRequest_listingId_idx" ON "ContactRequest"("listingId");

-- CreateIndex
CREATE INDEX "EventAttributeOption_optionId_idx" ON "EventAttributeOption"("optionId");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_idx" ON "EventRegistration"("eventId");

-- CreateIndex
CREATE INDEX "ListingAttributeOption_optionId_idx" ON "ListingAttributeOption"("optionId");

-- CreateIndex
CREATE INDEX "ListingCategoryAssignment_categoryId_idx" ON "ListingCategoryAssignment"("categoryId");

-- CreateIndex
CREATE INDEX "Media_listingId_idx" ON "Media"("listingId");

-- CreateIndex
CREATE INDEX "Media_eventId_idx" ON "Media"("eventId");
