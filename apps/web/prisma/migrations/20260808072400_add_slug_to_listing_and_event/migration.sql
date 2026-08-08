-- AlterTable: nullable for now, backfilled by a follow-up script before the
-- next migration makes the column NOT NULL.
ALTER TABLE "Listing" ADD COLUMN "slug" TEXT;
ALTER TABLE "Event" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
