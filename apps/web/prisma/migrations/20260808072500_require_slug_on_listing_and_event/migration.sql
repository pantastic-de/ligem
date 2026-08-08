-- AlterTable: tighten to NOT NULL now that every existing row has been
-- backfilled (see scripts/backfill-slugs.ts, run before this migration).
ALTER TABLE "Listing" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Event" ALTER COLUMN "slug" SET NOT NULL;
