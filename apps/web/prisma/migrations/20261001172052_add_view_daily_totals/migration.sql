-- CreateTable
CREATE TABLE "ListingViewDaily" (
    "day" DATE NOT NULL,
    "listingId" TEXT NOT NULL,
    "viewType" "ListingViewType" NOT NULL,
    "isBot" BOOLEAN NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "ListingViewDaily_pkey" PRIMARY KEY ("day","listingId","viewType","isBot")
);

-- CreateTable
CREATE TABLE "EventViewDaily" (
    "day" DATE NOT NULL,
    "eventId" TEXT NOT NULL,
    "viewType" "EventViewType" NOT NULL,
    "isBot" BOOLEAN NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "EventViewDaily_pkey" PRIMARY KEY ("day","eventId","viewType","isBot")
);

-- CreateTable
CREATE TABLE "PageViewDaily" (
    "day" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "isBot" BOOLEAN NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "PageViewDaily_pkey" PRIMARY KEY ("day","path","isBot")
);

-- CreateIndex
CREATE INDEX "ListingViewDaily_listingId_idx" ON "ListingViewDaily"("listingId");

-- CreateIndex
CREATE INDEX "EventViewDaily_eventId_idx" ON "EventViewDaily"("eventId");

-- AddForeignKey
ALTER TABLE "ListingViewDaily" ADD CONSTRAINT "ListingViewDaily_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventViewDaily" ADD CONSTRAINT "EventViewDaily_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
