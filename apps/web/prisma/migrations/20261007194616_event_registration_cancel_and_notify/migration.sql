-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notifyEventRegistrationsByEmail" BOOLEAN NOT NULL DEFAULT true;
