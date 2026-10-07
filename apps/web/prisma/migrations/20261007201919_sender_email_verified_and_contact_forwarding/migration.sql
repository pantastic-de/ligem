-- AlterTable
ALTER TABLE "ContactRequest" ADD COLUMN     "senderEmailVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "notifyContactRequestsByEmail" SET DEFAULT true;

-- Contact requests are now forwarded by default. Switch it on for existing
-- accounts too, except those that used "Alle abbestellen" (which turns
-- notifyListingStatusByEmail off as well; its default is on).
UPDATE "User" SET "notifyContactRequestsByEmail" = true WHERE "notifyListingStatusByEmail" = true;
