-- DropIndex
DROP INDEX "Event_location_idx";

-- DropIndex
DROP INDEX "Listing_location_idx";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "recurrenceGroupId" TEXT;

-- CreateIndex
CREATE INDEX "Event_recurrenceGroupId_idx" ON "Event"("recurrenceGroupId");
