-- CreateEnum
CREATE TYPE "AttributeTargetType" AS ENUM ('LISTING', 'EVENT');

-- AlterTable
ALTER TABLE "AttributeGroup" ADD COLUMN     "appliesTo" "AttributeTargetType" NOT NULL DEFAULT 'LISTING';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "cost" INTEGER,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "maxParticipants" INTEGER,
ADD COLUMN     "registrationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "thumbnailKey" TEXT;

-- CreateTable
CREATE TABLE "EventAttributeOption" (
    "eventId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "EventAttributeOption_pkey" PRIMARY KEY ("eventId","optionId")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "participantCount" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventAttributeOption" ADD CONSTRAINT "EventAttributeOption_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttributeOption" ADD CONSTRAINT "EventAttributeOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AttributeOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
