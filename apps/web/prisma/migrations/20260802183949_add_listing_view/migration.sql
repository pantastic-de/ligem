-- CreateEnum
CREATE TYPE "ListingViewType" AS ENUM ('OVERVIEW', 'DETAIL');

-- CreateTable
CREATE TABLE "ListingView" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "viewType" "ListingViewType" NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewerId" TEXT,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "botName" TEXT,
    "referrerHost" TEXT,

    CONSTRAINT "ListingView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingView_listingId_viewType_idx" ON "ListingView"("listingId", "viewType");

-- AddForeignKey
ALTER TABLE "ListingView" ADD CONSTRAINT "ListingView_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingView" ADD CONSTRAINT "ListingView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
