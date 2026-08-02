-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "viewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyContactRequestsByEmail" BOOLEAN NOT NULL DEFAULT false;
