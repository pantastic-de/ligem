/*
  Warnings:

  - You are about to drop the column `addressText` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `attributes` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `residentsCurrent` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `residentsMax` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `residentsMin` on the `Listing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "addressText",
DROP COLUMN "attributes",
DROP COLUMN "residentsCurrent",
DROP COLUMN "residentsMax",
DROP COLUMN "residentsMin",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "costMonthly" INTEGER,
ADD COLUMN     "costOneTime" INTEGER,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "desiredAgeMax" INTEGER,
ADD COLUMN     "desiredAgeMin" INTEGER,
ADD COLUMN     "groupSizeCurrent" INTEGER,
ADD COLUMN     "groupSizePlanned" INTEGER,
ADD COLUMN     "houseNumber" TEXT,
ADD COLUMN     "motto" TEXT,
ADD COLUMN     "regionDescription" TEXT,
ADD COLUMN     "searchPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "searchPeriodStart" TIMESTAMP(3),
ADD COLUMN     "state" TEXT,
ADD COLUMN     "street" TEXT;

-- CreateTable
CREATE TABLE "AttributeGroup" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttributeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeOption" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttributeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingAttributeOption" (
    "listingId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "ListingAttributeOption_pkey" PRIMARY KEY ("listingId","optionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttributeGroup_slug_key" ON "AttributeGroup"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeOption_groupId_slug_key" ON "AttributeOption"("groupId", "slug");

-- AddForeignKey
ALTER TABLE "AttributeOption" ADD CONSTRAINT "AttributeOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AttributeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAttributeOption" ADD CONSTRAINT "ListingAttributeOption_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingAttributeOption" ADD CONSTRAINT "ListingAttributeOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AttributeOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
