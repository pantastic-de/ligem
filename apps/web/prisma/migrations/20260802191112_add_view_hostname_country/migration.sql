-- AlterTable
ALTER TABLE "EventView" ADD COLUMN     "country" TEXT,
ADD COLUMN     "hostname" TEXT;

-- AlterTable
ALTER TABLE "ListingView" ADD COLUMN     "country" TEXT,
ADD COLUMN     "hostname" TEXT;
