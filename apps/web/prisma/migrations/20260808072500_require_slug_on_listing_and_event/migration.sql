-- Backfill any remaining NULL slugs before tightening the column to NOT
-- NULL, so this migration is self-contained and safe to run unattended in
-- any environment (fresh clone, CI, production) instead of depending on a
-- one-off script run by hand beforehand. Approximate umlaut/ß handling via
-- translate() (character-for-character, so ß can only map to a single "s",
-- not "ss") — good enough for this one-time fallback; every row created
-- through the app itself already got a proper slug via src/lib/slug.ts at
-- creation time, this only ever touches pre-existing rows with no slug yet.
-- Re-running this block is safe: it only ever looks at slug IS NULL rows.
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR rec IN SELECT id, "projectName" AS name FROM "Listing" WHERE slug IS NULL LOOP
    base_slug := lower(regexp_replace(
      translate(rec.name, 'äöüÄÖÜß', 'aouAOUs'),
      '[^a-zA-Z0-9]+', '-', 'g'
    ));
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN base_slug := 'projekt'; END IF;
    candidate := base_slug;
    suffix := 2;
    WHILE EXISTS (SELECT 1 FROM "Listing" WHERE slug = candidate) LOOP
      candidate := base_slug || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;
    UPDATE "Listing" SET slug = candidate WHERE id = rec.id;
  END LOOP;

  FOR rec IN SELECT id, title AS name FROM "Event" WHERE slug IS NULL LOOP
    base_slug := lower(regexp_replace(
      translate(rec.name, 'äöüÄÖÜß', 'aouAOUs'),
      '[^a-zA-Z0-9]+', '-', 'g'
    ));
    base_slug := trim(both '-' from base_slug);
    IF base_slug = '' THEN base_slug := 'termin'; END IF;
    candidate := base_slug;
    suffix := 2;
    WHILE EXISTS (SELECT 1 FROM "Event" WHERE slug = candidate) LOOP
      candidate := base_slug || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;
    UPDATE "Event" SET slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;

-- AlterTable: tighten to NOT NULL now that every row has a slug.
ALTER TABLE "Listing" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Event" ALTER COLUMN "slug" SET NOT NULL;
