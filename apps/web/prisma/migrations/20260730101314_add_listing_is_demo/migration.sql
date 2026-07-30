-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Listing_isDemo_idx" ON "Listing"("isDemo");
